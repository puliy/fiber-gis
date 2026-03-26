import { useState } from "react";
import type { ActiveEquipment, Splitter } from "../../../drizzle/schema";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Server, Cpu, Zap, Router } from "lucide-react";

const EQUIP_TYPE_LABELS: Record<string, string> = {
  OLT: "OLT",
  switch: "Коммутатор",
  media_converter: "Медиаконвертер",
  ONT: "ONT/ONU",
  splitter: "Сплиттер",
  amplifier: "Усилитель",
  other: "Прочее",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  inactive: "Неактивен",
  planned: "Планируется",
  faulty: "Неисправен",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 border-green-300",
  inactive: "bg-gray-500/15 text-gray-600 border-gray-300",
  planned: "bg-blue-500/15 text-blue-700 border-blue-300",
  faulty: "bg-red-500/15 text-red-700 border-red-300",
};

const EQUIP_ICONS: Record<string, React.ReactNode> = {
  OLT: <Server className="w-4 h-4" />,
  switch: <Router className="w-4 h-4" />,
  media_converter: <Zap className="w-4 h-4" />,
  ONT: <Cpu className="w-4 h-4" />,
  splitter: <Zap className="w-4 h-4" />,
  amplifier: <Zap className="w-4 h-4" />,
  other: <Server className="w-4 h-4" />,
};

type EquipForm = {
  id?: number;
  regionId: number;
  mapPointId?: number | null;
  name: string;
  equipType: "OLT" | "switch" | "media_converter" | "ONT" | "splitter" | "amplifier" | "other";
  vendor: string;
  model: string;
  serialNumber: string;
  ipAddress: string;
  portCount: string;
  status: "active" | "inactive" | "planned" | "faulty";
  notes: string;
};

type SplitterForm = {
  id?: number;
  regionId: number;
  name: string;
  splitRatio: "1:2" | "1:4" | "1:8" | "1:16" | "1:32" | "1:64" | "1:128";
  status: "active" | "inactive" | "planned" | "faulty";
  notes: string;
};

