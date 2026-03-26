import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, GitMerge, Settings, Download } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

type SpliceRow = {
  id: number;
  closureId: number;
  cableAId: number | null;
  moduleANumber: number | null;
  fiberANumber: number | null;
  cableBId: number | null;
  moduleBNumber: number | null;
  fiberBNumber: number | null;
  spliceType: "fusion" | "mechanical";
  loss: string | null;
  notes: string | null;
  sortOrder: number;
};

const SPLICE_TYPE_LABELS: Record<string, string> = {
  fusion: "Сварная",
  mechanical: "Механическая",
};

const CLOSURE_TYPE_LABELS: Record<string, string> = {
  inline: "Прямая",
  branch: "Ответвительная",
  terminal: "Оконечная",
};

function FiberColorDot({ colorHex, title }: { colorHex?: string; title?: string }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-border flex-shrink-0"
      style={{ backgroundColor: colorHex ?? "#888" }}
      title={title}
    />
  );
}

export default function SplicePassportPage() {
  const { id } = useParams<{ id: string }>();
  const closureId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "user";

  // ─── Data queries ────────────────────────────────────────────────────────────
  const { data: closure, refetch: refetchClosure } = trpc.splice.byId.useQuery(
    { id: closureId },
    { enabled: closureId > 0 }
  );
  const { data: splices, refetch: refetchSplices } = trpc.splice.splices.useQuery(
    { closureId },
    { enabled: closureId > 0 }
  );
  const { data: fiberColors } = trpc.fiberColors.list.useQuery();

  // ─── Edit closure info ───────────────────────────────────────────────────────
  const [editingClosure, setEditingClosure] = useState(false);
  const [closureForm, setClosureForm] = useState({
    name: "",
    closureType: "inline" as "inline" | "branch" | "terminal",
    capacity: "24",
    manufacturer: "",
    model: "",
    description: "",
  });

  const upsertClosure = trpc.splice.upsert.useMutation({
    onSuccess: () => { toast.success("Муфта обновлена"); refetchClosure(); setEditingClosure(false); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const openEditClosure = () => {
    if (!closure) return;
    setClosureForm({
      name: closure.name ?? "",
      closureType: (closure.closureType as "inline" | "branch" | "terminal") ?? "inline",
      capacity: String(closure.capacity ?? 24),
      manufacturer: closure.manufacturer ?? "",
      model: closure.model ?? "",
      description: closure.description ?? "",
    });
    setEditingClosure(true);
  };

  // ─── Splice editing ──────────────────────────────────────────────────────────
  const [showSpliceDialog, setShowSpliceDialog] = useState(false);
  const [editingSplice, setEditingSplice] = useState<SpliceRow | null>(null);
  const [spliceForm, setSpliceForm] = useState({
    cableAId: "",
    moduleANumber: "",
    fiberANumber: "",
    cableBId: "",
    moduleBNumber: "",
    fiberBNumber: "",
    spliceType: "fusion" as "fusion" | "mechanical",
    loss: "",
    notes: "",
  });

  const upsertSplice = trpc.splice.upsertSplice.useMutation({
    onSuccess: () => { toast.success("Сварка сохранена"); refetchSplices(); setShowSpliceDialog(false); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteSplice = trpc.splice.deleteSplice.useMutation({
    onSuccess: () => { toast.success("Сварка удалена"); refetchSplices(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const openNewSplice = () => {
    setEditingSplice(null);
    setSpliceForm({ cableAId: "", moduleANumber: "", fiberANumber: "", cableBId: "", moduleBNumber: "", fiberBNumber: "", spliceType: "fusion", loss: "", notes: "" });
    setShowSpliceDialog(true);
  };

  const openEditSplice = (s: SpliceRow) => {
    setEditingSplice(s);
    setSpliceForm({
      cableAId: String(s.cableAId ?? ""),
      moduleANumber: String(s.moduleANumber ?? ""),
      fiberANumber: String(s.fiberANumber ?? ""),
      cableBId: String(s.cableBId ?? ""),
      moduleBNumber: String(s.moduleBNumber ?? ""),
      fiberBNumber: String(s.fiberBNumber ?? ""),
      spliceType: s.spliceType ?? "fusion",
      loss: s.loss ?? "",
      notes: s.notes ?? "",
    });
    setShowSpliceDialog(true);
  };

  const saveSplice = () => {
    upsertSplice.mutate({
      id: editingSplice?.id,
      closureId,
      cableAId: spliceForm.cableAId ? parseInt(spliceForm.cableAId) : null,
      moduleANumber: spliceForm.moduleANumber ? parseInt(spliceForm.moduleANumber) : null,
      fiberANumber: spliceForm.fiberANumber ? parseInt(spliceForm.fiberANumber) : null,
      cableBId: spliceForm.cableBId ? parseInt(spliceForm.cableBId) : null,
      moduleBNumber: spliceForm.moduleBNumber ? parseInt(spliceForm.moduleBNumber) : null,
      fiberBNumber: spliceForm.fiberBNumber ? parseInt(spliceForm.fiberBNumber) : null,
      spliceType: spliceForm.spliceType,
      loss: spliceForm.loss || null,
      notes: spliceForm.notes || null,
    });
  };

  // ─── Fiber color helper ──────────────────────────────────────────────────────
  const colorByNumber = (n: number | null) => {
    if (!n || !fiberColors) return undefined;
    return fiberColors.find((c) => c.iecNumber === n)?.hexCode;
  };

  if (!closureId || closureId <= 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Неверный ID муфты</p>
          <Button size="sm" className="mt-3" onClick={() => navigate("/")}>На карту</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> На карту
        </Button>
        <div className="flex items-center gap-2">
          <GitMerge className="w-5 h-5 text-primary" />
          <span className="font-semibold">
            {closure ? (closure.name || `Муфта #${closure.id}`) : "Загрузка..."}
          </span>
          {closure && (
            <Badge variant="secondary" className="text-xs">
              {CLOSURE_TYPE_LABELS[closure.closureType ?? "inline"]}
            </Badge>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {closure && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => window.print()}
            >
              <Download className="w-4 h-4" /> PDF
            </Button>
          )}
          {canEdit && closure && (
            <Button size="sm" variant="outline" className="gap-1" onClick={openEditClosure}>
              <Settings className="w-4 h-4" /> Параметры
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Closure info card */}
        {closure && (
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Тип</p>
                  <p className="font-medium">{CLOSURE_TYPE_LABELS[closure.closureType ?? "inline"]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Ёмкость</p>
                  <p className="font-medium">{closure.capacity ?? 24} сварок</p>
                </div>
                {closure.manufacturer && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Производитель</p>
                    <p className="font-medium">{closure.manufacturer}</p>
                  </div>
                )}
                {closure.model && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Модель</p>
                    <p className="font-medium">{closure.model}</p>
                  </div>
                )}
              </div>
              {closure.description && (
                <p className="text-xs text-muted-foreground mt-2">{closure.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Splices table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-primary" />
              Сварки ({splices?.length ?? 0} / {closure?.capacity ?? 24})
            </CardTitle>
            {canEdit && (
              <Button size="sm" className="gap-1 h-7 text-xs" onClick={openNewSplice}>
                <Plus className="w-3.5 h-3.5" /> Добавить
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!splices || splices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <GitMerge className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Сварки не добавлены</p>
                {canEdit && (
                  <Button size="sm" className="mt-2" onClick={openNewSplice}>Добавить первую сварку</Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium w-8">#</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Кабель A</th>
                      <th className="px-3 py-2 text-center text-muted-foreground font-medium w-6">—</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Кабель B</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Тип</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Потери</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Примечание</th>
                      {canEdit && <th className="px-3 py-2 w-16" />}
                    </tr>
                  </thead>
                  <tbody>
                    {splices.map((s, idx) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <FiberColorDot colorHex={colorByNumber(s.fiberANumber)} title={`Волокно ${s.fiberANumber}`} />
                            <span>
                              {s.cableAId ? `Кабель ${s.cableAId}` : "—"}
                              {s.moduleANumber ? ` М${s.moduleANumber}` : ""}
                              {s.fiberANumber ? ` В${s.fiberANumber}` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-muted-foreground">⟷</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <FiberColorDot colorHex={colorByNumber(s.fiberBNumber)} title={`Волокно ${s.fiberBNumber}`} />
                            <span>
                              {s.cableBId ? `Кабель ${s.cableBId}` : "—"}
                              {s.moduleBNumber ? ` М${s.moduleBNumber}` : ""}
                              {s.fiberBNumber ? ` В${s.fiberBNumber}` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {SPLICE_TYPE_LABELS[s.spliceType ?? "fusion"]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {s.loss ? `${s.loss} дБ` : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">
                          {s.notes ?? "—"}
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => openEditSplice(s as SpliceRow)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => deleteSplice.mutate({ id: s.id })}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit closure dialog */}
      <Dialog open={editingClosure} onOpenChange={(o) => !o && setEditingClosure(false)}>
        <DialogContent className="max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base">Параметры муфты</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Название</Label>
              <Input
                value={closureForm.name}
                onChange={(e) => setClosureForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Муфта-1"
                className="h-8 text-sm bg-input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Тип муфты</Label>
              <Select
                value={closureForm.closureType}
                onValueChange={(v) => setClosureForm((f) => ({ ...f, closureType: v as "inline" | "branch" | "terminal" }))}
              >
                <SelectTrigger className="h-8 text-sm bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Прямая</SelectItem>
                  <SelectItem value="branch">Ответвительная</SelectItem>
                  <SelectItem value="terminal">Оконечная</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ёмкость (сварок)</Label>
              <Input
                type="number"
                value={closureForm.capacity}
                onChange={(e) => setClosureForm((f) => ({ ...f, capacity: e.target.value }))}
                min={1}
                max={9999}
                className="h-8 text-sm bg-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Производитель</Label>
                <Input
                  value={closureForm.manufacturer}
                  onChange={(e) => setClosureForm((f) => ({ ...f, manufacturer: e.target.value }))}
                  className="h-8 text-sm bg-input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Модель</Label>
                <Input
                  value={closureForm.model}
                  onChange={(e) => setClosureForm((f) => ({ ...f, model: e.target.value }))}
                  className="h-8 text-sm bg-input"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Примечание</Label>
              <Textarea
                value={closureForm.description}
                onChange={(e) => setClosureForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="text-sm bg-input resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={upsertClosure.isPending}
              onClick={() =>
                upsertClosure.mutate({
                  id: closure?.id,
                  mapPointId: closure!.mapPointId,
                  name: closureForm.name || null,
                  closureType: closureForm.closureType,
                  capacity: parseInt(closureForm.capacity) || 24,
                  manufacturer: closureForm.manufacturer || null,
                  model: closureForm.model || null,
                  description: closureForm.description || null,
                })
              }
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {upsertClosure.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditingClosure(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Splice edit dialog */}
      <Dialog open={showSpliceDialog} onOpenChange={(o) => !o && setShowSpliceDialog(false)}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingSplice ? "Редактировать сварку" : "Новая сварка"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Side A */}
            <div className="p-3 rounded-md bg-muted/30 border border-border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Сторона A</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ID кабеля</Label>
                  <Input
                    type="number"
                    value={spliceForm.cableAId}
                    onChange={(e) => setSpliceForm((f) => ({ ...f, cableAId: e.target.value }))}
                    placeholder="—"
                    className="h-7 text-xs bg-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Модуль №</Label>
                  <Input
                    type="number"
                    value={spliceForm.moduleANumber}
                    onChange={(e) => setSpliceForm((f) => ({ ...f, moduleANumber: e.target.value }))}
                    placeholder="—"
                    className="h-7 text-xs bg-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Волокно №</Label>
                  <Input
                    type="number"
                    value={spliceForm.fiberANumber}
                    onChange={(e) => setSpliceForm((f) => ({ ...f, fiberANumber: e.target.value }))}
                    placeholder="—"
                    className="h-7 text-xs bg-input"
                  />
                </div>
              </div>
            </div>
            {/* Side B */}
            <div className="p-3 rounded-md bg-muted/30 border border-border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Сторона B</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ID кабеля</Label>
                  <Input
                    type="number"
                    value={spliceForm.cableBId}
                    onChange={(e) => setSpliceForm((f) => ({ ...f, cableBId: e.target.value }))}
                    placeholder="—"
                    className="h-7 text-xs bg-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Модуль №</Label>
                  <Input
                    type="number"
                    value={spliceForm.moduleBNumber}
                    onChange={(e) => setSpliceForm((f) => ({ ...f, moduleBNumber: e.target.value }))}
                    placeholder="—"
                    className="h-7 text-xs bg-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Волокно №</Label>
                  <Input
                    type="number"
                    value={spliceForm.fiberBNumber}
                    onChange={(e) => setSpliceForm((f) => ({ ...f, fiberBNumber: e.target.value }))}
                    placeholder="—"
                    className="h-7 text-xs bg-input"
                  />
                </div>
              </div>
            </div>
            {/* Splice params */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Тип сварки</Label>
                <Select
                  value={spliceForm.spliceType}
                  onValueChange={(v) => setSpliceForm((f) => ({ ...f, spliceType: v as "fusion" | "mechanical" }))}
                >
                  <SelectTrigger className="h-7 text-xs bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fusion">Сварная</SelectItem>
                    <SelectItem value="mechanical">Механическая</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Потери (дБ)</Label>
                <Input
                  value={spliceForm.loss}
                  onChange={(e) => setSpliceForm((f) => ({ ...f, loss: e.target.value }))}
                  placeholder="0.050"
                  className="h-7 text-xs bg-input"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Примечание</Label>
              <Input
                value={spliceForm.notes}
                onChange={(e) => setSpliceForm((f) => ({ ...f, notes: e.target.value }))}
                className="h-7 text-xs bg-input"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={upsertSplice.isPending}
              onClick={saveSplice}
            >
              {upsertSplice.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSpliceDialog(false)}>Отмена</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
