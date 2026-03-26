import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { LayerVisibility } from "./FiberMap";

interface LayerPanelProps {
  visibility: LayerVisibility;
  onChange: (key: keyof LayerVisibility, value: boolean) => void;
}

const LAYERS: { key: keyof LayerVisibility; label: string; color: string; description: string }[] = [
  { key: "nodes",      label: "Узлы",             color: "#e05c5c", description: "Магистральные и районные узлы" },
  { key: "poles",      label: "Опоры и прочее",   color: "#6b8cba", description: "Опоры, мачты, камеры, флаги" },
  { key: "manholes",   label: "Колодцы",          color: "#8b7355", description: "Кабельные колодцы" },
  { key: "splices",    label: "Муфты",            color: "#e8a020", description: "Сварочные муфты" },
  { key: "cables",     label: "Кабели",           color: "#4a9eff", description: "Кабельные трассы" },
  { key: "cableDucts", label: "Канализация",      color: "#a0d080", description: "Кабельная канализация" },
  { key: "buildings",  label: "Здания",           color: "#9b7ec8", description: "Контуры зданий" },
];

export default function LayerPanel({ visibility, onChange }: LayerPanelProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1">
        Слои
      </div>
      {LAYERS.map(({ key, label, color, description }) => (
        <div
          key={key}
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors group"
        >
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: color, opacity: visibility[key] ? 1 : 0.3 }}
          />
          <Label
            htmlFor={`layer-${key}`}
            className="flex-1 text-sm cursor-pointer select-none text-foreground"
            title={description}
          >
            {label}
          </Label>
          <Switch
            id={`layer-${key}`}
            checked={visibility[key]}
            onCheckedChange={(v) => onChange(key, v)}
            className="scale-75"
          />
        </div>
      ))}
    </div>
  );
}
