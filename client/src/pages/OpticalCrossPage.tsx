import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, Link2, Unlink, Download } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Свободен", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  used: { label: "Занят", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  reserved: { label: "Резерв", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  faulty: { label: "Неисправен", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const SIDE_LABELS: Record<string, string> = {
  line: "Линейная",
  subscriber: "Абонентская",
};

const CONNECTOR_TYPES = ["SC", "LC", "FC", "ST", "E2000"] as const;

type PortDialogState = {
  open: boolean;
  portId?: number;
  portNumber: number;
  portSide: "line" | "subscriber";
  cableId: string;
  moduleNumber: string;
  fiberNumber: string;
  status: "free" | "used" | "reserved" | "faulty";
  notes: string;
};

type ConnDialogState = {
  open: boolean;
  connId?: number;
  portAId: string;
  portBId: string;
  connectorType: string;
  loss: string;
  notes: string;
};

export default function OpticalCrossPage() {
  const { id } = useParams<{ id: string }>();
  const crossId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "user";

  const utils = trpc.useUtils();

  const { data: cross, isLoading: crossLoading } = trpc.opticalCross.byId.useQuery(
    { id: crossId },
    { enabled: !!crossId }
  );
  const { data: ports = [], isLoading: portsLoading } = trpc.opticalCross.ports.useQuery(
    { crossId },
    { enabled: !!crossId }
  );
  const { data: connections = [] } = trpc.opticalCross.connections.useQuery(
    { crossId },
    { enabled: !!crossId }
  );
  const { data: fiberColors = [] } = trpc.fiberColors.list.useQuery();

  // ─── Port mutations ────────────────────────────────────────────────────────
  const upsertPort = trpc.opticalCross.upsertPort.useMutation({
    onSuccess: () => {
      utils.opticalCross.ports.invalidate({ crossId });
      setPortDialog(d => ({ ...d, open: false }));
      toast.success("Порт сохранён");
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePort = trpc.opticalCross.deletePort.useMutation({
    onSuccess: () => {
      utils.opticalCross.ports.invalidate({ crossId });
      utils.opticalCross.connections.invalidate({ crossId });
      toast.success("Порт удалён");
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Connection mutations ──────────────────────────────────────────────────
  const upsertConn = trpc.opticalCross.upsertConnection.useMutation({
    onSuccess: () => {
      utils.opticalCross.connections.invalidate({ crossId });
      setConnDialog(d => ({ ...d, open: false }));
      toast.success("Коммутация сохранена");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteConn = trpc.opticalCross.deleteConnection.useMutation({
    onSuccess: () => {
      utils.opticalCross.connections.invalidate({ crossId });
      toast.success("Коммутация удалена");
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Port dialog ───────────────────────────────────────────────────────────
  const emptyPort: PortDialogState = {
    open: false,
    portNumber: (ports.length || 0) + 1,
    portSide: "line",
    cableId: "",
    moduleNumber: "",
    fiberNumber: "",
    status: "free",
    notes: "",
  };
  const [portDialog, setPortDialog] = useState<PortDialogState>(emptyPort);

  function openPortDialog(port?: typeof ports[0]) {
    if (port) {
      setPortDialog({
        open: true,
        portId: port.id,
        portNumber: port.portNumber,
        portSide: (port.portSide ?? "line") as "line" | "subscriber",
        cableId: port.cableId?.toString() ?? "",
        moduleNumber: port.moduleNumber?.toString() ?? "",
        fiberNumber: port.fiberNumber?.toString() ?? "",
        status: (port.status ?? "free") as "free" | "used" | "reserved" | "faulty",
        notes: port.notes ?? "",
      });
    } else {
      setPortDialog({ ...emptyPort, open: true, portNumber: ports.length + 1 });
    }
  }

  function savePort() {
    upsertPort.mutate({
      id: portDialog.portId,
      crossId,
      portNumber: portDialog.portNumber,
      portSide: portDialog.portSide,
      cableId: portDialog.cableId ? parseInt(portDialog.cableId) : null,
      moduleNumber: portDialog.moduleNumber ? parseInt(portDialog.moduleNumber) : null,
      fiberNumber: portDialog.fiberNumber ? parseInt(portDialog.fiberNumber) : null,
      status: portDialog.status,
      notes: portDialog.notes || null,
    });
  }

  // ─── Connection dialog ─────────────────────────────────────────────────────
  const emptyConn: ConnDialogState = {
    open: false,
    portAId: "",
    portBId: "",
    connectorType: "SC",
    loss: "",
    notes: "",
  };
  const [connDialog, setConnDialog] = useState<ConnDialogState>(emptyConn);

  function openConnDialog(conn?: typeof connections[0]) {
    if (conn) {
      setConnDialog({
        open: true,
        connId: conn.id,
        portAId: conn.portAId.toString(),
        portBId: conn.portBId.toString(),
        connectorType: conn.connectorType ?? "SC",
        loss: conn.loss?.toString() ?? "",
        notes: conn.notes ?? "",
      });
    } else {
      setConnDialog({ ...emptyConn, open: true });
    }
  }

  function saveConn() {
    if (!connDialog.portAId || !connDialog.portBId) {
      toast.error("Выберите оба порта");
      return;
    }
    upsertConn.mutate({
      id: connDialog.connId,
      crossId,
      portAId: parseInt(connDialog.portAId),
      portBId: parseInt(connDialog.portBId),
      connectorType: connDialog.connectorType as typeof CONNECTOR_TYPES[number],
      loss: connDialog.loss || null,
      notes: connDialog.notes || null,
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function getPortLabel(portId: number) {
    const p = ports.find(p => p.id === portId);
    if (!p) return `Порт #${portId}`;
    return `Порт ${p.portNumber} (${SIDE_LABELS[p.portSide ?? "line"]})`;
  }

  const linePorts = ports.filter(p => p.portSide === "line");
  const subPorts = ports.filter(p => p.portSide === "subscriber");

  if (crossLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!cross) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <div className="text-muted-foreground text-lg">Кросс не найден</div>
        <Button variant="outline" onClick={() => navigate("/map")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> На карту
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/map")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Карта
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{cross.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <Badge variant="outline">{cross.crossType ?? "ODF"}</Badge>
              <span>{cross.portCount} портов</span>
              {cross.manufacturer && <span>{cross.manufacturer}</span>}
              {cross.model && <span>/ {cross.model}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => openPortDialog()}>
                <Plus className="w-4 h-4 mr-1" /> Добавить порт
              </Button>
            )}
          </div>
        </div>
        {cross.description && (
          <p className="mt-2 text-sm text-muted-foreground">{cross.description}</p>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Ports table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Порты кросса</h2>
            <span className="text-sm text-muted-foreground">
              {ports.length} / {cross.portCount} портов
            </span>
          </div>

          {portsLoading ? (
            <div className="text-muted-foreground text-sm">Загрузка портов...</div>
          ) : ports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              Порты не добавлены. {canEdit && "Нажмите «Добавить порт» чтобы начать."}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Line ports */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Линейные порты</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-16">№</TableHead>
                        <TableHead>Кабель / Модуль / Волокно</TableHead>
                        <TableHead>Статус</TableHead>
                        {canEdit && <TableHead className="w-20 text-right">Действия</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linePorts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground py-4">
                            Нет линейных портов
                          </TableCell>
                        </TableRow>
                      ) : linePorts.map(port => (
                        <TableRow key={port.id} className="hover:bg-muted/20">
                          <TableCell className="font-mono font-medium">{port.portNumber}</TableCell>
                          <TableCell className="text-sm">
                            {port.cableId ? (
                              <span className="text-foreground">
                                К{port.cableId}
                                {port.moduleNumber != null && ` / М${port.moduleNumber}`}
                                {port.fiberNumber != null && ` / В${port.fiberNumber}`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${STATUS_LABELS[port.status ?? "free"]?.color}`}
                            >
                              {STATUS_LABELS[port.status ?? "free"]?.label}
                            </Badge>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openPortDialog(port)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm(`Удалить порт ${port.portNumber}?`)) {
                                      deletePort.mutate({ id: port.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Subscriber ports */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Абонентские порты</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-16">№</TableHead>
                        <TableHead>Кабель / Модуль / Волокно</TableHead>
                        <TableHead>Статус</TableHead>
                        {canEdit && <TableHead className="w-20 text-right">Действия</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subPorts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground py-4">
                            Нет абонентских портов
                          </TableCell>
                        </TableRow>
                      ) : subPorts.map(port => (
                        <TableRow key={port.id} className="hover:bg-muted/20">
                          <TableCell className="font-mono font-medium">{port.portNumber}</TableCell>
                          <TableCell className="text-sm">
                            {port.cableId ? (
                              <span>
                                К{port.cableId}
                                {port.moduleNumber != null && ` / М${port.moduleNumber}`}
                                {port.fiberNumber != null && ` / В${port.fiberNumber}`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${STATUS_LABELS[port.status ?? "free"]?.color}`}
                            >
                              {STATUS_LABELS[port.status ?? "free"]?.label}
                            </Badge>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openPortDialog(port)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm(`Удалить порт ${port.portNumber}?`)) {
                                      deletePort.mutate({ id: port.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Connections table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Коммутации (патч-корды)</h2>
            {canEdit && ports.length >= 2 && (
              <Button size="sm" variant="outline" onClick={() => openConnDialog()}>
                <Link2 className="w-4 h-4 mr-1" /> Добавить коммутацию
              </Button>
            )}
          </div>

          {connections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              Коммутации не добавлены.{" "}
              {canEdit && ports.length >= 2
                ? "Нажмите «Добавить коммутацию» чтобы связать порты."
                : canEdit && "Сначала добавьте хотя бы 2 порта."}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Линейный порт</TableHead>
                    <TableHead>Абонентский порт</TableHead>
                    <TableHead>Разъём</TableHead>
                    <TableHead>Потери, дБ</TableHead>
                    <TableHead>Примечание</TableHead>
                    {canEdit && <TableHead className="w-20 text-right">Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map(conn => (
                    <TableRow key={conn.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{getPortLabel(conn.portAId)}</TableCell>
                      <TableCell>{getPortLabel(conn.portBId)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{conn.connectorType ?? "SC"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {conn.loss != null ? `${conn.loss}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conn.notes ?? "—"}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openConnDialog(conn)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Удалить коммутацию?")) {
                                  deleteConn.mutate({ id: conn.id });
                                }
                              }}
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      {/* Port Dialog */}
      <Dialog open={portDialog.open} onOpenChange={o => setPortDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{portDialog.portId ? "Редактировать порт" : "Добавить порт"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Номер порта</Label>
                <Input
                  type="number"
                  min={1}
                  value={portDialog.portNumber}
                  onChange={e => setPortDialog(d => ({ ...d, portNumber: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Сторона</Label>
                <Select
                  value={portDialog.portSide}
                  onValueChange={v => setPortDialog(d => ({ ...d, portSide: v as "line" | "subscriber" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Линейная</SelectItem>
                    <SelectItem value="subscriber">Абонентская</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>ID кабеля</Label>
                <Input
                  type="number"
                  placeholder="—"
                  value={portDialog.cableId}
                  onChange={e => setPortDialog(d => ({ ...d, cableId: e.target.value }))}
                />
              </div>
              <div>
                <Label>Модуль №</Label>
                <Input
                  type="number"
                  placeholder="—"
                  value={portDialog.moduleNumber}
                  onChange={e => setPortDialog(d => ({ ...d, moduleNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label>Волокно №</Label>
                <Input
                  type="number"
                  placeholder="—"
                  value={portDialog.fiberNumber}
                  onChange={e => setPortDialog(d => ({ ...d, fiberNumber: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Статус</Label>
              <Select
                value={portDialog.status}
                onValueChange={v => setPortDialog(d => ({ ...d, status: v as typeof portDialog.status }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Примечание</Label>
              <Input
                placeholder="Необязательно"
                value={portDialog.notes}
                onChange={e => setPortDialog(d => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortDialog(d => ({ ...d, open: false }))}>
              Отмена
            </Button>
            <Button onClick={savePort} disabled={upsertPort.isPending}>
              {upsertPort.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connection Dialog */}
      <Dialog open={connDialog.open} onOpenChange={o => setConnDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{connDialog.connId ? "Редактировать коммутацию" : "Добавить коммутацию"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Линейный порт (A)</Label>
              <Select
                value={connDialog.portAId}
                onValueChange={v => setConnDialog(d => ({ ...d, portAId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите порт..." />
                </SelectTrigger>
                <SelectContent>
                  {linePorts.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      Порт {p.portNumber} — {STATUS_LABELS[p.status ?? "free"]?.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Абонентский порт (B)</Label>
              <Select
                value={connDialog.portBId}
                onValueChange={v => setConnDialog(d => ({ ...d, portBId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите порт..." />
                </SelectTrigger>
                <SelectContent>
                  {subPorts.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      Порт {p.portNumber} — {STATUS_LABELS[p.status ?? "free"]?.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип разъёма</Label>
                <Select
                  value={connDialog.connectorType}
                  onValueChange={v => setConnDialog(d => ({ ...d, connectorType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONNECTOR_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Потери, дБ</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={connDialog.loss}
                  onChange={e => setConnDialog(d => ({ ...d, loss: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Примечание</Label>
              <Input
                placeholder="Необязательно"
                value={connDialog.notes}
                onChange={e => setConnDialog(d => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnDialog(d => ({ ...d, open: false }))}>
              Отмена
            </Button>
            <Button onClick={saveConn} disabled={upsertConn.isPending}>
              {upsertConn.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
