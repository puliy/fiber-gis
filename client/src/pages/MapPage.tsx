import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import FiberMap, { type MapTool, type LayerVisibility, getTypeLabel } from "@/components/FiberMap";
import MapToolbar from "@/components/MapToolbar";
import LayerPanel from "@/components/LayerPanel";
import ObjectDialog from "@/components/ObjectDialog";
import CreateObjectDialog from "@/components/CreateObjectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown, Menu, LogOut, User, Settings, Map,
  Activity, Shield, Search, X, MousePointer2, GitBranch,
  Network, Cable, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

type CreateData =
  | { kind: "point"; type: string; lat: number; lng: number }
  | { kind: "cable"; route: { lat: number; lng: number }[] }
  | { kind: "building"; polygon: { lat: number; lng: number }[] };

const TOOL_ICONS: Record<string, React.ReactNode> = {
  select:            <MousePointer2 className="w-4 h-4" />,
  add_pole:          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><rect x="7" y="1" width="2" height="14" rx="1"/><rect x="3" y="4" width="10" height="1.5" rx=".75"/><rect x="4" y="7" width="8" height="1.5" rx=".75"/></svg>,
  add_manhole:       <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><rect x="2" y="2" width="12" height="12" rx="2" fillOpacity=".3" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="8" cy="8" r="3"/></svg>,
  add_splice:        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><ellipse cx="8" cy="8" rx="6" ry="3.5"/></svg>,
  add_node_trunk:    <Network className="w-4 h-4" />,
  add_node_district: <GitBranch className="w-4 h-4" />,
  add_cable:         <Cable className="w-4 h-4" />,
  add_building:      <Building2 className="w-4 h-4" />,
};

const TOOL_COLORS: Record<string, string> = {
  select: "#888", add_pole: "#6b8cba", add_manhole: "#8b7355",
  add_splice: "#e8a020", add_node_trunk: "#e05c5c",
  add_node_district: "#4caf8a", add_cable: "#4a9eff", add_building: "#9b7ec8",
};

const TOOL_LABELS: Record<string, string> = {
  select: "Выбор", add_pole: "Опора", add_manhole: "Колодец",
  add_splice: "Муфта", add_node_trunk: "Узел маг.", add_node_district: "Узел рай.",
  add_cable: "Кабель", add_building: "Здание",
};