export default function EquipmentPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "user";

  // Берём regionId из sessionStorage (устанавливается при переходе с карты)
  const regionId = parseInt(sessionStorage.getItem("currentRegionId") ?? "1", 10) || 1;

  const { data: equipment = [], refetch: refetchEquip } = trpc.equipment.byRegion.useQuery({ regionId });
  const { data: splitterList = [], refetch: refetchSplitters } = trpc.splitters.byRegion.useQuery({ regionId });

  const [equipDialog, setEquipDialog] = useState(false);
  const [splitterDialog, setSplitterDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "equip" | "splitter"; id: number; name: string } | null>(null);

  const emptyEquipForm = (): EquipForm => ({
    regionId,
    name: "",
    equipType: "OLT",
    vendor: "",
    model: "",
    serialNumber: "",
    ipAddress: "",
    portCount: "",
    status: "planned",
    notes: "",
  });

  const emptySplitterForm = (): SplitterForm => ({
    regionId,
    name: "",
    splitRatio: "1:8",
    status: "planned",
    notes: "",
  });

  const [equipForm, setEquipForm] = useState<EquipForm>(emptyEquipForm());
  const [splitterForm, setSplitterForm] = useState<SplitterForm>(emptySplitterForm());

  const upsertEquip = trpc.equipment.upsert.useMutation({
    onSuccess: () => { refetchEquip(); setEquipDialog(false); toast.success("Оборудование сохранено"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteEquip = trpc.equipment.delete.useMutation({
    onSuccess: () => { refetchEquip(); setDeleteConfirm(null); toast.success("Удалено"); },
    onError: (e) => toast.error(e.message),
  });

  const upsertSplitter = trpc.splitters.upsert.useMutation({
    onSuccess: () => { refetchSplitters(); setSplitterDialog(false); toast.success("Сплиттер сохранён"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteSplitter = trpc.splitters.delete.useMutation({
    onSuccess: () => { refetchSplitters(); setDeleteConfirm(null); toast.success("Удалено"); },
    onError: (e) => toast.error(e.message),
  });

  function openEditEquip(item: typeof equipment[0]) {
    setEquipForm({
      id: item.id,
      regionId: item.regionId,
      mapPointId: item.mapPointId,
      name: item.name,
      equipType: item.equipType as EquipForm["equipType"],
      vendor: item.vendor ?? "",
      model: item.model ?? "",
      serialNumber: item.serialNumber ?? "",
      ipAddress: item.ipAddress ?? "",
      portCount: item.portCount ? String(item.portCount) : "",
      status: item.status as EquipForm["status"],
      notes: item.notes ?? "",
    });
    setEquipDialog(true);
  }

  function openEditSplitter(item: typeof splitterList[0]) {
    setSplitterForm({
      id: item.id,
      regionId: item.regionId,
      name: item.name,
      splitRatio: item.splitRatio as SplitterForm["splitRatio"],
      status: item.status as SplitterForm["status"],
      notes: item.notes ?? "",
    });
    setSplitterDialog(true);
  }

  function handleSaveEquip() {
    upsertEquip.mutate({
      ...equipForm,
      portCount: equipForm.portCount ? parseInt(equipForm.portCount, 10) : undefined,
    });
  }

  function handleSaveSplitter() {
    upsertSplitter.mutate(splitterForm);
  }

  function handleDelete() {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "equip") deleteEquip.mutate({ id: deleteConfirm.id });
    else deleteSplitter.mutate({ id: deleteConfirm.id });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">Активное оборудование</h1>
          <p className="text-xs text-muted-foreground">Регион #{regionId}</p>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto">
        <Tabs defaultValue="equipment">
          <TabsList className="mb-4">
            <TabsTrigger value="equipment">Оборудование ({equipment.length})</TabsTrigger>
            <TabsTrigger value="splitters">Сплиттеры ({splitterList.length})</TabsTrigger>
          </TabsList>

          {/* ─── Equipment Tab ─────────────────────────────────────────────── */}
          <TabsContent value="equipment">
            {canEdit && (
              <div className="mb-4 flex justify-end">
                <Button onClick={() => { setEquipForm(emptyEquipForm()); setEquipDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Добавить оборудование
                </Button>
              </div>
            )}

            {equipment.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Оборудование не добавлено</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {equipment.map((item: ActiveEquipment) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground">{EQUIP_ICONS[item.equipType] ?? <Server className="w-4 h-4" />}</span>
                          <CardTitle className="text-base truncate">{item.name}</CardTitle>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEquip(item)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: "equip", id: item.id, name: item.name })}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">{EQUIP_TYPE_LABELS[item.equipType] ?? item.equipType}</Badge>
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[item.status ?? "planned"]}`}>
                          {STATUS_LABELS[item.status ?? "planned"]}
                        </Badge>
                      </div>
                      {(item.vendor || item.model) && (
                        <p className="text-sm text-muted-foreground">{[item.vendor, item.model].filter(Boolean).join(" / ")}</p>
                      )}
                      {item.ipAddress && (
                        <p className="text-xs font-mono text-muted-foreground">IP: {item.ipAddress}</p>
                      )}
                      {item.portCount && (
                        <p className="text-xs text-muted-foreground">Портов: {item.portCount}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Splitters Tab ─────────────────────────────────────────────── */}
          <TabsContent value="splitters">
            {canEdit && (
              <div className="mb-4 flex justify-end">
                <Button onClick={() => { setSplitterForm(emptySplitterForm()); setSplitterDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Добавить сплиттер
                </Button>
              </div>
            )}

            {splitterList.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Сплиттеры не добавлены</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {splitterList.map((item: Splitter) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base truncate">{item.name}</CardTitle>
                        <div className="flex gap-1 shrink-0">
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSplitter(item)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: "splitter", id: item.id, name: item.name })}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs font-mono">{item.splitRatio}</Badge>
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[item.status ?? "planned"]}`}>
                          {STATUS_LABELS[item.status ?? "planned"]}
                        </Badge>
                      </div>
                      {item.notes && <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Equipment Dialog ───────────────────────────────────────────────── */}
      <Dialog open={equipDialog} onOpenChange={setEquipDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{equipForm.id ? "Редактировать оборудование" : "Добавить оборудование"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="mb-1.5 block">Наименование *</Label>
              <Input value={equipForm.name} onChange={e => setEquipForm(f => ({ ...f, name: e.target.value }))} placeholder="OLT-01 / SW-CORE-01" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Тип</Label>
                <Select value={equipForm.equipType} onValueChange={v => setEquipForm(f => ({ ...f, equipType: v as EquipForm["equipType"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(EQUIP_TYPE_LABELS) as [string, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Статус</Label>
                <Select value={equipForm.status} onValueChange={v => setEquipForm(f => ({ ...f, status: v as EquipForm["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_LABELS) as [string, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Производитель</Label>
                <Input value={equipForm.vendor} onChange={e => setEquipForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Huawei / ZTE / Cisco" />
              </div>
              <div>
                <Label className="mb-1.5 block">Модель</Label>
                <Input value={equipForm.model} onChange={e => setEquipForm(f => ({ ...f, model: e.target.value }))} placeholder="MA5800-X7" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">IP-адрес</Label>
                <Input value={equipForm.ipAddress} onChange={e => setEquipForm(f => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.1" />
              </div>
              <div>
                <Label className="mb-1.5 block">Кол-во портов</Label>
                <Input type="number" value={equipForm.portCount} onChange={e => setEquipForm(f => ({ ...f, portCount: e.target.value }))} placeholder="16" />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Серийный номер</Label>
              <Input value={equipForm.serialNumber} onChange={e => setEquipForm(f => ({ ...f, serialNumber: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Примечание</Label>
              <Textarea value={equipForm.notes} onChange={e => setEquipForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEquipDialog(false)}>Отмена</Button>
            <Button onClick={handleSaveEquip} disabled={!equipForm.name.trim() || upsertEquip.isPending}>
              {upsertEquip.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Splitter Dialog ────────────────────────────────────────────────── */}
      <Dialog open={splitterDialog} onOpenChange={setSplitterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{splitterForm.id ? "Редактировать сплиттер" : "Добавить сплиттер"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="mb-1.5 block">Наименование *</Label>
              <Input value={splitterForm.name} onChange={e => setSplitterForm(f => ({ ...f, name: e.target.value }))} placeholder="SPL-01 / Сплиттер ул. Ленина" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Коэффициент деления</Label>
                <Select value={splitterForm.splitRatio} onValueChange={v => setSplitterForm(f => ({ ...f, splitRatio: v as SplitterForm["splitRatio"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1:2", "1:4", "1:8", "1:16", "1:32", "1:64", "1:128"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Статус</Label>
                <Select value={splitterForm.status} onValueChange={v => setSplitterForm(f => ({ ...f, status: v as SplitterForm["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_LABELS) as [string, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Примечание</Label>
              <Textarea value={splitterForm.notes} onChange={e => setSplitterForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitterDialog(false)}>Отмена</Button>
            <Button onClick={handleSaveSplitter} disabled={!splitterForm.name.trim() || upsertSplitter.isPending}>
              {upsertSplitter.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─────────────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Вы уверены, что хотите удалить <strong>{deleteConfirm?.name}</strong>? Это действие нельзя отменить.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteEquip.isPending || deleteSplitter.isPending}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
