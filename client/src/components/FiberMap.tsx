import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type MapTool = "select" | "add_pole" | "add_manhole" | "add_splice" | "add_node_trunk" | "add_node_district" | "add_cable" | "add_building" | "add_duct" | "add_mast" | "add_entry_point" | "add_flag" | "add_camera";

export type LayerVisibility = {
  poles: boolean;
  manholes: boolean;
  splices: boolean;
  nodes: boolean;
  cables: boolean;
  buildings: boolean;
  cableDucts: boolean;
};

export type MapFilter = {
  statuses: Set<string>;
  pointTypes: Set<string>;
  cableStatuses: Set<string>;
};

interface FiberMapProps {
  regionId: number;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  activeTool: MapTool;
  layerVisibility: LayerVisibility;
  onObjectSelect: (type: string, id: number) => void;
  onObjectCreate: (type: string, data: unknown) => void;
  refreshTrigger?: number;
  /** Координаты маршрута трассировки волокна */
  traceCoords?: Array<{ lat: number; lng: number; label: string }>;
  /** Фильтр объектов на карте */
  mapFilter?: MapFilter;
}

// ─── Marker config ────────────────────────────────────────────────────────────

const MARKER_CONFIG: Record<string, { color: string; label: string; size: number }> = {
  pole:          { color: "#6b8cba", label: "ОП", size: 20 },
  manhole:       { color: "#8b7355", label: "КЛ", size: 22 },
  splice:        { color: "#e8a020", label: "МФ", size: 22 },
  mast:          { color: "#7a9e7e", label: "МЧ", size: 20 },
  entry_point:   { color: "#9b7ec8", label: "ТВ", size: 20 },
  node_district: { color: "#4caf8a", label: "УР", size: 26 },
  node_trunk:    { color: "#e05c5c", label: "УМ", size: 30 },
  flag:          { color: "#f0c040", label: "ФЛ", size: 18 },
  camera:        { color: "#60a0d0", label: "КМ", size: 18 },
  other:         { color: "#888888", label: "ОБ", size: 18 },
};

const STATUS_OPACITY: Record<string, number> = {
  fact: 1.0,
  plan: 0.6,
  dismantled: 0.3,
};

const CABLE_COLORS: Record<string, string> = {
  aerial:      "#4a9eff",
  underground: "#ff8c42",
  duct:        "#a0d080",
  building:    "#d080d0",
};

const CABLE_STATUS_DASH: Record<string, number[] | undefined> = {
  fact:       undefined,
  plan:       [8, 6],
  dismantled: [4, 8],
};

