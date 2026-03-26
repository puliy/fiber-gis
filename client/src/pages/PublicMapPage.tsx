import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap, useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Map, AlertTriangle, Layers, ChevronDown, ChevronUp,
  ExternalLink, Info, Search, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  pole: "Опора", manhole: "Колодец", splice: "Муфта", mast: "Мачта",
  entry_point: "Ввод", node_district: "Узел рай.", node_trunk: "Узел маг.",
  flag: "Флаг", camera: "Камера", other: "Прочее",
};

const TYPE_COLORS: Record<string, string> = {
  pole: "#6b8cba", manhole: "#8b7355", splice: "#e8a020",
  mast: "#9b7ec8", entry_point: "#4caf8a", node_district: "#4caf8a",
  node_trunk: "#e05c5c", flag: "#f06292", camera: "#26c6da", other: "#90a4ae",
};

const STATUS_COLORS: Record<string, string> = {
  fact: "#4caf8a", plan: "#4a9eff", dismantled: "#666",
};

const LAYING_LABELS: Record<string, string> = {
  aerial: "Воздушная", underground: "Подземная", duct: "В канализации", building: "Здание",
};

interface LayerState {
  poles: boolean;
  manholes: boolean;
  splices: boolean;
  nodes: boolean;
  cables: boolean;
}

// ─── Map Data Loader ──────────────────────────────────────────────────────────

function MapDataLoader({
  token,
  regionId,
  onLoad,
}: {
  token: string;
  regionId: number;
  onLoad: (data: { points: any[]; cables: any[] }) => void;
}) {
  const map = useMap();
  const utils = trpc.useUtils();

  const load = useCallback(async () => {
    const bounds = map.getBounds();
    try {
      const data = await utils.publicMap.mapData.fetch({
        token,
        regionId,
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast(),
      });
      onLoad(data);
    } catch {}
  }, [map, token, regionId, utils, onLoad]);

  useEffect(() => {
    load();
  }, [load]);

  useMapEvents({ moveend: load });

  return null;
}

// ─── Map Center Setter ────────────────────────────────────────────────────────

