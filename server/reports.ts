/**
 * FiberGIS — генерация Excel-отчётов
 * Использует ExcelJS для создания структурированных таблиц
 */
import ExcelJS from "exceljs";
import { getDb } from "./db";
import {
  mapPoints, cables, buildings, spliceClosures, fiberSplices,
  opticalCrosses, activeEquipment, splitters,
} from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function styleHeader(ws: ExcelJS.Worksheet, row: number, cols: number) {
  const r = ws.getRow(row);
  for (let c = 1; c <= cols; c++) {
    const cell = r.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  }
  r.height = 28;
}

function styleDataRow(ws: ExcelJS.Worksheet, row: number, cols: number, even: boolean) {
  const r = ws.getRow(row);
  for (let c = 1; c <= cols; c++) {
    const cell = r.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: even ? "FFF5F8FF" : "FFFFFFFF" } };
    cell.font = { size: 9 };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "hair" }, bottom: { style: "hair" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  }
  r.height = 18;
}

function addTitle(ws: ExcelJS.Worksheet, title: string, cols: number) {
  ws.mergeCells(1, 1, 1, cols);
  const cell = ws.getCell("A1");
  cell.value = title;
  cell.font = { bold: true, size: 13, color: { argb: "FF1E3A5F" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, cols);
  ws.getCell("A2").value = `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;
  ws.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF666666" } };
  ws.getCell("A2").alignment = { horizontal: "right" };
  ws.getRow(2).height = 16;
}

// ─── Report: Infrastructure Summary ──────────────────────────────────────────

export async function generateInfrastructureReport(regionId: number): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [points, cableList, buildingList, equipment, splitterList] = await Promise.all([
    db.select().from(mapPoints).where(eq(mapPoints.regionId, regionId)),
    db.select().from(cables).where(eq(cables.regionId, regionId)),
    db.select().from(buildings).where(eq(buildings.regionId, regionId)),
    db.select().from(activeEquipment).where(eq(activeEquipment.regionId, regionId)),
    db.select().from(splitters).where(eq(splitters.regionId, regionId)),
  ]);

  // spliceClosures and opticalCrosses are linked via mapPointId
  const pointIds = points.map(p => p.id);
  const [closures, crosses] = await Promise.all([
    pointIds.length > 0
      ? db.select().from(spliceClosures).where(inArray(spliceClosures.mapPointId, pointIds))
      : Promise.resolve([]),
    pointIds.length > 0
      ? db.select().from(opticalCrosses).where(inArray(opticalCrosses.mapPointId, pointIds))
      : Promise.resolve([]),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "FiberGIS";
  wb.created = new Date();

  // ── Sheet 1: Сводка ────────────────────────────────────────────────────────
  const wsSummary = wb.addWorksheet("Сводка");
  wsSummary.columns = [
    { width: 35 }, { width: 18 },
  ];
  addTitle(wsSummary, `Сводный отчёт по инфраструктуре — Регион #${regionId}`, 2);

  wsSummary.getRow(3).values = ["Показатель", "Количество"];
  styleHeader(wsSummary, 3, 2);

  const summaryRows = [
    ["Точки инфраструктуры (всего)", points.length],
    ["  — Опоры", points.filter(p => p.type === "pole").length],
    ["  — Колодцы", points.filter(p => p.type === "manhole").length],
    ["  — Муфты (точки)", points.filter(p => p.type === "splice").length],
    ["  — Узловые точки", points.filter(p => p.type === "node_trunk" || p.type === "node_district").length],
    ["Кабельные трассы", cableList.length],
    ["Здания/сооружения", buildingList.length],
    ["Муфты (паспорта)", closures.length],
    ["Оптические кроссы", crosses.length],
    ["Активное оборудование", equipment.length],
    ["Сплиттеры", splitterList.length],
  ];

  summaryRows.forEach(([label, val], i) => {
    const r = wsSummary.getRow(4 + i);
    r.values = [label, val];
    styleDataRow(wsSummary, 4 + i, 2, i % 2 === 0);
    r.getCell(2).alignment = { horizontal: "center" };
  });

  // ── Sheet 2: Кабельные трассы ──────────────────────────────────────────────
  const wsCables = wb.addWorksheet("Кабельные трассы");
  wsCables.columns = [
    { width: 8 }, { width: 30 }, { width: 18 }, { width: 15 },
    { width: 12 }, { width: 20 }, { width: 30 },
  ];
  addTitle(wsCables, `Кабельные трассы — Регион #${regionId}`, 7);
  wsCables.getRow(3).values = ["№", "Наименование", "Тип прокладки", "Длина, м", "Волокон", "Статус", "Примечание"];
  styleHeader(wsCables, 3, 7);

  cableList.forEach((c, i) => {
    const r = wsCables.getRow(4 + i);
    r.values = [
      i + 1,
      c.name || `Кабель #${c.id}`,
      c.layingType || "—",
      c.lengthFact ? Number(c.lengthFact).toFixed(1) : (c.lengthCalc ? Number(c.lengthCalc).toFixed(1) : "—"),
      "—",
      c.status || "—",
      c.description || "",
    ];
    styleDataRow(wsCables, 4 + i, 7, i % 2 === 0);
    r.getCell(1).alignment = { horizontal: "center" };
    r.getCell(4).alignment = { horizontal: "right" };
    r.getCell(5).alignment = { horizontal: "center" };
  });

  // ── Sheet 3: Точки инфраструктуры ──────────────────────────────────────────
  const wsPoints = wb.addWorksheet("Точки");
  wsPoints.columns = [
    { width: 8 }, { width: 30 }, { width: 18 }, { width: 15 },
    { width: 15 }, { width: 20 }, { width: 30 },
  ];
  addTitle(wsPoints, `Точки инфраструктуры — Регион #${regionId}`, 7);
  wsPoints.getRow(3).values = ["№", "Наименование", "Тип", "Широта", "Долгота", "Статус", "Примечание"];
  styleHeader(wsPoints, 3, 7);

  const typeLabels: Record<string, string> = {
    pole: "Опора", manhole: "Колодец", splice: "Муфта",
    node_trunk: "Узел магистр.", node_district: "Узел районный",
  };

  points.forEach((p, i) => {
    const r = wsPoints.getRow(4 + i);
    r.values = [
      i + 1,
      p.name || `Точка #${p.id}`,
      typeLabels[p.type] || p.type,
      p.lat ? Number(p.lat).toFixed(6) : "—",
      p.lng ? Number(p.lng).toFixed(6) : "—",
      p.status || "—",
      p.description || "",
    ];
    styleDataRow(wsPoints, 4 + i, 7, i % 2 === 0);
    r.getCell(1).alignment = { horizontal: "center" };
  });

  // ── Sheet 4: Активное оборудование ────────────────────────────────────────
  const wsEquip = wb.addWorksheet("Оборудование");
  wsEquip.columns = [
    { width: 8 }, { width: 30 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 15 }, { width: 20 }, { width: 20 },
  ];
  addTitle(wsEquip, `Активное оборудование — Регион #${regionId}`, 8);
  wsEquip.getRow(3).values = ["№", "Наименование", "Тип", "Производитель", "Модель", "IP-адрес", "Серийный №", "Статус"];
  styleHeader(wsEquip, 3, 8);

  const equipTypeLabels: Record<string, string> = {
    OLT: "OLT", switch: "Коммутатор", media_converter: "Медиаконвертер",
    ONT: "ONT/ONU", splitter: "Сплиттер", amplifier: "Усилитель", other: "Прочее",
  };

  equipment.forEach((e, i) => {
    const r = wsEquip.getRow(4 + i);
    r.values = [
      i + 1,
      e.name,
      equipTypeLabels[e.equipType] || e.equipType,
      e.vendor || "—",
      e.model || "—",
      e.ipAddress || "—",
      e.serialNumber || "—",
      e.status || "—",
    ];
    styleDataRow(wsEquip, 4 + i, 8, i % 2 === 0);
    r.getCell(1).alignment = { horizontal: "center" };
  });

  // ── Sheet 5: Муфты и сварки ────────────────────────────────────────────────
  const wsSplices = wb.addWorksheet("Муфты");
  wsSplices.columns = [
    { width: 8 }, { width: 25 }, { width: 25 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 25 },
  ];
  addTitle(wsSplices, `Муфты и сварки — Регион #${regionId}`, 9);
  wsSplices.getRow(3).values = [
    "№", "Муфта", "Тип", "Кабель A", "Модуль A", "Волокно A",
    "Кабель B", "Волокно B", "Потери, дБ",
  ];
  styleHeader(wsSplices, 3, 9);

  // Получаем сварки для всех муфт региона
  const closureIds = closures.map(c => c.id);
  let allSplices: any[] = [];
  if (closureIds.length > 0) {
    allSplices = await db.select().from(fiberSplices).where(
      closureIds.length === 1
        ? eq(fiberSplices.closureId, closureIds[0])
        : eq(fiberSplices.closureId, closureIds[0]) // упрощённо — первая муфта
    );
    // Для всех муфт делаем отдельные запросы
    allSplices = [];
    for (const cid of closureIds) {
      const splicesForClosure = await db.select().from(fiberSplices).where(eq(fiberSplices.closureId, cid));
      const closure = closures.find(c => c.id === cid);
      allSplices.push(...splicesForClosure.map(s => ({ ...s, closureName: closure?.name || `Муфта #${cid}`, closureType: closure?.closureType || "—" })));
    }
  }

  allSplices.forEach((s, i) => {
    const r = wsSplices.getRow(4 + i);
    r.values = [
      i + 1,
      s.closureName,
      s.closureType,
      s.cableAId ? `Кабель #${s.cableAId}` : "—",
      s.moduleANumber || "—",
      s.fiberANumber || "—",
      s.cableBId ? `Кабель #${s.cableBId}` : "—",
      s.fiberBNumber || "—",
      s.loss ? Number(s.loss).toFixed(3) : "—",
    ];
    styleDataRow(wsSplices, 4 + i, 9, i % 2 === 0);
    r.getCell(1).alignment = { horizontal: "center" };
  });

  if (allSplices.length === 0) {
    wsSplices.getRow(4).values = ["", "Сварки не добавлены", "", "", "", "", "", "", ""];
    styleDataRow(wsSplices, 4, 9, true);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
