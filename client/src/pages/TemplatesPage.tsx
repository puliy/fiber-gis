import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Cable, Layers, ChevronDown, ChevronRight, Trash2, Edit2, Save, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type FiberColor = { id: number; name: string; hexCode: string; iecNumber: number | null; sortOrder: number };
type CableModule = { id: number; templateId: number; moduleNumber: number; colorId: number | null; fiberCount: number; description: string | null };
type CableFiber = { id: number; moduleId: number; fiberNumber: number; colorId: number | null; fiberType: string | null; description: string | null };

function ColorDot({ color, size = "sm" }: { color?: FiberColor; size?: "sm" | "md" }) {
  const s = size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <span
      className={`inline-block ${s} rounded-full border border-border flex-shrink-0`}
      style={{ backgroundColor: color?.hexCode ?? "#888" }}
      title={color?.name}
    />
  );
}

function ColorSelect({ value, colors, onChange }: { value: number | null; colors: FiberColor[]; onChange: (v: number | null) => void }) {
  return (
    <Select
      value={value ? String(value) : "none"}
      onValueChange={(v) => onChange(v === "none" ? null : parseInt(v))}
    >
      <SelectTrigger className="h-7 text-xs bg-input w-full">
        <SelectValue>
          <div className="flex items-center gap-1.5">
            {value ? (
              <>
                <ColorDot color={colors.find((c) => c.id === value)} />
                <span>{colors.find((c) => c.id === value)?.name ?? "—"}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Не выбран</span>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">Не выбран</span>
        </SelectItem>
        {colors.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.hexCode }} />
              {c.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ModuleEditor({
  templateId,
  colors,
  canEdit,
}: {
  templateId: number;
  colors: FiberColor[];
  canEdit: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: modules, refetch: refetchModules } = trpc.cableModules.byTemplate.useQuery({ templateId });
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [addingModule, setAddingModule] = useState(false);
  const [moduleForm, setModuleForm] = useState({ moduleNumber: "", colorId: null as number | null, fiberCount: "12", description: "" });

  const upsertModule = trpc.cableModules.upsertModule.useMutation({
    onSuccess: () => { toast.success("Модуль сохранён"); refetchModules(); setAddingModule(false); setEditingModuleId(null); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const deleteModule = trpc.cableModules.deleteModule.useMutation({
    onSuccess: () => { toast.success("Модуль удалён"); refetchModules(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const nextModuleNumber = (modules?.length ?? 0) + 1;

  const openAddModule = () => {
    setModuleForm({ moduleNumber: String(nextModuleNumber), colorId: null, fiberCount: "12", description: "" });
    setAddingModule(true);
    setEditingModuleId(null);
  };

  const openEditModule = (m: CableModule) => {
    setModuleForm({ moduleNumber: String(m.moduleNumber), colorId: m.colorId, fiberCount: String(m.fiberCount), description: m.description ?? "" });
    setEditingModuleId(m.id);
    setAddingModule(false);
  };

  const saveModule = (id?: number) => {
    upsertModule.mutate({
      id,
      templateId,
      moduleNumber: parseInt(moduleForm.moduleNumber) || nextModuleNumber,
      colorId: moduleForm.colorId,
      fiberCount: parseInt(moduleForm.fiberCount) || 12,
      description: moduleForm.description || null,
    });
  };

  return (
    <div className="space-y-2">
      {modules && modules.length > 0 && (
        <div className="space-y-1">
          {modules.map((m) => (
            <div key={m.id} className="border border-border rounded-md overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/40 cursor-pointer select-none"
                onClick={() => setExpandedModuleId(expandedModuleId === m.id ? null : m.id)}
              >
                {expandedModuleId === m.id ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <ColorDot color={colors.find((c) => c.id === m.colorId)} />
                <span className="text-xs font-medium">Модуль {m.moduleNumber}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto mr-1">
                  {m.fiberCount} вол.
                </Badge>
                {canEdit && (
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openEditModule(m)}>
                      <Edit2 className="w-2.5 h-2.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={() => deleteModule.mutate({ id: m.id })}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Inline edit form */}
              {editingModuleId === m.id && (
                <div className="px-3 py-2 bg-card border-t border-border space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">№ модуля</Label>
                      <Input type="number" value={moduleForm.moduleNumber} onChange={(e) => setModuleForm((f) => ({ ...f, moduleNumber: e.target.value }))} className="h-7 text-xs bg-input" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Волокон</Label>
                      <Input type="number" value={moduleForm.fiberCount} onChange={(e) => setModuleForm((f) => ({ ...f, fiberCount: e.target.value }))} min={1} max={144} className="h-7 text-xs bg-input" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Цвет трубки</Label>
                      <ColorSelect value={moduleForm.colorId} colors={colors} onChange={(v) => setModuleForm((f) => ({ ...f, colorId: v }))} />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-xs px-2" onClick={() => saveModule(m.id)} disabled={upsertModule.isPending}>
                      <Save className="w-3 h-3 mr-1" /> Сохранить
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setEditingModuleId(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Expanded fibers */}
              {expandedModuleId === m.id && editingModuleId !== m.id && (
                <FiberList moduleId={m.id} fiberCount={m.fiberCount} colors={colors} canEdit={canEdit} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add module form */}
      {addingModule ? (
        <div className="border border-primary/40 rounded-md p-3 bg-card space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Новый модуль</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">№ модуля</Label>
              <Input type="number" value={moduleForm.moduleNumber} onChange={(e) => setModuleForm((f) => ({ ...f, moduleNumber: e.target.value }))} className="h-7 text-xs bg-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Волокон</Label>
              <Input type="number" value={moduleForm.fiberCount} onChange={(e) => setModuleForm((f) => ({ ...f, fiberCount: e.target.value }))} min={1} max={144} className="h-7 text-xs bg-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Цвет трубки</Label>
              <ColorSelect value={moduleForm.colorId} colors={colors} onChange={(v) => setModuleForm((f) => ({ ...f, colorId: v }))} />
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-xs px-2" onClick={() => saveModule()} disabled={upsertModule.isPending}>
              <Save className="w-3 h-3 mr-1" /> Сохранить
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setAddingModule(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        canEdit && (
          <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={openAddModule}>
            <Plus className="w-3 h-3" /> Добавить модуль
          </Button>
        )
      )}
    </div>
  );
}

function FiberList({ moduleId, fiberCount, colors, canEdit }: { moduleId: number; fiberCount: number; colors: FiberColor[]; canEdit: boolean }) {
  const { data: fibers, refetch } = trpc.cableModules.fibersByModule.useQuery({ moduleId });
  const [editingFiberId, setEditingFiberId] = useState<number | null>(null);
  const [addingFiber, setAddingFiber] = useState(false);
  const [fiberForm, setFiberForm] = useState({ fiberNumber: "", colorId: null as number | null, fiberType: "G.652D" as string, description: "" });

  const upsertFiber = trpc.cableModules.upsertFiber.useMutation({
    onSuccess: () => { toast.success("Волокно сохранено"); refetch(); setAddingFiber(false); setEditingFiberId(null); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const deleteFiber = trpc.cableModules.deleteFiber.useMutation({
    onSuccess: () => { toast.success("Волокно удалено"); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const nextFiberNumber = (fibers?.length ?? 0) + 1;

  const openAddFiber = () => {
    setFiberForm({ fiberNumber: String(nextFiberNumber), colorId: null, fiberType: "G.652D", description: "" });
    setAddingFiber(true);
    setEditingFiberId(null);
  };

  const openEditFiber = (f: CableFiber) => {
    setFiberForm({ fiberNumber: String(f.fiberNumber), colorId: f.colorId, fiberType: f.fiberType ?? "G.652D", description: f.description ?? "" });
    setEditingFiberId(f.id);
    setAddingFiber(false);
  };

  const saveFiber = (id?: number) => {
    upsertFiber.mutate({
      id,
      moduleId,
      fiberNumber: parseInt(fiberForm.fiberNumber) || nextFiberNumber,
      colorId: fiberForm.colorId,
      fiberType: fiberForm.fiberType as "G.652D" | "G.657A1" | "G.657A2" | "OM3" | "OM4",
      description: fiberForm.description || null,
    });
  };

  return (
    <div className="px-3 py-2 bg-background/50 border-t border-border space-y-1">
      {/* Color palette preview */}
      <div className="flex flex-wrap gap-1 mb-2">
        {fibers && fibers.length > 0
          ? fibers.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1 cursor-pointer hover:opacity-80"
                onClick={() => openEditFiber(f)}
                title={`Волокно ${f.fiberNumber}: ${colors.find((c) => c.id === f.colorId)?.name ?? "без цвета"}`}
              >
                <span
                  className="inline-block w-4 h-4 rounded-sm border border-border"
                  style={{ backgroundColor: colors.find((c) => c.id === f.colorId)?.hexCode ?? "#888" }}
                />
                <span className="text-[10px] text-muted-foreground">{f.fiberNumber}</span>
              </div>
            ))
          : Array.from({ length: Math.min(fiberCount, 12) }, (_, i) => (
              <div key={i} className="flex items-center gap-1" title={`Волокно ${i + 1} (не настроено)`}>
                <span className="inline-block w-4 h-4 rounded-sm border border-dashed border-border opacity-40" style={{ backgroundColor: colors[i]?.hexCode ?? "#888" }} />
                <span className="text-[10px] text-muted-foreground opacity-40">{i + 1}</span>
              </div>
            ))}
        {fiberCount > 12 && (!fibers || fibers.length === 0) && (
          <span className="text-[10px] text-muted-foreground self-center">+{fiberCount - 12}</span>
        )}
      </div>

      {/* Fiber rows */}
      {fibers && fibers.length > 0 && (
        <div className="space-y-0.5">
          {fibers.map((f) => (
            <div key={f.id}>
              {editingFiberId === f.id ? (
                <div className="border border-primary/40 rounded p-2 bg-card space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">№ волокна</Label>
                      <Input type="number" value={fiberForm.fiberNumber} onChange={(e) => setFiberForm((ff) => ({ ...ff, fiberNumber: e.target.value }))} className="h-6 text-xs bg-input" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Цвет</Label>
                      <ColorSelect value={fiberForm.colorId} colors={colors} onChange={(v) => setFiberForm((ff) => ({ ...ff, colorId: v }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Тип</Label>
                      <Select value={fiberForm.fiberType} onValueChange={(v) => setFiberForm((ff) => ({ ...ff, fiberType: v }))}>
                        <SelectTrigger className="h-6 text-xs bg-input"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["G.652D", "G.657A1", "G.657A2", "OM3", "OM4"].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-5 text-[10px] px-2" onClick={() => saveFiber(f.id)} disabled={upsertFiber.isPending}>
                      <Save className="w-2.5 h-2.5 mr-0.5" /> Сохранить
                    </Button>
                    <Button size="sm" variant="outline" className="h-5 text-[10px] px-2" onClick={() => setEditingFiberId(null)}>
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-muted/20 group">
                  <ColorDot color={colors.find((c) => c.id === f.colorId)} />
                  <span className="text-xs text-muted-foreground w-5">{f.fiberNumber}</span>
                  <span className="text-xs">{colors.find((c) => c.id === f.colorId)?.name ?? "—"}</span>
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 ml-1">{f.fiberType ?? "G.652D"}</Badge>
                  {f.description && <span className="text-[10px] text-muted-foreground ml-1 truncate max-w-[80px]">{f.description}</span>}
                  {canEdit && (
                    <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => openEditFiber(f)}>
                        <Edit2 className="w-2 h-2" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-4 w-4 text-destructive hover:text-destructive" onClick={() => deleteFiber.mutate({ id: f.id })}>
                        <Trash2 className="w-2 h-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add fiber */}
      {addingFiber ? (
        <div className="border border-primary/40 rounded p-2 bg-card space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">№ волокна</Label>
              <Input type="number" value={fiberForm.fiberNumber} onChange={(e) => setFiberForm((ff) => ({ ...ff, fiberNumber: e.target.value }))} className="h-6 text-xs bg-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Цвет</Label>
              <ColorSelect value={fiberForm.colorId} colors={colors} onChange={(v) => setFiberForm((ff) => ({ ...ff, colorId: v }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Тип</Label>
              <Select value={fiberForm.fiberType} onValueChange={(v) => setFiberForm((ff) => ({ ...ff, fiberType: v }))}>
                <SelectTrigger className="h-6 text-xs bg-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["G.652D", "G.657A1", "G.657A2", "OM3", "OM4"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="h-5 text-[10px] px-2" onClick={() => saveFiber()} disabled={upsertFiber.isPending}>
              <Save className="w-2.5 h-2.5 mr-0.5" /> Сохранить
            </Button>
            <Button size="sm" variant="outline" className="h-5 text-[10px] px-2" onClick={() => setAddingFiber(false)}>
              <X className="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>
      ) : (
        canEdit && (
          <Button size="sm" variant="ghost" className="w-full h-6 text-[10px] gap-1 text-muted-foreground" onClick={openAddFiber}>
            <Plus className="w-2.5 h-2.5" /> Добавить волокно
          </Button>
        )
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newFiberCount, setNewFiberCount] = useState("48");
  const [newDescription, setNewDescription] = useState("");

  const { data: templates, refetch } = trpc.cables.templates.useQuery();
  const { data: fiberColors } = trpc.fiberColors.list.useQuery();

  const createTemplate = trpc.admin.createCableTemplate.useMutation({
    onSuccess: () => { toast.success("Шаблон создан"); refetch(); setShowCreate(false); resetForm(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const resetForm = () => { setNewName(""); setNewFiberCount("48"); setNewDescription(""); };

  const canEdit = isAuthenticated && user?.role === "admin";
  const colors = fiberColors ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> На карту
        </Button>
        <div className="flex items-center gap-2">
          <Cable className="w-5 h-5 text-primary" />
          <span className="font-semibold">Шаблоны кабелей</span>
        </div>
        {canEdit && (
          <Button size="sm" className="ml-auto gap-1" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Добавить
          </Button>
        )}
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {!templates || templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Cable className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Шаблоны кабелей не добавлены</p>
            {canEdit && (
              <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                Добавить первый шаблон
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer select-none"
                    onClick={() => setExpandedTemplateId(expandedTemplateId === t.id ? null : t.id)}
                  >
                    {expandedTemplateId === t.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      <Layers className="w-3 h-3 mr-1" />
                      {t.fiberCount} вол.
                    </Badge>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground pl-10">{t.description}</p>
                  )}
                </CardHeader>

                {expandedTemplateId === t.id && (
                  <CardContent className="pt-0 pb-3">
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Модули и волокна
                      </p>
                      <ModuleEditor templateId={t.id} colors={colors} canEdit={canEdit} />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && setShowCreate(false)}>
        <DialogContent className="max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base">Новый шаблон кабеля</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Название *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: ОКЛ-48"
                className="h-8 text-sm bg-input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Количество волокон *</Label>
              <Input
                type="number"
                value={newFiberCount}
                onChange={(e) => setNewFiberCount(e.target.value)}
                min={1}
                max={1000}
                className="h-8 text-sm bg-input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Описание</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Необязательно"
                className="h-8 text-sm bg-input"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={!newName || createTemplate.isPending}
              onClick={() => createTemplate.mutate({
                name: newName,
                fiberCount: parseInt(newFiberCount),
                description: newDescription || undefined,
              })}
            >
              {createTemplate.isPending ? "Создание..." : "Создать"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
