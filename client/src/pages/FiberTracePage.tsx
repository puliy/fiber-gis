import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Search, ArrowRight, AlertCircle, MapPin } from "lucide-react";

type TraceInput = {
  cableId: number;
  moduleNumber: number;
  fiberNumber: number;
};

export default function FiberTracePage() {
  const [, navigate] = useLocation();
  const [input, setInput] = useState<Partial<TraceInput>>({});
  const [query, setQuery] = useState<TraceInput | null>(null);

  // Загружаем кабель по ID для отображения имени
  const { data: cableInfo } = trpc.cables.byId.useQuery(
    { id: input.cableId! },
    { enabled: !!input.cableId }
  );

  // Загружаем модули для выбранного кабеля через шаблон
  const { data: modules = [] } = trpc.cableModules.byTemplate.useQuery(
    { templateId: cableInfo?.templateId ?? 0 },
    { enabled: !!cableInfo?.templateId }
  );

  // Загружаем волокна для выбранного модуля
  const selectedModule = modules.find(m => m.moduleNumber === input.moduleNumber);
  const { data: fibers = [] } = trpc.cableModules.fibersByModule.useQuery(
    { moduleId: selectedModule?.id ?? 0 },
    { enabled: !!selectedModule?.id }
  );

  // Запрос трассировки
  const { data: hops = [], isLoading, error } = trpc.fiberTrace.trace.useQuery(
    query!,
    { enabled: !!query }
  );

  function handleTrace() {
    if (!input.cableId || !input.moduleNumber || !input.fiberNumber) return;
    setQuery({ cableId: input.cableId, moduleNumber: input.moduleNumber, fiberNumber: input.fiberNumber });
  }

  const totalLoss = hops.reduce((sum, h) => {
    const l = parseFloat(h.loss ?? "0");
    return sum + (isNaN(l) ? 0 : l);
  }, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Карта
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Трассировка волокна</h1>
            <p className="text-sm text-muted-foreground">
              Выберите кабель, модуль и волокно — система найдёт маршрут через все сварки
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Search form */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Параметры трассировки
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cable */}
            <div>
              <Label className="mb-1.5 block">Кабель</Label>
              <Input
                  type="number"
                  placeholder="ID кабеля"
                  value={input.cableId ?? ""}
                  onChange={e => setInput(d => ({ ...d, cableId: parseInt(e.target.value) || undefined, moduleNumber: undefined, fiberNumber: undefined }))}
                />
              {cableInfo && (
                <p className="text-xs text-muted-foreground mt-1">{cableInfo.name || `Кабель #${cableInfo.id}`}</p>
              )}
            </div>

            {/* Module */}
            <div>
              <Label className="mb-1.5 block">Модуль №</Label>
              {modules.length > 0 ? (
                <Select
                  value={input.moduleNumber?.toString() ?? ""}
                  onValueChange={v => setInput(d => ({ ...d, moduleNumber: parseInt(v), fiberNumber: undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите модуль..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map(m => (
                      <SelectItem key={m.id} value={m.moduleNumber.toString()}>
                        Модуль {m.moduleNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  placeholder="Номер модуля"
                  min={1}
                  value={input.moduleNumber ?? ""}
                  onChange={e => setInput(d => ({ ...d, moduleNumber: parseInt(e.target.value) || undefined, fiberNumber: undefined }))}
                />
              )}
            </div>

            {/* Fiber */}
            <div>
              <Label className="mb-1.5 block">Волокно №</Label>
              {fibers.length > 0 ? (
                <Select
                  value={input.fiberNumber?.toString() ?? ""}
                  onValueChange={v => setInput(d => ({ ...d, fiberNumber: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите волокно..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fibers.map(f => (
                      <SelectItem key={f.id} value={f.fiberNumber.toString()}>
                        Волокно {f.fiberNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  placeholder="Номер волокна"
                  min={1}
                  value={input.fiberNumber ?? ""}
                  onChange={e => setInput(d => ({ ...d, fiberNumber: parseInt(e.target.value) || undefined }))}
                />
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleTrace}
              disabled={!input.cableId || !input.moduleNumber || !input.fiberNumber || isLoading}
            >
              <Search className="w-4 h-4 mr-2" />
              {isLoading ? "Трассировка..." : "Трассировать"}
            </Button>
            {query && (
              <span className="text-sm text-muted-foreground">
                Кабель #{query.cableId}, Модуль {query.moduleNumber}, Волокно {query.fiberNumber}
              </span>
            )}
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Ошибка трассировки: {error.message}
          </div>
        )}

        {query && !isLoading && hops.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>Сварки для этого волокна не найдены.</p>
            <p className="text-sm mt-1">Убедитесь, что в муфтах заведены сварки с указанием кабеля, модуля и волокна.</p>
          </div>
        )}

        {hops.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{hops.length}</div>
                <div className="text-xs text-muted-foreground">сварок</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{totalLoss.toFixed(3)}</div>
                <div className="text-xs text-muted-foreground">дБ суммарно</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex-1 text-sm text-muted-foreground">
                Маршрут: Кабель {hops[0].cableAId ?? "?"} / М{hops[0].moduleANumber ?? "?"} / В{hops[0].fiberANumber ?? "?"}
                {" "}<ArrowRight className="inline w-3 h-3" />{" "}
                Кабель {hops[hops.length - 1].cableBId ?? "?"} / М{hops[hops.length - 1].moduleBNumber ?? "?"} / В{hops[hops.length - 1].fiberBNumber ?? "?"}
              </div>
            </div>

            {/* Hops table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Муфта</TableHead>
                    <TableHead>Сторона A</TableHead>
                    <TableHead className="w-8 text-center"></TableHead>
                    <TableHead>Сторона B</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Потери, дБ</TableHead>
                    <TableHead className="w-20 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hops.map((hop, idx) => (
                    <TableRow key={hop.closureId + "-" + idx} className="hover:bg-muted/20">
                      <TableCell className="text-muted-foreground font-mono text-sm">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{hop.closureName ?? `Муфта #${hop.closureId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {hop.cableAId != null ? (
                          <span>К{hop.cableAId} / М{hop.moduleANumber} / В{hop.fiberANumber}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        <ArrowRight className="w-3 h-3 inline" />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {hop.cableBId != null ? (
                          <span>К{hop.cableBId} / М{hop.moduleBNumber} / В{hop.fiberBNumber}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {hop.spliceType === "fusion" ? "Сварная" : hop.spliceType === "mechanical" ? "Механич." : hop.spliceType ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {hop.loss != null ? hop.loss : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => navigate(`/splice/${hop.closureId}`)}
                        >
                          Паспорт
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
