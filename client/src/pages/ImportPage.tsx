import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Alert, AlertDescription, AlertTitle,
} from "@/components/ui/alert";
import {
  ArrowLeft, Upload, Download, CheckCircle2, XCircle, AlertTriangle,
  FileSpreadsheet, Loader2, Map,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

// ─── Types ────────────────────────────────────────────────────────────────────

const VALID_TYPES = [
  "pole", "manhole", "splice", "mast", "entry_point",
  "node_district", "node_trunk", "flag", "camera", "other",
] as const;

const VALID_STATUSES = ["plan", "fact", "dismantled"] as const;

const TYPE_LABELS: Record<string, string> = {
  pole: "Опора", manhole: "Колодец", splice: "Муфта", mast: "Мачта",
  entry_point: "Ввод", node_district: "Узел рай.", node_trunk: "Узел маг.",
  flag: "Флаг", camera: "Камера", other: "Прочее",
};

interface ImportRow {
  index: number;
  name?: string;
  type: string;
  lat: number;
  lng: number;
  address?: string;
  status: string;
  description?: string;
  // validation
  valid: boolean;
  errors: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateRow(raw: Record<string, unknown>, index: number): ImportRow {
  const errors: string[] = [];

  const type = String(raw["type"] ?? raw["тип"] ?? "").toLowerCase().trim();
  const lat = parseFloat(String(raw["lat"] ?? raw["широта"] ?? ""));
  const lng = parseFloat(String(raw["lng"] ?? raw["долгота"] ?? ""));
  const name = String(raw["name"] ?? raw["название"] ?? "").trim() || undefined;
  const address = String(raw["address"] ?? raw["адрес"] ?? "").trim() || undefined;
  const statusRaw = String(raw["status"] ?? raw["статус"] ?? "fact").toLowerCase().trim();
  const description = String(raw["description"] ?? raw["описание"] ?? "").trim() || undefined;

  if (!VALID_TYPES.includes(type as any)) {
    errors.push(`Неизвестный тип "${type}". Допустимые: ${VALID_TYPES.join(", ")}`);
  }
  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push(`Некорректная широта: "${raw["lat"] ?? raw["широта"]}"`);
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    errors.push(`Некорректная долгота: "${raw["lng"] ?? raw["долгота"]}"`);
  }

  const status = VALID_STATUSES.includes(statusRaw as any) ? statusRaw : "fact";

  return {
    index,
    name,
    type: VALID_TYPES.includes(type as any) ? type : "other",
    lat: isNaN(lat) ? 0 : lat,
    lng: isNaN(lng) ? 0 : lng,
    address,
    status,
    description,
    valid: errors.length === 0,
    errors,
  };
}

function parseFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data as Record<string, unknown>[]),
        error: (err) => reject(err),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reject(new Error("Поддерживаются только .xlsx, .xls, .csv"));
    }
  });
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["name", "type", "lat", "lng", "address", "status", "description"],
    ["Опора №1", "pole", "51.672", "39.212", "ул. Ленина, 1", "fact", ""],
    ["Колодец К-5", "manhole", "51.673", "39.215", "ул. Мира, 5", "fact", ""],
    ["Муфта МОГ-Т", "splice", "51.670", "39.210", "", "fact", "96 волокон"],
    ["Узел ОП-1", "node_trunk", "51.675", "39.220", "ул. Победы, 10", "fact", ""],
  ]);

  // Задаём ширину колонок
  ws["!cols"] = [
    { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
    { wch: 25 }, { wch: 12 }, { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Объекты");

  // Лист с типами
  const wsTypes = XLSX.utils.aoa_to_sheet([
    ["Тип (type)", "Описание"],
    ["pole", "Опора"],
    ["manhole", "Колодец"],
    ["splice", "Муфта"],
    ["mast", "Мачта"],
    ["entry_point", "Ввод в здание"],
    ["node_district", "Районный узел"],
    ["node_trunk", "Магистральный узел"],
    ["flag", "Флаг / метка"],
    ["camera", "Камера"],
    ["other", "Прочее"],
    [],
    ["Статус (status)", "Описание"],
    ["fact", "Факт (по умолчанию)"],
    ["plan", "Проект"],
    ["dismantled", "Демонтировано"],
  ]);
  wsTypes["!cols"] = [{ wch: 18 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsTypes, "Справочник");

  XLSX.writeFile(wb, "fibergis_import_template.xlsx");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: regions } = trpc.regions.list.useQuery();
  const importBatch = trpc.mapPoints.importBatch.useMutation();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const canEdit = user?.role === "admin" || user?.role === "user";

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setImportResult(null);
    try {
      const raw = await parseFile(file);
      const validated = raw.map((r, i) => validateRow(r, i));
      setRows(validated);
      const invalid = validated.filter((r) => !r.valid).length;
      if (invalid > 0) {
        toast.warning(`Найдено ${invalid} строк с ошибками — они будут пропущены при импорте`);
      } else {
        toast.success(`Загружено ${validated.length} строк — все корректны`);
      }
    } catch (err: any) {
      toast.error(`Ошибка чтения файла: ${err.message}`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!selectedRegionId) {
      toast.error("Выберите регион для импорта");
      return;
    }
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error("Нет корректных строк для импорта");
      return;
    }

    setImporting(true);
    try {
      const result = await importBatch.mutateAsync({
        regionId: parseInt(selectedRegionId),
        rows: validRows.map((r) => ({
          name: r.name,
          type: r.type as any,
          lat: r.lat,
          lng: r.lng,
          address: r.address,
          status: r.status as any,
          description: r.description,
        })),
      });
      setImportResult(result);
      toast.success(`Импортировано ${result.created} объектов`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} объектов не удалось создать`);
      }
    } catch (err: any) {
      toast.error(`Ошибка импорта: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
          <Map className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm">FiberGIS</span>
        <span className="text-muted-foreground text-sm">/ Импорт объектов</span>
      </header>

      <div className="flex-1 container max-w-5xl py-6 space-y-6">

        {/* Top actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Импорт объектов из Excel / CSV</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Загрузите файл с координатами и типами объектов для массового добавления на карту
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Скачать шаблон
          </Button>
        </div>

        {!canEdit && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Недостаточно прав</AlertTitle>
            <AlertDescription>
              Импорт доступен только пользователям с ролью редактора или администратора.
            </AlertDescription>
          </Alert>
        )}

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          {fileName ? (
            <div>
              <p className="font-medium">{fileName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {rows.length} строк загружено
                {invalidCount > 0 && (
                  <span className="text-destructive ml-2">· {invalidCount} с ошибками</span>
                )}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium">Перетащите файл или нажмите для выбора</p>
              <p className="text-sm text-muted-foreground mt-1">Поддерживаются .xlsx, .xls, .csv</p>
            </div>
          )}
        </div>

        {/* Region selector + import button */}
        {rows.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите регион..." />
                </SelectTrigger>
                <SelectContent>
                  {regions?.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleImport}
              disabled={importing || !canEdit || validCount === 0 || !selectedRegionId}
              className="min-w-[160px]"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Импорт...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Импортировать {validCount} объектов</>
              )}
            </Button>
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <Alert className={importResult.failed === 0 ? "border-green-500/50 bg-green-500/10" : "border-yellow-500/50 bg-yellow-500/10"}>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <AlertTitle>Импорт завершён</AlertTitle>
            <AlertDescription>
              Создано: <strong>{importResult.created}</strong> объектов.
              {importResult.failed > 0 && (
                <span className="text-destructive ml-2">Ошибок: {importResult.failed}</span>
              )}
              <Button
                variant="link"
                size="sm"
                className="ml-3 h-auto p-0"
                onClick={() => navigate("/")}
              >
                Открыть карту →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-semibold text-sm">Предпросмотр данных</h2>
              <Badge variant="outline">{rows.length} строк</Badge>
              {validCount > 0 && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {validCount} корректных
                </Badge>
              )}
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  {invalidCount} с ошибками
                </Badge>
              )}
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Широта</TableHead>
                      <TableHead>Долгота</TableHead>
                      <TableHead>Адрес</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 500).map((row) => (
                      <TableRow
                        key={row.index}
                        className={row.valid ? "" : "bg-destructive/5"}
                      >
                        <TableCell className="text-muted-foreground text-xs">{row.index + 1}</TableCell>
                        <TableCell className="text-sm">{row.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[row.type] ?? row.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{row.lat || <span className="text-destructive">!</span>}</TableCell>
                        <TableCell className="text-xs font-mono">{row.lng || <span className="text-destructive">!</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.address ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              row.status === "fact" ? "border-green-500/40 text-green-400" :
                              row.status === "plan" ? "border-blue-500/40 text-blue-400" :
                              "border-gray-500/40 text-gray-400"
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <div title={row.errors.join("\n")}>
                              <XCircle className="w-4 h-4 text-destructive" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 500 && (
                <div className="text-center py-2 text-xs text-muted-foreground border-t border-border">
                  Показано 500 из {rows.length} строк
                </div>
              )}
            </div>

            {/* Errors list */}
            {invalidCount > 0 && (
              <div className="mt-3 space-y-1">
                {rows.filter((r) => !r.valid).slice(0, 10).map((r) => (
                  <div key={r.index} className="text-xs text-destructive flex gap-2">
                    <span className="font-mono">Строка {r.index + 1}:</span>
                    <span>{r.errors.join("; ")}</span>
                  </div>
                ))}
                {invalidCount > 10 && (
                  <p className="text-xs text-muted-foreground">...и ещё {invalidCount - 10} ошибок</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {rows.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-5 space-y-3">
            <h3 className="font-semibold text-sm">Формат файла</h3>
            <p className="text-sm text-muted-foreground">
              Файл должен содержать строку заголовков. Поддерживаются как английские, так и русские названия колонок.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Колонка</TableHead>
                    <TableHead>Рус. вариант</TableHead>
                    <TableHead>Обязательная</TableHead>
                    <TableHead>Описание</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["name", "название", "—", "Название объекта"],
                    ["type", "тип", "✓", "Тип объекта (pole, manhole, splice, node_trunk, ...)"],
                    ["lat", "широта", "✓", "Широта (десятичные градусы, напр. 51.672)"],
                    ["lng", "долгота", "✓", "Долгота (десятичные градусы, напр. 39.212)"],
                    ["address", "адрес", "—", "Адрес объекта"],
                    ["status", "статус", "—", "fact / plan / dismantled (по умолчанию: fact)"],
                    ["description", "описание", "—", "Произвольное описание"],
                  ].map(([col, rus, req, desc]) => (
                    <TableRow key={col}>
                      <TableCell className="font-mono text-xs">{col}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{rus}</TableCell>
                      <TableCell className="text-center">{req}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{desc}</TableCell>
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