function MapCenterSetter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [map, lat, lng, zoom]);
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PublicMapPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [mapData, setMapData] = useState<{ points: any[]; cables: any[] }>({ points: [], cables: [] });
  const [layers, setLayers] = useState<LayerState>({
    poles: true, manholes: true, splices: true, nodes: true, cables: true,
  });
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: tokenData, isLoading, error } = trpc.publicMap.validate.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const handleMapLoad = useCallback((data: { points: any[]; cables: any[] }) => {
    setMapData(data);
  }, []);

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto">
            <Map className="w-6 h-6 text-white animate-pulse" />
          </div>
          <p className="text-sm text-gray-400">Загрузка карты...</p>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold">Доступ запрещён</h2>
          <p className="text-sm text-gray-400">
            Токен недействителен или истёк срок его действия. Обратитесь к администратору системы.
          </p>
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
            <ExternalLink className="w-3.5 h-3.5" /> Перейти в FiberGIS
          </a>
        </div>
      </div>
    );
  }

  // ─── Map center ─────────────────────────────────────────────────────────────

  const regionData = (mapData as any).region;
  const centerLat = regionData ? Number(regionData.centerLat) : 51.672;
  const centerLng = regionData ? Number(regionData.centerLng) : 39.212;
  const defaultZoom = regionData?.defaultZoom ?? 13;

  // ─── Filtered data ──────────────────────────────────────────────────────────

  const filteredPoints = mapData.points.filter((pt) => {
    const t = pt.type;
    if (!layers.poles && (t === "pole" || t === "mast")) return false;
    if (!layers.manholes && t === "manhole") return false;
    if (!layers.splices && t === "splice") return false;
    if (!layers.nodes && (t === "node_district" || t === "node_trunk" || t === "entry_point")) return false;
    return true;
  });

  const filteredCables = layers.cables ? mapData.cables : [];

  // Search filter
  const searchedPoints = searchQuery.length >= 2
    ? filteredPoints.filter((pt) =>
        (pt.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pt.address ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        TYPE_LABELS[pt.type]?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredPoints;

  // Stats
  const stats = {
    total: mapData.points.length,
    cables: mapData.cables.length,
    byType: mapData.points.reduce((acc: Record<string, number>, pt) => {
      acc[pt.type] = (acc[pt.type] ?? 0) + 1;
      return acc;
    }, {}),
  };

  const toggleLayer = (key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2.5 px-3 py-2 bg-gray-900 border-b border-gray-800 z-[500] flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Map className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm">FiberGIS</span>
        <span className="text-gray-500 text-xs">·</span>
        <span className="text-gray-300 text-xs font-medium">
          {tokenData.name ?? "Публичная карта"}
        </span>
        {regionData && (
          <>
            <span className="text-gray-500 text-xs">·</span>
            <span className="text-gray-400 text-xs">{regionData.name}</span>
          </>
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          {!searchOpen ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск объектов..."
                  className="h-7 text-xs bg-gray-800 border-gray-700 text-white pl-6 pr-6 w-48"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <a
          href="/"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden sm:block">Войти в систему</span>
        </a>
      </header>

      {/* ─── Map area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={defaultZoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <MapDataLoader token={token} regionId={tokenData.regionId ?? 1} onLoad={handleMapLoad} />

          {regionData && (
            <MapCenterSetter lat={centerLat} lng={centerLng} zoom={defaultZoom} />
          )}

          {/* Points */}
          {searchedPoints.map((pt) => {
            const color = TYPE_COLORS[pt.type] ?? "#90a4ae";
            const statusColor = STATUS_COLORS[pt.status] ?? "#90a4ae";
            return (
              <CircleMarker
                key={pt.id}
                center={[Number(pt.lat), Number(pt.lng)]}
                radius={pt.type === "node_trunk" ? 8 : pt.type === "node_district" ? 7 : 5}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: 2,
                }}
              >
                <Popup className="fiber-popup">
                  <div className="text-xs min-w-[160px]">
                    <div className="font-semibold text-sm mb-1">
                      {pt.name ?? TYPE_LABELS[pt.type] ?? pt.type}
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-gray-500">{TYPE_LABELS[pt.type] ?? pt.type}</span>
                    </div>
                    {pt.address && (
                      <div className="text-gray-500 text-xs">{pt.address}</div>
                    )}
                    {pt.description && (
                      <div className="text-gray-400 text-xs mt-1">{pt.description}</div>
                    )}
                    <div className="mt-1.5 flex items-center gap-1">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      <span className="text-gray-500 text-[10px]">
                        {pt.status === "fact" ? "Факт" : pt.status === "plan" ? "Проект" : "Демонтировано"}
                      </span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Cables */}
          {filteredCables.map((cable) => {
            const positions = (cable.route as { lat: number; lng: number }[]).map(
              (p) => [p.lat, p.lng] as [number, number]
            );
            const color = cable.status === "dismantled" ? "#555" :
              cable.layingType === "aerial" ? "#4a9eff" :
              cable.layingType === "underground" ? "#ff7043" :
              cable.layingType === "duct" ? "#26c6da" : "#ab47bc";
            return (
              <Polyline
                key={cable.id}
                positions={positions}
                pathOptions={{ color, weight: 3, opacity: 0.85 }}
              >
                <Popup>
                  <div className="text-xs min-w-[160px]">
                    <div className="font-semibold text-sm mb-1">{cable.name ?? "Кабель"}</div>
                    {cable.layingType && (
                      <div className="text-gray-500">{LAYING_LABELS[cable.layingType] ?? cable.layingType}</div>
                    )}
                    {cable.lengthCalc && (
                      <div className="text-gray-400 text-xs mt-1">
                        Длина: {Math.round(Number(cable.lengthCalc))} м
                      </div>
                    )}
                    {cable.description && (
                      <div className="text-gray-400 text-xs mt-1">{cable.description}</div>
                    )}
                  </div>
                </Popup>
              </Polyline>
            );
          })}
        </MapContainer>

        {/* ─── Layer panel ─────────────────────────────────────────────────── */}
        <div className="absolute top-3 right-3 z-[400] space-y-2">
          {/* Layers button */}
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => setLayerPanelOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-800 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-200">Слои</span>
              {layerPanelOpen ? (
                <ChevronUp className="w-3 h-3 text-gray-500 ml-auto" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-500 ml-auto" />
              )}
            </button>
            {layerPanelOpen && (
              <div className="border-t border-gray-700 p-2 space-y-1 min-w-[160px]">
                {([
                  ["poles", "Опоры", TYPE_COLORS.pole],
                  ["manholes", "Колодцы", TYPE_COLORS.manhole],
                  ["splices", "Муфты", TYPE_COLORS.splice],
                  ["nodes", "Узлы", TYPE_COLORS.node_trunk],
                  ["cables", "Кабели", "#4a9eff"],
                ] as [keyof LayerState, string, string][]).map(([key, label, color]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <div
                      className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${
                        layers[key] ? "border-transparent" : "border-gray-600 bg-transparent"
                      }`}
                      style={{ backgroundColor: layers[key] ? color : undefined }}
                      onClick={() => toggleLayer(key)}
                    >
                      {layers[key] && (
                        <svg viewBox="0 0 8 8" className="w-2 h-2 text-white" fill="currentColor">
                          <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-xs text-gray-300 group-hover:text-white transition-colors"
                      onClick={() => toggleLayer(key)}
                    >
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Info panel ──────────────────────────────────────────────────── */}
        <div className="absolute bottom-6 left-3 z-[400]">
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-w-[220px]">
            <button
              onClick={() => setInfoPanelOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-800 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-200">Статистика</span>
              {infoPanelOpen ? (
                <ChevronDown className="w-3 h-3 text-gray-500 ml-auto" />
              ) : (
                <ChevronUp className="w-3 h-3 text-gray-500 ml-auto" />
              )}
            </button>
            {infoPanelOpen && (
              <div className="border-t border-gray-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Объектов</span>
                  <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-300 px-1.5 py-0">
                    {stats.total}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Кабелей</span>
                  <Badge variant="outline" className="text-[10px] border-blue-600/50 text-blue-400 px-1.5 py-0">
                    {stats.cables}
                  </Badge>
                </div>
                {Object.entries(stats.byType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: TYPE_COLORS[type] ?? "#90a4ae" }}
                        />
                        <span className="text-xs text-gray-400">{TYPE_LABELS[type] ?? type}</span>
                      </div>
                      <span className="text-xs text-gray-300 font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Legend ──────────────────────────────────────────────────────── */}
        <div className="absolute bottom-6 right-3 z-[400]">
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg shadow-xl p-2.5 space-y-1.5">
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Легенда</div>
            {[
              { color: "#4a9eff", label: "Воздушный кабель" },
              { color: "#ff7043", label: "Подземный кабель" },
              { color: "#26c6da", label: "Кабель в канализации" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-5 h-0.5 rounded" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
            <div className="border-t border-gray-700 my-1" />
            {[
              { color: TYPE_COLORS.pole, label: "Опора" },
              { color: TYPE_COLORS.manhole, label: "Колодец" },
              { color: TYPE_COLORS.splice, label: "Муфта" },
              { color: TYPE_COLORS.node_trunk, label: "Узел" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