export default function MapPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const [activeTool, setActiveTool] = useState<MapTool>("select");
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    poles: true, manholes: true, splices: true, nodes: true,
    cables: true, buildings: true, cableDucts: true,
  });
  const [selectedRegionId, setSelectedRegionId] = useState<number>(1);
  const [selectedObject, setSelectedObject] = useState<{ type: "map_point" | "cable"; id: number } | null>(null);
  const [createData, setCreateData] = useState<CreateData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: regions } = trpc.regions.list.useQuery();
  const selectedRegion = regions?.find((r) => r.id === selectedRegionId);

  const { data: searchResults } = trpc.mapPoints.search.useQuery(
    { regionId: selectedRegionId, query: searchQuery },
    { enabled: searchOpen && searchQuery.length >= 2, staleTime: 5000 }
  );

  const canEdit = isAuthenticated && (user?.role === "admin" || user?.role === "user");

  const handleObjectSelect = useCallback((type: string, id: number) => {
    setSelectedObject({ type: type as "map_point" | "cable", id });
  }, []);

  const handleObjectCreate = useCallback((type: string, data: unknown) => {
    if (!isAuthenticated) {
      toast.error("Необходима авторизация для добавления объектов");
      return;
    }
    const d = data as Record<string, unknown>;
    if (type === "cable") {
      setCreateData({ kind: "cable", route: d.route as { lat: number; lng: number }[] });
    } else if (type === "building") {
      setCreateData({ kind: "building", polygon: d.polygon as { lat: number; lng: number }[] });
    } else {
      setCreateData({ kind: "point", type, lat: d.lat as number, lng: d.lng as number });
    }
    setActiveTool("select");
  }, [isAuthenticated]);

  const handleLayerChange = useCallback((key: keyof LayerVisibility, value: boolean) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        if (searchOpen) { setSearchOpen(false); setSearchQuery(""); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

  // Close search on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const region = selectedRegion ?? { centerLat: "51.6720", centerLng: "39.2120", defaultZoom: 13 };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* ─── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 px-3 py-1.5 bg-card border-b border-border flex-shrink-0 z-[500]">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1 flex-shrink-0">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <Map className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm hidden sm:block">FiberGIS</span>
        </div>

        <Separator orientation="vertical" className="h-5 hidden sm:block" />

        {/* Region selector */}
        <Select value={String(selectedRegionId)} onValueChange={(v) => setSelectedRegionId(Number(v))}>
          <SelectTrigger className="h-7 text-xs bg-input border-border w-[140px] sm:w-[180px]">
            <SelectValue placeholder="Регион" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {regions?.map((r) => (
              <SelectItem key={r.id} value={String(r.id)} className="text-xs">{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Search — inline dropdown */}
        <div ref={searchContainerRef} className="relative hidden sm:block">
          {!searchOpen ? (
            <Button
              variant="ghost" size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:block">Поиск</span>
              <kbd className="hidden lg:block text-[9px] bg-muted px-1 rounded">Ctrl+F</kbd>
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск объектов..."
                  className="h-7 text-xs bg-input pl-7 pr-6 w-56"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Search results dropdown */}
          {searchOpen && searchQuery.length >= 2 && (
            <div className="absolute right-0 top-8 w-72 bg-card border border-border rounded-md shadow-lg z-[600]">
              <ScrollArea className="max-h-56">
                {!searchResults || searchResults.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">Объекты не найдены</div>
                ) : (
                  <div className="p-1 space-y-0.5">
                    {searchResults.map((obj: { id: number; name: string | null; type: string }) => (
                      <button
                        key={obj.id}
                        onClick={() => {
                          handleObjectSelect("map_point", obj.id);
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-xs flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{obj.name ?? getTypeLabel(obj.type)}</div>
                          <div className="text-muted-foreground">{getTypeLabel(obj.type)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
          {searchOpen && searchQuery.length > 0 && searchQuery.length < 2 && (
            <div className="absolute right-0 top-8 w-56 bg-card border border-border rounded-md shadow-lg z-[600] p-2">
              <div className="text-xs text-muted-foreground text-center py-1">Введите минимум 2 символа</div>
            </div>
          )}
        </div>

        {/* Status badge */}
        <Badge variant="outline" className="text-[10px] border-green-600 text-green-500 px-1.5 py-0 hidden md:flex gap-1">
          <Activity className="w-2.5 h-2.5" /> Online
        </Badge>

        {/* User menu */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:block max-w-[80px] truncate">{user?.name ?? "Польз."}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border w-48">
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                {user?.email ?? user?.name}
                <Badge
                  variant="outline"
                  className="ml-2 text-[9px] px-1 py-0"
                  style={{
                    borderColor: user?.role === "admin" ? "#e05c5c" : "#4a9eff",
                    color: user?.role === "admin" ? "#e05c5c" : "#4a9eff",
                  }}
                >
                  {user?.role === "admin" ? "Администратор" : "Пользователь"}
                </Badge>
              </div>
              {user?.role === "admin" && (
                <DropdownMenuItem onClick={() => navigate("/admin")} className="text-xs gap-2">
                  <Shield className="w-3.5 h-3.5" /> Администрирование
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate("/templates")} className="text-xs gap-2">
                <Settings className="w-3.5 h-3.5" /> Шаблоны кабелей
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/trace")} className="text-xs gap-2">
                <GitBranch className="w-3.5 h-3.5" /> Трассировка волокна
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-xs gap-2 text-destructive">
                <LogOut className="w-3.5 h-3.5" /> Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" className="h-7 text-xs" onClick={() => window.location.href = getLoginUrl()}>
            Войти
          </Button>
        )}

        {/* Mobile sidebar toggle */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 md:hidden">
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-card border-border p-3">
            <SheetHeader className="mb-3">
              <SheetTitle className="text-sm">Управление картой</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              {/* Mobile search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск объектов..."
                  className="h-8 text-sm bg-input pl-7"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Инструменты</div>
                <div className="grid grid-cols-4 gap-1">
                  {(Object.keys(TOOL_ICONS) as MapTool[]).map((tool) => {
                    const isActive = activeTool === tool;
                    const isDisabled = !canEdit && tool !== "select";
                    return (
                      <button
                        key={tool}
                        onClick={() => { if (!isDisabled) { setActiveTool(tool); setSidebarOpen(false); } }}
                        disabled={isDisabled}
                        title={TOOL_LABELS[tool]}
                        className={`h-10 rounded flex items-center justify-center border transition-colors ${
                          isActive ? "border-primary" : "border-border hover:bg-accent"
                        } ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
                        style={{
                          backgroundColor: isActive ? TOOL_COLORS[tool] + "33" : undefined,
                          color: isActive ? TOOL_COLORS[tool] : undefined,
                        }}
                      >
                        {TOOL_ICONS[tool]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />
              <LayerPanel visibility={layerVisibility} onChange={handleLayerChange} />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — tools (desktop) */}
        <div className="hidden sm:flex flex-col items-center p-1.5 bg-card border-r border-border flex-shrink-0 z-10 overflow-y-auto">
          <MapToolbar activeTool={activeTool} onToolChange={setActiveTool} canEdit={canEdit} />
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <FiberMap
            regionId={selectedRegionId}
            centerLat={Number(region.centerLat)}
            centerLng={Number(region.centerLng)}
            defaultZoom={region.defaultZoom ?? 13}
            activeTool={activeTool}
            layerVisibility={layerVisibility}
            onObjectSelect={handleObjectSelect}
            onObjectCreate={handleObjectCreate}
            refreshTrigger={refreshTrigger}
          />

          {/* Active tool hint */}
          {activeTool !== "select" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur border border-border rounded-full px-4 py-1.5 text-xs shadow-lg z-[400] pointer-events-none flex items-center gap-2">
              <span style={{ color: TOOL_COLORS[activeTool] }}>{TOOL_ICONS[activeTool]}</span>
              <span className="font-medium">{TOOL_LABELS[activeTool]}</span>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-muted-foreground">
                {activeTool === "add_cable" || activeTool === "add_building"
                  ? "Кликайте · 2× клик — завершить · Esc — отмена"
                  : "Кликните на карту · Esc — отмена"
                }
              </span>
            </div>
          )}
        </div>

        {/* Right sidebar — layers (desktop) */}
        <div className="hidden lg:flex flex-col p-2 bg-card border-l border-border flex-shrink-0 w-48 z-10">
          <LayerPanel visibility={layerVisibility} onChange={handleLayerChange} />
        </div>
      </div>

      {/* ─── Dialogs ──────────────────────────────────────────────────────────── */}
      <ObjectDialog
        objectType={selectedObject?.type ?? null}
        objectId={selectedObject?.id ?? null}
        onClose={() => setSelectedObject(null)}
        onDeleted={handleRefresh}
        onUpdated={handleRefresh}
        canEdit={canEdit}
      />

      <CreateObjectDialog
        data={createData as any}
        regionId={selectedRegionId}
        onClose={() => setCreateData(null)}
        onCreated={handleRefresh}
      />
    </div>
  );
}