function createMarkerIcon(type: string, status: string): L.DivIcon {
  const cfg = MARKER_CONFIG[type] ?? MARKER_CONFIG.other;
  const opacity = STATUS_OPACITY[status] ?? 1;
  const s = cfg.size;
  return L.divIcon({
    className: "",
    html: `<div class="fiber-marker-icon" style="width:${s}px;height:${s}px;background:${cfg.color};opacity:${opacity};font-size:${Math.max(8, s * 0.38)}px">${cfg.label}</div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -s / 2],
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FiberMap({
  regionId,
  centerLat,
  centerLng,
  defaultZoom,
  activeTool,
  layerVisibility,
  onObjectSelect,
  onObjectCreate,
  refreshTrigger,
  traceCoords,
  mapFilter,
}: FiberMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    points: L.LayerGroup;
    cables: L.LayerGroup;
    buildings: L.LayerGroup;
    baseLayers: Record<string, L.TileLayer>;
  } | null>(null);
  const activeToolRef = useRef<MapTool>(activeTool);
  const onObjectCreateRef = useRef(onObjectCreate);
  useEffect(() => { onObjectCreateRef.current = onObjectCreate; }, [onObjectCreate]);
  const onObjectSelectRef = useRef(onObjectSelect);
  useEffect(() => { onObjectSelectRef.current = onObjectSelect; }, [onObjectSelect]);
  const cableDrawRef = useRef<{ points: L.LatLng[]; polyline: L.Polyline | null }>({ points: [], polyline: null });
  const traceLayerRef = useRef<L.LayerGroup | null>(null);
  const buildingDrawRef = useRef<{ points: L.LatLng[]; polygon: L.Polygon | null }>({ points: [], polygon: null });
  const ductDrawRef = useRef<{ points: L.LatLng[]; polyline: L.Polyline | null }>({ points: [], polyline: null });
  const [bounds, setBounds] = useState<{ minLat: number; minLng: number; maxLat: number; maxLng: number } | null>(null);

  // Data queries
  const { data: pointsData, refetch: refetchPoints } = trpc.mapPoints.inBounds.useQuery(
    bounds ? { regionId, ...bounds } : { regionId, minLat: centerLat - 0.05, minLng: centerLng - 0.05, maxLat: centerLat + 0.05, maxLng: centerLng + 0.05 },
    { enabled: true, staleTime: 0 }
  );
  const { data: cablesData, refetch: refetchCables } = trpc.cables.inBounds.useQuery(
    bounds ? { regionId, ...bounds } : { regionId, minLat: centerLat - 0.05, minLng: centerLng - 0.05, maxLat: centerLat + 0.05, maxLng: centerLng + 0.05 },
    { enabled: true, staleTime: 0 }
  );

  const { data: ductsData } = trpc.cableDucts.byRegion.useQuery(
    { regionId },
    { enabled: true, staleTime: 30000 }
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: defaultZoom,
      zoomControl: true,
      attributionControl: true,
      doubleClickZoom: false,
    });

    // Base layers
    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    });

    const osmHotLayer = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap HOT",
      maxZoom: 19,
    });

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "© Esri World Imagery", maxZoom: 19 }
    );

    const cartoLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { attribution: "© CARTO", maxZoom: 19 }
    );

    osmLayer.addTo(map);

    // Overlay layers
    const pointsLayer = L.layerGroup().addTo(map);
    const cablesLayer = L.layerGroup().addTo(map);
    const buildingsLayer = L.layerGroup().addTo(map);

    // Layer control
    L.control.layers(
      {
        "OpenStreetMap": osmLayer,
        "OSM Humanitarian": osmHotLayer,
        "Спутник (Esri)": satelliteLayer,
        "Тёмная (Carto)": cartoLayer,
      },
      {
        "Объекты": pointsLayer,
        "Кабели": cablesLayer,
        "Здания": buildingsLayer,
      },
      { position: "topright", collapsed: true }
    ).addTo(map);

    layersRef.current = {
      points: pointsLayer,
      cables: cablesLayer,
      buildings: buildingsLayer,
      baseLayers: { osm: osmLayer, satellite: satelliteLayer, carto: cartoLayer },
    };

    mapRef.current = map;

    // Update bounds on move
    const updateBounds = () => {
      const b = map.getBounds();
      setBounds({
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
      });
    };

    map.on("moveend", updateBounds);
    map.on("zoomend", updateBounds);
    updateBounds();

    // Map click handler
    map.on("click", (e: L.LeafletMouseEvent) => {
      const tool = activeToolRef.current;
      if (tool === "select") return;

      if (tool.startsWith("add_") && tool !== "add_cable" && tool !== "add_building" && tool !== "add_duct") {
        // Map tool name to point type
        const pointType = tool.replace("add_", "");
        onObjectCreateRef.current(pointType, { lat: e.latlng.lat, lng: e.latlng.lng });
      } else if (tool === "add_cable") {
        handleCableClick(e.latlng, map);
      } else if (tool === "add_building") {
        handleBuildingClick(e.latlng, map);
      } else if (tool === "add_duct") {
        handleDuctClick(e.latlng, map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync active tool ref
  useEffect(() => {
    activeToolRef.current = activeTool;
    if (mapRef.current) {
      mapRef.current.getContainer().style.cursor =
        activeTool === "select" ? "" : "crosshair";
    }
    // Cancel drawing on tool change
    if (activeTool !== "add_cable") cancelCableDraw();
    if (activeTool !== "add_building") cancelBuildingDraw();
    if (activeTool !== "add_duct") cancelDuctDraw();
  }, [activeTool]);

  // Re-center when region changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([centerLat, centerLng], defaultZoom);
    }
  }, [regionId, centerLat, centerLng, defaultZoom]);

  // Refresh on external trigger
  useEffect(() => {
    if (refreshTrigger) {
      refetchPoints();
      refetchCables();
    }
  }, [refreshTrigger]);

  // Render map points
  useEffect(() => {
    if (!layersRef.current || !pointsData) return;
    const layer = layersRef.current.points;
    layer.clearLayers();

    for (const pt of pointsData) {
      const cfg = MARKER_CONFIG[pt.type] ?? MARKER_CONFIG.other;
      const visible =
        (pt.type === "pole" && layerVisibility.poles) ||
        (pt.type === "manhole" && layerVisibility.manholes) ||
        (pt.type === "splice" && layerVisibility.splices) ||
        ((pt.type === "node_trunk" || pt.type === "node_district") && layerVisibility.nodes) ||
        (["mast", "entry_point", "flag", "camera", "other"].includes(pt.type) && layerVisibility.poles);

      if (!visible) continue;

      // Apply mapFilter
      if (mapFilter) {
        if (!mapFilter.statuses.has(pt.status ?? "fact")) continue;
        if (!mapFilter.pointTypes.has(pt.type)) continue;
      }

      const marker = L.marker([Number(pt.lat), Number(pt.lng)], {
        icon: createMarkerIcon(pt.type, pt.status),
        title: pt.name ?? pt.type,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onObjectSelectRef.current("map_point", pt.id);
      });

      marker.bindTooltip(
        `<div style="font-size:11px;line-height:1.4">
          <strong>${pt.name ?? cfg.label}</strong><br/>
          <span style="color:#aaa">${getTypeLabel(pt.type)} · ${getStatusLabel(pt.status)}</span>
        </div>`,
        { direction: "top", offset: [0, -cfg.size / 2] }
      );

      layer.addLayer(marker);
    }
  }, [pointsData, layerVisibility, mapFilter]);

  // Render cables
  useEffect(() => {
    if (!layersRef.current || !cablesData) return;
    const layer = layersRef.current.cables;
    layer.clearLayers();

    if (!layerVisibility.cables) return;

    for (const cable of cablesData) {
      // Apply mapFilter for cables
      if (mapFilter && !mapFilter.cableStatuses.has(cable.status ?? "fact")) continue;
      try {
        const route = (typeof cable.route === "string" ? JSON.parse(cable.route) : cable.route) as { lat: number; lng: number }[];
        if (!route || route.length < 2) continue;

        const latlngs = route.map((p) => [p.lat, p.lng] as [number, number]);
        const color = CABLE_COLORS[cable.layingType ?? "aerial"] ?? "#4a9eff";
        const dashArray = CABLE_STATUS_DASH[cable.status ?? "fact"];
        const opacity = STATUS_OPACITY[cable.status ?? "fact"];

        const polyline = L.polyline(latlngs, {
          color,
          weight: 3,
          opacity,
          dashArray: dashArray?.join(","),
        });

        polyline.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onObjectSelectRef.current("cable", cable.id);
        });

        polyline.bindTooltip(
          `<div style="font-size:11px;line-height:1.4">
            <strong>${cable.name ?? "Кабель"}</strong><br/>
            <span style="color:#aaa">${getLayingLabel(cable.layingType ?? "aerial")} · ${getStatusLabel(cable.status ?? "fact")}</span><br/>
            <span style="color:#aaa">L = ${cable.lengthCalc ? Math.round(Number(cable.lengthCalc)) + " м" : "—"}</span>
          </div>`,
          { sticky: true }
        );

        layer.addLayer(polyline);
      } catch {}
    }
  }, [cablesData, layerVisibility, mapFilter]);

  // ─── Cable Ducts layer ───────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ductsData) return;

    // Remove old duct layers
    map.eachLayer((l) => {
      if ((l as any)._isDuctLayer) map.removeLayer(l);
    });

    if (!layerVisibility.cableDucts) return;

    for (const duct of ductsData) {
      try {
        const route = (typeof duct.route === "string" ? JSON.parse(duct.route) : duct.route) as { lat: number; lng: number }[];
        if (!route || route.length < 2) continue;
        const latlngs = route.map((p) => [p.lat, p.lng] as [number, number]);
        const pl = L.polyline(latlngs, {
          color: "#a0d080",
          weight: 6,
          opacity: 0.7,
          dashArray: "12,4",
        }) as any;
        pl._isDuctLayer = true;
        pl.bindTooltip(
          `<div style="font-size:11px"><strong>${duct.name ?? "Канализация"}</strong><br/>Каналов: ${duct.capacity ?? 1} · ${duct.material ?? "plastic"}</div>`,
          { sticky: true }
        );
        pl.addTo(map);
      } catch {}
    }
  }, [ductsData, layerVisibility]);

  // ─── Trace polyline ───────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Удаляем старый слой
    if (traceLayerRef.current) {
      traceLayerRef.current.clearLayers();
    } else {
      traceLayerRef.current = L.layerGroup().addTo(map);
    }

    if (!traceCoords || traceCoords.length === 0) return;

    const layer = traceLayerRef.current;
    const latlngs = traceCoords.map((c) => [c.lat, c.lng] as [number, number]);

    // Линия маршрута
    L.polyline(latlngs, {
      color: "#f97316",
      weight: 4,
      opacity: 0.9,
      dashArray: undefined,
    }).addTo(layer);

    // Маркеры муфт
    traceCoords.forEach((c) => {
      L.circleMarker([c.lat, c.lng], {
        radius: 7,
        color: "#f97316",
        fillColor: "#fff",
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(c.label, { direction: "top", offset: [0, -8] })
        .addTo(layer);
    });

    // Центрируем карту по маршруту
    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 15);
    }
  }, [traceCoords]);

  // ─── Cable drawing ─────────────────────────────────────────────────────────

  const handleCableClick = useCallback((latlng: L.LatLng, map: L.Map) => {
    cableDrawRef.current.points.push(latlng);

    if (cableDrawRef.current.polyline) {
      cableDrawRef.current.polyline.remove();
    }

    cableDrawRef.current.polyline = L.polyline(
      cableDrawRef.current.points,
      { color: "#4a9eff", weight: 3, dashArray: "8,4", opacity: 0.8 }
    ).addTo(map);

    // Show finish hint after 2+ points
    if (cableDrawRef.current.points.length >= 2) {
      toast.info("Двойной клик — завершить кабель, Escape — отмена", { id: "cable-draw", duration: 3000 });
    }
  }, []);

  const finishCableDraw = useCallback(() => {
    const pts = cableDrawRef.current.points;
    if (pts.length >= 2) {
      onObjectCreate("cable", { route: pts.map((p) => ({ lat: p.lat, lng: p.lng })) });
    }
    cancelCableDraw();
  }, [onObjectCreate]);

  const cancelCableDraw = useCallback(() => {
    if (cableDrawRef.current.polyline) {
      cableDrawRef.current.polyline.remove();
      cableDrawRef.current.polyline = null;
    }
    cableDrawRef.current.points = [];
  }, []);

  // Double-click to finish cable
  useEffect(() => {
    if (!mapRef.current) return;
    const handler = () => {
      if (activeToolRef.current === "add_cable" && cableDrawRef.current.points.length >= 2) {
        finishCableDraw();
      }
    };
    mapRef.current.on("dblclick", handler);
    return () => { mapRef.current?.off("dblclick", handler); };
  }, [finishCableDraw]);

  // ─── Building drawing ──────────────────────────────────────────────────────

  const handleBuildingClick = useCallback((latlng: L.LatLng, map: L.Map) => {
    buildingDrawRef.current.points.push(latlng);

    if (buildingDrawRef.current.polygon) {
      buildingDrawRef.current.polygon.remove();
    }

    const pts = buildingDrawRef.current.points;
    if (pts.length >= 2) {
      // Show polygon preview from 2nd point onwards (closed)
      buildingDrawRef.current.polygon = L.polygon(
        pts,
        { color: "#9b7ec8", fillOpacity: 0.2, weight: 2, dashArray: "6,4" }
      ).addTo(map);
    } else {
      // First point — show a small circle marker as anchor
      buildingDrawRef.current.polygon = L.circleMarker(pts[0], {
        radius: 5, color: "#9b7ec8", fillColor: "#9b7ec8", fillOpacity: 0.8, weight: 2,
      }).addTo(map) as unknown as L.Polygon;
    }

    if (pts.length === 1) {
      toast.info("Кликайте для добавления вершин. Двойной клик — завершить здание", { id: "building-draw", duration: 4000 });
    } else if (pts.length >= 3) {
      toast.info(`Вершин: ${pts.length}. Двойной клик — завершить`, { id: "building-draw", duration: 2000 });
    }
  }, []);

  const finishBuildingDraw = useCallback(() => {
    const pts = buildingDrawRef.current.points;
    if (pts.length >= 3) {
      onObjectCreate("building", { polygon: pts.map((p) => ({ lat: p.lat, lng: p.lng })) });
    }
    cancelBuildingDraw();
  }, [onObjectCreate]);

  const cancelBuildingDraw = useCallback(() => {
    if (buildingDrawRef.current.polygon) {
      buildingDrawRef.current.polygon.remove();
      buildingDrawRef.current.polygon = null;
    }
    buildingDrawRef.current.points = [];
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const handler = () => {
      if (activeToolRef.current === "add_building" && buildingDrawRef.current.points.length >= 3) {
        finishBuildingDraw();
      }
    };
    mapRef.current.on("dblclick", handler);
    return () => { mapRef.current?.off("dblclick", handler); };
  }, [finishBuildingDraw]);

  // ─── Duct drawing ───────────────────────────────────────────────────────────────────────────────

  const handleDuctClick = useCallback((latlng: L.LatLng, map: L.Map) => {
    ductDrawRef.current.points.push(latlng);
    if (ductDrawRef.current.polyline) ductDrawRef.current.polyline.remove();
    ductDrawRef.current.polyline = L.polyline(
      ductDrawRef.current.points,
      { color: "#a0d080", weight: 6, dashArray: "12,4", opacity: 0.8 }
    ).addTo(map);
    if (ductDrawRef.current.points.length >= 2) {
      toast.info("Двойной клик — завершить канализацию, Escape — отмена", { id: "duct-draw", duration: 3000 });
    }
  }, []);

  const finishDuctDraw = useCallback(() => {
    const pts = ductDrawRef.current.points;
    if (pts.length >= 2) {
      onObjectCreate("duct", { route: pts.map((p) => ({ lat: p.lat, lng: p.lng })) });
    }
    cancelDuctDraw();
  }, [onObjectCreate]);

  const cancelDuctDraw = useCallback(() => {
    if (ductDrawRef.current.polyline) {
      ductDrawRef.current.polyline.remove();
      ductDrawRef.current.polyline = null;
    }
    ductDrawRef.current.points = [];
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const handler = () => {
      if (activeToolRef.current === "add_duct" && ductDrawRef.current.points.length >= 2) {
        finishDuctDraw();
      }
    };
    mapRef.current.on("dblclick", handler);
    return () => { mapRef.current?.off("dblclick", handler); };
  }, [finishDuctDraw]);

  // Escape to cancel drawing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelCableDraw();
        cancelBuildingDraw();
        cancelDuctDraw();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return <div ref={mapContainerRef} className="w-full h-full" />;
}

// ─── Label helpers ─────────────────────────────────────────────────────────────

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    pole: "Опора", manhole: "Колодец", splice: "Муфта", mast: "Мачта",
    entry_point: "Точка ввода", node_district: "Районный узел", node_trunk: "Магистральный узел",
    flag: "Флаг", camera: "Камера", other: "Прочее",
  };
  return labels[type] ?? type;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = { fact: "Факт", plan: "План", dismantled: "Демонтаж" };
  return labels[status] ?? status;
}

export function getLayingLabel(laying: string): string {
  const labels: Record<string, string> = {
    aerial: "Воздушный", underground: "Подземный", duct: "В канализации", building: "В здании",
  };
  return labels[laying] ?? laying;
}
