import { useRef, useState, useEffect, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MapTool } from "./FiberMap";
import {
  MousePointer2, Radio, CircleDot, Zap, Network, GitBranch,
  Cable, Building2, Pipette, Flag, Camera, Antenna, Plug,
  GripVertical,
} from "lucide-react";

interface MapToolbarProps {
  activeTool: MapTool;
  onToolChange: (tool: MapTool) => void;
  canEdit: boolean;
}

const TOOLS: {
  tool: MapTool;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  group?: "point" | "line" | "area";
}[] = [
  {
    tool: "select",
    label: "Выбор",
    icon: <MousePointer2 className="w-4 h-4" />,
    color: "#888",
    description: "Выбор и просмотр объектов",
    group: "point",
  },
  {
    tool: "add_pole",
    label: "Опора",
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
        <rect x="7" y="1" width="2" height="14" rx="1" />
        <rect x="3" y="4" width="10" height="1.5" rx="0.75" />
        <rect x="4" y="7" width="8" height="1.5" rx="0.75" />
      </svg>
    ),
    color: "#6b8cba",
    description: "Добавить опору",
    group: "point",
  },
  {
    tool: "add_manhole",
    label: "Колодец",
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
        <rect x="2" y="2" width="12" height="12" rx="2" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="8" cy="8" r="3" />
      </svg>
    ),
    color: "#8b7355",
    description: "Добавить кабельный колодец",
    group: "point",
  },
  {
    tool: "add_splice",
    label: "Муфта",
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
        <ellipse cx="8" cy="8" rx="6" ry="3.5" />
        <line x1="2" y1="8" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <line x1="14" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    color: "#e8a020",
    description: "Добавить оптическую муфту",
    group: "point",
  },
  {
    tool: "add_node_trunk",
    label: "Узел магистр.",
    icon: <Network className="w-4 h-4" />,
    color: "#e05c5c",
    description: "Добавить магистральный узел",
    group: "point",
  },
  {
    tool: "add_node_district",
    label: "Узел районный",
    icon: <GitBranch className="w-4 h-4" />,
    color: "#4caf8a",
    description: "Добавить районный узел",
    group: "point",
  },
  {
    tool: "add_mast" as MapTool,
    label: "Мачта",
    icon: <Antenna className="w-4 h-4" />,
    color: "#7a9e7e",
    description: "Добавить мачту",
    group: "point",
  },
  {
    tool: "add_entry_point" as MapTool,
    label: "Точка ввода",
    icon: <Plug className="w-4 h-4" />,
    color: "#9b7ec8",
    description: "Добавить точку ввода",
    group: "point",
  },
  {
    tool: "add_flag" as MapTool,
    label: "Флаг",
    icon: <Flag className="w-4 h-4" />,
    color: "#f0c040",
    description: "Добавить флаг / метку",
    group: "point",
  },
  {
    tool: "add_camera" as MapTool,
    label: "Камера",
    icon: <Camera className="w-4 h-4" />,
    color: "#60a0d0",
    description: "Добавить камеру",
    group: "point",
  },
  {
    tool: "add_cable",
    label: "Кабель",
    icon: <Cable className="w-4 h-4" />,
    color: "#4a9eff",
    description: "Нарисовать кабельную трассу (двойной клик — завершить)",
    group: "line",
  },
  {
    tool: "add_duct" as MapTool,
    label: "Канализация",
    icon: <Pipette className="w-4 h-4" />,
    color: "#a0d080",
    description: "Нарисовать кабельную канализацию (двойной клик — завершить)",
    group: "line",
  },
  {
    tool: "add_building",
    label: "Здание",
    icon: <Building2 className="w-4 h-4" />,
    color: "#9b7ec8",
    description: "Нарисовать контур здания (двойной клик — завершить)",
    group: "area",
  },
];

const STORAGE_KEY = "fiber-toolbar-pos";

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function MapToolbar({ activeTool, onToolChange, canEdit }: MapToolbarProps) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = loadPos();
    return saved ?? { x: 12, y: 80 };
  });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y));
      setPos({ x: newX, y: newY });
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        setPos((p) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
          return p;
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Group tools for display
  const pointTools = TOOLS.filter((t) => t.group === "point");
  const lineTools  = TOOLS.filter((t) => t.group === "line");
  const areaTools  = TOOLS.filter((t) => t.group === "area");

  const renderTool = ({ tool, label, icon, color, description }: typeof TOOLS[0]) => {
    const isActive   = activeTool === tool;
    const isDisabled = !canEdit && tool !== "select";
    return (
      <Tooltip key={tool}>
        <TooltipTrigger asChild>
          <button
            onClick={() => !isDisabled && onToolChange(tool)}
            disabled={isDisabled}
            className={`
              relative w-9 h-9 rounded-md flex items-center justify-center
              transition-all duration-150
              ${isActive ? "shadow-md scale-105" : "hover:bg-accent"}
              ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{
              backgroundColor: isActive ? color + "33" : undefined,
              color: isActive ? color : "oklch(0.65 0.01 240)",
            }}
          >
            {icon}
            {isActive && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                style={{ backgroundColor: color }}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="font-semibold text-xs">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {isDisabled && (
            <p className="text-xs text-destructive mt-1">Нет прав на редактирование</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 1100,
        userSelect: "none",
      }}
      className="bg-card border border-border rounded-lg shadow-lg flex flex-col gap-0 overflow-hidden"
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-center h-6 cursor-grab active:cursor-grabbing bg-muted/40 hover:bg-muted/70 transition-colors border-b border-border"
        title="Перетащить панель"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-0.5 p-1">
        {/* Pointer / point tools */}
        {pointTools.map(renderTool)}

        {/* Divider */}
        <div className="border-t border-border my-0.5" />

        {/* Line / area tools */}
        {lineTools.map(renderTool)}
        {areaTools.map(renderTool)}
      </div>

      {/* Bottom hint */}
      <div className="text-center text-[8px] text-muted-foreground leading-tight px-1 pb-1">
        {activeTool === "add_cable" || activeTool === "add_building" || activeTool === "add_duct"
          ? "2× клик — завершить"
          : activeTool === "select"
          ? "Клик — выбор"
          : "Клик — добавить"}
      </div>
    </div>
  );
}
