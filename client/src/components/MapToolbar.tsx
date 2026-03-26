import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MapTool } from "./FiberMap";
import {
  MousePointer2, Radio, CircleDot, Zap, Network, GitBranch,
  Cable, Building2, Minus,
} from "lucide-react";

interface MapToolbarProps {
  activeTool: MapTool;
  onToolChange: (tool: MapTool) => void;
  canEdit: boolean;
}

const TOOLS: {
  tool: MapTool;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}[] = [
  {
    tool: "select",
    label: "Выбор",
    shortLabel: "↖",
    icon: <MousePointer2 className="w-4 h-4" />,
    color: "#888",
    description: "Выбор и просмотр объектов",
  },
  {
    tool: "add_pole",
    label: "Опора",
    shortLabel: "ОП",
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
        <rect x="7" y="1" width="2" height="14" rx="1" />
        <rect x="3" y="4" width="10" height="1.5" rx="0.75" />
        <rect x="4" y="7" width="8" height="1.5" rx="0.75" />
      </svg>
    ),
    color: "#6b8cba",
    description: "Добавить опору",
  },
  {
    tool: "add_manhole",
    label: "Колодец",
    shortLabel: "КЛ",
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
        <rect x="2" y="2" width="12" height="12" rx="2" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="8" cy="8" r="3" />
      </svg>
    ),
    color: "#8b7355",
    description: "Добавить кабельный колодец",
  },
  {
    tool: "add_splice",
    label: "Муфта",
    shortLabel: "МФ",
    icon: (
      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
        <ellipse cx="8" cy="8" rx="6" ry="3.5" />
        <line x1="2" y1="8" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <line x1="14" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    color: "#e8a020",
    description: "Добавить оптическую муфту",
  },
  {
    tool: "add_node_trunk",
    label: "Узел магистр.",
    shortLabel: "УМ",
    icon: <Network className="w-4 h-4" />,
    color: "#e05c5c",
    description: "Добавить магистральный узел",
  },
  {
    tool: "add_node_district",
    label: "Узел районный",
    shortLabel: "УР",
    icon: <GitBranch className="w-4 h-4" />,
    color: "#4caf8a",
    description: "Добавить районный узел",
  },
  {
    tool: "add_cable",
    label: "Кабель",
    shortLabel: "КБ",
    icon: <Cable className="w-4 h-4" />,
    color: "#4a9eff",
    description: "Нарисовать кабельную трассу (двойной клик — завершить)",
  },
  {
    tool: "add_building",
    label: "Здание",
    shortLabel: "ЗД",
    icon: <Building2 className="w-4 h-4" />,
    color: "#9b7ec8",
    description: "Нарисовать контур здания (двойной клик — завершить)",
  },
];

export default function MapToolbar({ activeTool, onToolChange, canEdit }: MapToolbarProps) {
  return (
    <div className="flex flex-col gap-0.5 p-1.5 bg-card border border-border rounded-lg shadow-lg w-11">
      {TOOLS.map(({ tool, label, icon, color, description }) => {
        const isActive = activeTool === tool;
        const isDisabled = !canEdit && tool !== "select";

        return (
          <Tooltip key={tool}>
            <TooltipTrigger asChild>
              <button
                onClick={() => !isDisabled && onToolChange(tool)}
                disabled={isDisabled}
                className={`
                  relative w-8 h-8 rounded flex items-center justify-center
                  transition-all duration-150
                  ${isActive
                    ? "shadow-md scale-105"
                    : "hover:bg-accent"
                  }
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
      })}

      {/* Divider + hint */}
      <div className="border-t border-border mt-1 pt-1">
        <div className="text-center text-[8px] text-muted-foreground leading-tight px-0.5">
          {activeTool === "add_cable" || activeTool === "add_building"
            ? "2× клик"
            : activeTool === "select"
            ? "Клик"
            : "Клик"}
        </div>
      </div>
    </div>
  );
}
