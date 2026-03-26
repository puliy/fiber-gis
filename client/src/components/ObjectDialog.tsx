import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, History, MapPin, Cable, X, FileText, Network, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getTypeLabel, getStatusLabel, getLayingLabel } from "./FiberMap";

// Кнопка открытия оптического кросса — если кросс есть, открывает его; если нет — показывает диалог создания
function OpticalCrossButton({ mapPointId, onClose, navigate }: { mapPointId: number | null; onClose: () => void; navigate: (path: string) => void }) {
  const { data: crosses = [], isLoading } = trpc.opticalCross.byMapPoint.useQuery(
    { mapPointId: mapPointId! },
    { enabled: !!mapPointId }
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [crossForm, setCrossForm] = useState<{ name: string; portCount: string; crossType: "ODF" | "ШКОС" | "МОКС" | "other" }>({ name: "", portCount: "24", crossType: "ODF" });

  const upsert = trpc.opticalCross.upsert.useMutation({
    onSuccess: (id) => {
      setShowCreateDialog(false);
      onClose();
      navigate(`/cross/${id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return null;

  if (crosses.length > 0) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/10"
        onClick={() => { onClose(); navigate(`/cross/${crosses[0].id}`); }}
      >
        <Network className="w-3 h-3 mr-1" /> Открыть кросс
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-cyan-600/50 text-cyan-500/70 hover:bg-cyan-600/10"
        onClick={() => {
          if (!mapPointId) return;
          setCrossForm({ name: `ОКС-${mapPointId}`, portCount: "24", crossType: "ODF" });
          setShowCreateDialog(true);
        }}
      >
        <Plus className="w-3 h-3 mr-1" /> Создать кросс
      </Button>

      {/* Диалог создания кросса */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Создать оптический кросс</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Название</Label>
              <Input
                value={crossForm.name}
                onChange={e => setCrossForm(f => ({ ...f, name: e.target.value }))}
                placeholder="например ОКС-1"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Тип кросса</Label>
              <Select value={crossForm.crossType} onValueChange={v => setCrossForm(f => ({ ...f, crossType: v as "ODF" | "ШКОС" | "МОКС" | "other" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ODF">ОПЦ (ODF)</SelectItem>
                  <SelectItem value="ШКОС">ШКОС (шкаф кроссовой оптический)</SelectItem>
                  <SelectItem value="МОКС">МОКС (мини-ОКС)</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Количество портов</Label>
              <Select value={crossForm.portCount} onValueChange={v => setCrossForm(f => ({ ...f, portCount: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[8, 12, 16, 24, 32, 48, 64, 96, 128].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} портов</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>Отмена</Button>
            <Button
              size="sm"
              disabled={upsert.isPending || !crossForm.name.trim()}
              onClick={() => {
                if (!mapPointId) return;
                upsert.mutate({
                  mapPointId,
                  name: crossForm.name.trim(),
                  portCount: parseInt(crossForm.portCount),
                  crossType: crossForm.crossType,
                });
              }}
            >
              {upsert.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ObjectDialogProps {
  objectType: "map_point" | "cable" | null;
  objectId: number | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
  canEdit: boolean;
}

export default function ObjectDialog({ objectType, objectId, onClose, onDeleted, onUpdated, canEdit }: ObjectDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [, navigate] = useLocation();

  const isOpen = objectType !== null && objectId !== null;

  const { data: pointData, refetch: refetchPoint } = trpc.mapPoints.byId.useQuery(
    { id: objectId! },
    { enabled: isOpen && objectType === "map_point" }
  );

  const { data: cableData, refetch: refetchCable } = trpc.cables.byId.useQuery(
    { id: objectId! },
    { enabled: isOpen && objectType === "cable" }
  );

  const { data: auditData } = trpc.audit.forObject.useQuery(
    { tableName: objectType === "map_point" ? "map_points" : "cables", objectId: objectId! },
    { enabled: isOpen }
  );

  const updatePoint = trpc.mapPoints.update.useMutation({
    onSuccess: () => { toast.success("Объект обновлён"); setIsEditing(false); refetchPoint(); onUpdated(); },
    onError: (e) => toast.error(e.message),
  });

  const deletePoint = trpc.mapPoints.delete.useMutation({
    onSuccess: () => { toast.success("Объект удалён"); onDeleted(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const updateCable = trpc.cables.update.useMutation({
    onSuccess: () => { toast.success("Кабель обновлён"); setIsEditing(false); refetchCable(); onUpdated(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCable = trpc.cables.delete.useMutation({
    onSuccess: () => { toast.success("Кабель удалён"); onDeleted(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const currentData = objectType === "map_point" ? pointData : cableData;

  useEffect(() => {
    if (currentData && !isEditing) {
      setEditData(currentData as Record<string, unknown>);
    }
  }, [currentData]);

  useEffect(() => {
    if (!isOpen) setIsEditing(false);
  }, [isOpen]);

  const handleSave = () => {
    if (!objectId) return;
    if (objectType === "map_point") {
      updatePoint.mutate({
        id: objectId,
        name: editData.name as string,
        description: editData.description as string,
        address: editData.address as string,
        status: editData.status as any,
        type: editData.type as any,
      });
    } else {
      updateCable.mutate({
        id: objectId,
        name: editData.name as string,
        description: editData.description as string,
        status: editData.status as any,
        layingType: editData.layingType as any,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border text-foreground p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {objectType === "map_point"
              ? <MapPin className="w-4 h-4 text-primary" />
              : <Cable className="w-4 h-4 text-blue-400" />
            }
            <DialogTitle className="text-base">
              {objectType === "map_point"
                ? (pointData ? `${getTypeLabel(pointData.type)} #${pointData.id}` : "Загрузка...")
                : (cableData ? `Кабель #${cableData.id}` : "Загрузка...")
              }
            </DialogTitle>
            {currentData && (
              <Badge
                variant="outline"
                className="ml-auto text-xs"
                style={{
                  borderColor: currentData.status === "fact" ? "#4caf8a" : currentData.status === "plan" ? "#e8a020" : "#888",
                  color: currentData.status === "fact" ? "#4caf8a" : currentData.status === "plan" ? "#e8a020" : "#888",
                }}
              >
                {getStatusLabel(String(currentData.status))}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-9 px-4">
            <TabsTrigger value="info" className="text-xs">Атрибуты</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">История ({auditData?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="m-0">
            <ScrollArea className="max-h-[60vh]">
              <div className="px-4 py-3 space-y-3">
                {!currentData ? (
                  <div className="text-sm text-muted-foreground text-center py-4">Загрузка...</div>
                ) : isEditing ? (
                  <EditForm
                    objectType={objectType}
                    data={editData}
                    onChange={(key, val) => setEditData((prev) => ({ ...prev, [key]: val }))}
                  />
                ) : (
                  <ViewInfo objectType={objectType} data={currentData as any} />
                )}
              </div>
            </ScrollArea>

            {canEdit && (
              <div className="flex gap-2 px-4 py-3 border-t border-border">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={updatePoint.isPending || updateCable.isPending}>
                      Сохранить
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      Отмена
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Pencil className="w-3 h-3 mr-1" /> Изменить
                    </Button>
                    {objectType === "map_point" && pointData?.type === "splice" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-600 text-amber-500 hover:bg-amber-600/10"
                        onClick={() => { onClose(); navigate(`/splice/${objectId}`); }}
                      >
                        <FileText className="w-3 h-3 mr-1" /> Паспорт муфты
                      </Button>
                    )}
                    {objectType === "map_point" && ["node_district", "node_trunk", "building"].includes(pointData?.type ?? "") && (
                      <OpticalCrossButton mapPointId={objectId} onClose={onClose} navigate={navigate} />
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="ml-auto">
                          <Trash2 className="w-3 h-3 mr-1" /> Удалить
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить объект?</AlertDialogTitle>
                          <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => {
                              if (objectType === "map_point") deletePoint.mutate({ id: objectId! });
                              else deleteCable.mutate({ id: objectId! });
                            }}
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <ScrollArea className="max-h-[60vh]">
              <div className="px-4 py-3 space-y-2">
                {!auditData || auditData.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">История изменений пуста</div>
                ) : (
                  auditData.map((entry) => (
                    <div key={entry.id} className="border border-border rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              borderColor: entry.operation === "INSERT" ? "#4caf8a" : entry.operation === "DELETE" ? "#e05c5c" : "#e8a020",
                              color: entry.operation === "INSERT" ? "#4caf8a" : entry.operation === "DELETE" ? "#e05c5c" : "#e8a020",
                            }}
                          >
                            {entry.operation === "INSERT" ? "Создан" : entry.operation === "UPDATE" ? "Изменён" : "Удалён"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{entry.userName ?? "Система"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("ru-RU")}
                        </span>
                      </div>
                      {(() => {
                        const fields = entry.changedFields as string[] | null;
                        return fields && fields.length > 0 ? (
                          <div className="text-[11px] text-muted-foreground">
                            Изменены поля: {fields.join(", ")}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

function ViewInfo({ objectType, data }: { objectType: string; data: Record<string, unknown> }) {
  const rows: { label: string; value: string | null }[] = [];

  if (objectType === "map_point") {
    rows.push(
      { label: "Название", value: data.name as string ?? "—" },
      { label: "Тип", value: getTypeLabel(data.type as string) },
      { label: "Статус", value: getStatusLabel(data.status as string) },
      { label: "Координаты", value: `${Number(data.lat).toFixed(6)}, ${Number(data.lng).toFixed(6)}` },
      { label: "Адрес", value: data.address as string ?? "—" },
      { label: "Описание", value: data.description as string ?? "—" },
    );
  } else {
    rows.push(
      { label: "Название", value: data.name as string ?? "—" },
      { label: "Статус", value: getStatusLabel(data.status as string) },
      { label: "Тип прокладки", value: getLayingLabel(data.layingType as string) },
      { label: "Длина (расч.)", value: data.lengthCalc ? `${Math.round(Number(data.lengthCalc))} м` : "—" },
      { label: "Длина (факт)", value: data.lengthFact ? `${Math.round(Number(data.lengthFact))} м` : "—" },
      { label: "Описание", value: data.description as string ?? "—" },
    );
  }

  return (
    <div className="space-y-2">
      {rows.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-[120px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground break-words">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

function EditForm({
  objectType,
  data,
  onChange,
}: {
  objectType: string;
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Название</Label>
        <Input
          value={(data.name as string) ?? ""}
          onChange={(e) => onChange("name", e.target.value)}
          className="h-8 text-sm bg-input"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Статус</Label>
        <Select value={data.status as string} onValueChange={(v) => onChange("status", v)}>
          <SelectTrigger className="h-8 text-sm bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="fact">Факт</SelectItem>
            <SelectItem value="plan">План</SelectItem>
            <SelectItem value="dismantled">Демонтаж</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {objectType === "map_point" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Тип объекта</Label>
            <Select value={data.type as string} onValueChange={(v) => onChange("type", v)}>
              <SelectTrigger className="h-8 text-sm bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {["pole","manhole","splice","mast","entry_point","node_district","node_trunk","flag","camera","other"].map((t) => (
                  <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Адрес</Label>
            <Input
              value={(data.address as string) ?? ""}
              onChange={(e) => onChange("address", e.target.value)}
              className="h-8 text-sm bg-input"
            />
          </div>
        </>
      )}

      {objectType === "cable" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Тип прокладки</Label>
          <Select value={data.layingType as string} onValueChange={(v) => onChange("layingType", v)}>
            <SelectTrigger className="h-8 text-sm bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="aerial">Воздушный</SelectItem>
              <SelectItem value="underground">Подземный</SelectItem>
              <SelectItem value="duct">В канализации</SelectItem>
              <SelectItem value="building">В здании</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Описание</Label>
        <Textarea
          value={(data.description as string) ?? ""}
          onChange={(e) => onChange("description", e.target.value)}
          className="text-sm bg-input resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}
