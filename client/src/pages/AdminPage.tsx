import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Users, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: users, refetch } = trpc.admin.users.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Роль обновлена"); refetch(); },
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

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                <Activity className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-2xl font-bold">{users?.filter((u) => u.role === "user").length ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Пользователей</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users table */}
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
                            borderColor: u.role === "admin" ? "#e05c5c" : u.role === "editor" ? "#4a9eff" : "#888",
                            color: u.role === "admin" ? "#e05c5c" : u.role === "editor" ? "#4a9eff" : "#888",
                          }}
                        >
                          {u.role === "admin" ? "Администратор" : u.role === "editor" ? "Редактор" : "Читатель"}
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
      </div>
    </div>
  );
}
