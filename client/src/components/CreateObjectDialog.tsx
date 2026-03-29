import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTypeLabel } from "./FiberMap";
import { MapPin, Cable, Building2, Pipette } from "lucide-react";

type PointType = "pole" | "manhole" | "splice" | "mast" | "entry_point" | "node_district" | "node_trunk" | "flag" | "camera" | "other";
type CableLayingType = "aerial" | "underground" | "duct" | "building";

interface CreatePointData  { kind: "point";    type: PointType; lat: number; lng: number; }
interface CreateCableData  { kind: "cable";    route: { lat: number; lng: number }[]; }
interface CreateBuildingData { kind: "building"; polygon: { lat: number; lng: number }[]; }
interface CreateDuctData    { kind: "duct";     route: { lat: number; lng: number }[]; }
type CreateData = CreatePointData | CreateCableData | CreateBuildingData | CreateDuctData;

interface Props {
  data: CreateData | null;
  regionId: number;
  onClose: () => void;
  onCreated: () => void;
}

// Approximate distance of a route in meters
function calcRouteLength(route: { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const dLat = (route[i].lat - route[i - 1].lat) * 111320;
    const dLng = (route[i].lng - route[i - 1].lng) * 111320 * Math.cos((route[i].lat * Math.PI) / 180);
    total += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  return Math.round(total);
}

export default function CreateObjectDialog({ data, regionId, onClose, onCreated }: Props) {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress]         = useState("");
  const [status, setStatus]           = useState<"fact" | "plan">("fact");
  const [layingType, setLayingType]   = useState<CableLayingType>("aerial");
  const [templateId, setTemplateId]   = useState<number | undefined>(undefined);
  const [isPublic, setIsPublic]       = useState(false);
  const [pointType, setPointType]     = useState<PointType>(
    data?.kind === "point" ? data.type : "pole"
  );

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (data) {
      setName(""); setDescription(""); setAddress("");
      setStatus("fact"); setLayingType("aerial");
      setTemplateId(undefined); setIsPublic(false);
      if (data.kind === "point") setPointType(data.type);
    }
  }, [data?.kind, (data as CreatePointData)?.lat]);

  const [ductChannels, setDuctChannels] = useState(1);

  const { data: templates } = trpc.cables.templates.useQuery(undefined, {
    enabled: data?.kind === "cable",
  });

  const createPoint = trpc.mapPoints.create.useMutation({
    onSuccess: () => { toast.success("Объект создан"); onCreated(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const createCable = trpc.cables.create.useMutation({
    onSuccess: () => { toast.success("Кабель добавлен"); onCreated(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const snapToPoint = trpc.mapPoints.snapNearest.useQuery(
    {
      regionId,
      startLat: data?.kind === "cable" ? data.route[0]?.lat ?? 0 : 0,
      startLng: data?.kind === "cable" ? data.route[0]?.lng ?? 0 : 0,
      endLat: data?.kind === "cable" ? data.route[data.route.length - 1]?.lat ?? 0 : 0,
      endLng: data?.kind === "cable" ? data.route[data.route.length - 1]?.lng ?? 0 : 0,
      radiusMeters: 50,
    },
    { enabled: data?.kind === "cable" && data.route.length >= 2 }
  );

  const createDuct = trpc.cableDucts.upsert.useMutation({
    onSuccess: () => { toast.success("Канализация добавлена"); onCreated(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const createBuilding = trpc.buildings.create.useMutation({
    onSuccess: () => { toast.success("Здание добавлено"); onCreated(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!data) return;

    if (data.kind === "point") {
      createPoint.mutate({
        regionId, lat: data.lat, lng: data.lng,
        type: pointType,
        name: name || undefined,
        description: description || undefined,
        address: address || undefined,
        status, isPublic,
      });
    } else if (data.kind === "cable") {
      createCable.mutate({
        regionId,
        name: name || undefined,
        description: description || undefined,
        route: data.route,
        status, layingType,
        templateId,
        startPointId: snapToPoint.data?.startPointId ?? undefined,
        endPointId: snapToPoint.data?.endPointId ?? undefined,
      });
    } else if (data.kind === "building") {
      createBuilding.mutate({
        regionId,
        name: name || undefined,
        description: description || undefined,
        polygon: data.polygon,
      });
    } else if (data.kind === "duct") {
      createDuct.mutate({
        regionId,
        name: name || undefined,
        description: description || undefined,
        route: data.route,
        capacity: ductChannels,
      });
    }
  };

  const isLoading = createPoint.isPending || createCable.isPending || createDuct.isPending || createBuilding.isPending;
  const routeLen  = (data?.kind === "cable" || data?.kind === "duct") ? calcRouteLength((data as any).route ?? []) : 0;

  const titleIcon =
    data?.kind === "cable"    ? <Cable    className="w-4 h-4 text-blue-400" /> :
    data?.kind === "building" ? <Building2 className="w-4 h-4 text-purple-400" /> :
    data?.kind === "duct"     ? <Pipette  className="w-4 h-4 text-green-300" /> :
                                <MapPin   className="w-4 h-4 text-green-400" />;

  const titleText =
    data?.kind === "cable"    ? "Новый кабель" :
    data?.kind === "building" ? "Новое здание"  :
    data?.kind === "duct"     ? "Новая канализация" :
                                "Новый объект";

  return (
    <Dialog open={data !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {titleIcon} {titleText}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Point type selector */}
          {data?.kind === "point" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Тип объекта</Label>
              <Select value={pointType} onValueChange={(v) => setPointType(v as PointType)}>
                <SelectTrigger className="h-8 text-sm bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {(["pole","manhole","splice","mast","entry_point","node_district","node_trunk","flag","camera","other"] as PointType[]).map((t) => (
                    <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Необязательно"
              className="h-8 text-sm bg-input"
              autoFocus
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Статус</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "fact" | "plan")}>
              <SelectTrigger className="h-8 text-sm bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="fact">Факт (существующий)</SelectItem>
                <SelectItem value="plan">План (проектируемый)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duct-specific fields */}
          {data?.kind === "duct" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Количество каналов</Label>
                <Input
                  type="number" min={1} max={96}
                  value={ductChannels}
                  onChange={(e) => setDuctChannels(Number(e.target.value) || 1)}
                  className="h-8 text-sm bg-input w-24"
                />
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 flex items-center justify-between">
                <span>Точек маршрута: <strong>{(data as any).route?.length ?? 0}</strong></span>
                <Badge variant="outline" className="text-[10px] px-1.5">~{routeLen} м</Badge>
              </div>
            </>
          )}

          {/* Cable-specific fields */}
          {data?.kind === "cable" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Тип прокладки</Label>
                <Select value={layingType} onValueChange={(v) => setLayingType(v as CableLayingType)}>
                  <SelectTrigger className="h-8 text-sm bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="aerial">Воздушный (на опорах)</SelectItem>
                    <SelectItem value="underground">Подземный (прямая закопка)</SelectItem>
                    <SelectItem value="duct">В кабельной канализации</SelectItem>
                    <SelectItem value="building">Внутри здания</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {templates && templates.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Тип кабеля (шаблон)</Label>
                  <Select
                    value={templateId ? String(templateId) : "none"}
                    onValueChange={(v) => setTemplateId(v === "none" ? undefined : Number(v))}
                  >
                    <SelectTrigger className="h-8 text-sm bg-input">
                      <SelectValue placeholder="Не выбран" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">— Не выбран —</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                          {t.fiberCount && (
                            <span className="text-muted-foreground ml-1">({t.fiberCount}В)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 flex items-center justify-between">
                <span>Точек маршрута: <strong>{(data as any).route?.length ?? 0}</strong></span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  ~{routeLen} м
                </Badge>
              </div>
            </>
          )}

          {/* Building-specific fields */}
          {data?.kind === "building" && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 flex items-center justify-between">
              <span>Вершин полигона: <strong>{(data as any).polygon?.length ?? 0}</strong></span>
            </div>
          )}

          {/* Point-specific fields */}
          {data?.kind === "point" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Адрес</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Необязательно"
                  className="h-8 text-sm bg-input"
                />
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 font-mono">
                {data.lat.toFixed(6)}, {data.lng.toFixed(6)}
              </div>
            </>
          )}

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Примечание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
              className="text-sm bg-input resize-none"
              rows={2}
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Показывать на публичной карте</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? "Создание..." : "Создать"}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
