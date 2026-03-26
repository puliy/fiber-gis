import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Cable, Layers } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function TemplatesPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFiberCount, setNewFiberCount] = useState("48");
  const [newDescription, setNewDescription] = useState("");

  const { data: templates, refetch } = trpc.cables.templates.useQuery();

  const createTemplate = trpc.admin.createCableTemplate.useMutation({
    onSuccess: () => { toast.success("Шаблон создан"); refetch(); setShowCreate(false); resetForm(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const resetForm = () => { setNewName(""); setNewFiberCount("48"); setNewDescription(""); };

  const canEdit = isAuthenticated && user?.role === "admin";

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <Card key={t.id} className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    {t.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium text-primary">{t.fiberCount}</span>
                      <span className="text-muted-foreground"> волокон</span>
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Array.from({ length: Math.min(t.fiberCount, 12) }, (_, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: FIBER_COLORS[i % FIBER_COLORS.length] }}
                        title={`Волокно ${i + 1}`}
                      />
                    ))}
                    {t.fiberCount > 12 && (
                      <span className="text-[10px] text-muted-foreground self-center">+{t.fiberCount - 12}</span>
                    )}
                  </div>
                </CardContent>
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

// Standard fiber colors (IEC 60304)
const FIBER_COLORS = [
  "#1565c0", "#f44336", "#4caf50", "#ffeb3b", "#9c27b0",
  "#ffffff", "#ff9800", "#9e9e9e", "#00bcd4", "#000000",
  "#ffeb3b", "#8bc34a",
];
