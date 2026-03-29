import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Shield, Users, Activity, Map, Plus, Trash2, Edit2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function RegionStatsRow({ regionId }: { regionId: number }) {
  const { data } = trpc.regions.stats.useQuery({ regionId });
  if (!data) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {data.points} точек · {data.cables} кабелей · {data.buildings} зданий
    </span>
  );
}

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showCreateRegion, setShowCreateRegion] = useState(false);
  const [editRegion, setEditRegion] = useState<{ id: number; name: string; description?: string; centerLat: string; centerLng: string; defaultZoom: number } | null>(null);
  const [regionForm, setRegionForm] = useState({ name: "", description: "", centerLat: "", centerLng: "", defaultZoom: "13" });

  const { data: users, refetch: refetchUsers } = trpc.admin.users.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: regions, refetch: refetchRegions } = trpc.regions.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Роль обновлена"); refetchUsers(); },
    onError: (e) => toast.error(e.message),
  });

  const createRegion = trpc.regions.create.useMutation({
    onSuccess: () => { toast.success("Регион создан"); setShowCreateRegion(false); setRegionForm({ name: "", description: "", centerLat: "", centerLng: "", defaultZoom: "13" }); refetchRegions(); },
    onError: (e) => toast.error(e.message),
  });

  const updateRegion = trpc.regions.update.useMutation({
    onSuccess: () => { toast.success("Регион обновлён"); setEditRegion(null); refetchRegions(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteRegion = trpc.regions.delete.useMutation({
    onSuccess: () => { toast.success("Регион удалён"); refetchRegions(); },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Доступ запрещён. Требуются права администратора.</p>
          <Button variant="outline" onClick={() => navigate("/")}>На карту</Button>
        </div>
      </div>
    );
  }

  const handleCreateRegion = () => {
    const lat = parseFloat(regionForm.centerLat);
    const lng = parseFloat(regionForm.centerLng);
    if (!regionForm.name.trim()) { toast.error("Введите название региона"); return; }
    if (isNaN(lat) || isNaN(lng)) { toast.error("Некорректные координаты центра"); return; }
    createRegion.mutate({ name: regionForm.name.trim(), description: regionForm.description || undefined, centerLat: lat, centerLng: lng, defaultZoom: parseInt(regionForm.defaultZoom) || 13 });
  };

  const handleUpdateRegion = () => {
    if (!editRegion) return;
    const lat = parseFloat(editRegion.centerLat);
    const lng = parseFloat(editRegion.centerLng);
    if (!editRegion.name.trim()) { toast.error("Введите название региона"); return; }
    if (isNaN(lat) || isNaN(lng)) { toast.error("Некорректные координаты центра"); return; }
    updateRegion.mutate({ id: editRegion.id, name: editRegion.name.trim(), description: editRegion.description || undefined, centerLat: lat, centerLng: lng, defaultZoom: editRegion.defaultZoom });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> На карту
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-semibold">Администрирование</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{users?.length ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Пользователей</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                <div>
                  <div className="text-2xl font-bold">{users?.filter((u) => u.role === "admin").length ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Администраторов</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold">{users?.filter((u) => u.role === "editor").length ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Редакторов</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-2xl font-bold">{regions?.length ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Регионов</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="users" className="text-xs gap-1"><Users className="w-3 h-3" /> Пользователи</TabsTrigger>
            <TabsTrigger value="regions" className="text-xs gap-1"><Map className="w-3 h-3" /> Регионы</TabsTrigger>
          </TabsList>

          {/* Users tab */}
          <TabsContent value="users" className="mt-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Пользователи системы</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">ID</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Имя</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Email</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Роль</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Последний вход</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(users ?? []).map((u: { id: number; name: string | null; email: string | null; role: string; lastSignedIn: Date }) => (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{u.id}</td>
                          <td className="px-4 py-2.5 font-medium">{u.name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{u.email ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                borderColor: u.role === "admin" ? "#e05c5c" : u.role === "editor" ? "#4a9eff" : u.role === "viewer" ? "#888" : "#4caf8a",
                                color: u.role === "admin" ? "#e05c5c" : u.role === "editor" ? "#4a9eff" : u.role === "viewer" ? "#888" : "#4caf8a",
                              }}
                            >
                              {u.role === "admin" ? "Администратор" : u.role === "editor" ? "Редактор" : u.role === "viewer" ? "Читатель" : "Пользователь"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {new Date(u.lastSignedIn).toLocaleString("ru-RU")}
                          </td>
                          <td className="px-4 py-2.5">
                            {u.id !== user?.id && (
                              <Select
                                value={u.role}
                                onValueChange={(role) => updateRole.mutate({ userId: u.id, role: role as any })}
                              >
                                <SelectTrigger className="h-6 text-xs bg-input border-border w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  <SelectItem value="admin" className="text-xs">Администратор</SelectItem>
                                  <SelectItem value="editor" className="text-xs">Редактор</SelectItem>
                                  <SelectItem value="user" className="text-xs">Пользователь</SelectItem>
                                  <SelectItem value="viewer" className="text-xs">Читатель</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {u.id === user?.id && (
                              <span className="text-xs text-muted-foreground">(Вы)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regions tab */}
          <TabsContent value="regions" className="mt-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Регионы</CardTitle>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreateRegion(true)}>
                  <Plus className="w-3 h-3" /> Добавить регион
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">ID</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Название</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Центр</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Статистика</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(regions ?? []).map((r) => (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.id}</td>
                          <td className="px-4 py-2.5 font-medium">{r.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {Number(r.centerLat).toFixed(4)}, {Number(r.centerLng).toFixed(4)} (z{r.defaultZoom})
                          </td>
                          <td className="px-4 py-2.5">
                            <RegionStatsRow regionId={r.id} />
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => setEditRegion({ id: r.id, name: r.name, description: r.description ?? "", centerLat: String(r.centerLat), centerLng: String(r.centerLng), defaultZoom: r.defaultZoom ?? 13 })}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border-border">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Удалить регион "{r.name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>Это действие необратимо. Все объекты региона останутся в БД, но регион будет недоступен.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteRegion.mutate({ id: r.id })}>
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!regions || regions.length === 0) && (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">Регионов нет</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Region Dialog */}
      <Dialog open={showCreateRegion} onOpenChange={setShowCreateRegion}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Новый регион</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Название *</Label>
              <Input value={regionForm.name} onChange={(e) => setRegionForm((p) => ({ ...p, name: e.target.value }))} className="h-8 text-sm bg-input" placeholder="Например: Центральный район" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Описание</Label>
              <Input value={regionForm.description} onChange={(e) => setRegionForm((p) => ({ ...p, description: e.target.value }))} className="h-8 text-sm bg-input" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Широта центра *</Label>
                <Input value={regionForm.centerLat} onChange={(e) => setRegionForm((p) => ({ ...p, centerLat: e.target.value }))} className="h-8 text-sm bg-input" placeholder="51.6754" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Долгота центра *</Label>
                <Input value={regionForm.centerLng} onChange={(e) => setRegionForm((p) => ({ ...p, centerLng: e.target.value }))} className="h-8 text-sm bg-input" placeholder="39.2088" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Масштаб по умолчанию (1–20)</Label>
              <Input value={regionForm.defaultZoom} onChange={(e) => setRegionForm((p) => ({ ...p, defaultZoom: e.target.value }))} className="h-8 text-sm bg-input" type="number" min={1} max={20} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreateRegion} disabled={createRegion.isPending}>
                {createRegion.isPending ? "Создание..." : "Создать"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreateRegion(false)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Region Dialog */}
      <Dialog open={!!editRegion} onOpenChange={(open) => !open && setEditRegion(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Редактировать регион</DialogTitle></DialogHeader>
          {editRegion && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Название *</Label>
                <Input value={editRegion.name} onChange={(e) => setEditRegion((p) => p ? { ...p, name: e.target.value } : p)} className="h-8 text-sm bg-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Описание</Label>
                <Input value={editRegion.description ?? ""} onChange={(e) => setEditRegion((p) => p ? { ...p, description: e.target.value } : p)} className="h-8 text-sm bg-input" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Широта центра *</Label>
                  <Input value={editRegion.centerLat} onChange={(e) => setEditRegion((p) => p ? { ...p, centerLat: e.target.value } : p)} className="h-8 text-sm bg-input" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Долгота центра *</Label>
                  <Input value={editRegion.centerLng} onChange={(e) => setEditRegion((p) => p ? { ...p, centerLng: e.target.value } : p)} className="h-8 text-sm bg-input" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Масштаб по умолчанию</Label>
                <Input value={editRegion.defaultZoom} onChange={(e) => setEditRegion((p) => p ? { ...p, defaultZoom: parseInt(e.target.value) || 13 } : p)} className="h-8 text-sm bg-input" type="number" min={1} max={20} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleUpdateRegion} disabled={updateRegion.isPending}>
                  {updateRegion.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditRegion(null)}>Отмена</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
