import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { getTypeLabel } from "./FiberMap";

import type { MapFilter } from "./FiberMap";
export type { MapFilter };

export const DEFAULT_FILTER: MapFilter = {
  statuses: new Set(["fact", "plan", "dismantled"]),
  pointTypes: new Set(["pole", "manhole", "splice", "mast", "entry_point", "node_district", "node_trunk", "flag", "camera", "other"]),
  cableStatuses: new Set(["fact", "plan", "dismantled"]),
};

const POINT_TYPES = ["pole", "manhole", "splice", "mast", "entry_point", "node_district", "node_trunk", "flag", "camera", "other"];
const STATUSES = [
  { value: "fact", label: "Факт", color: "#4caf8a" },
  { value: "plan", label: "План", color: "#e8a020" },
  { value: "dismantled", label: "Демонтаж", color: "#888" },
];

interface FilterPanelProps {
  filter: MapFilter;
  onChange: (filter: MapFilter) => void;
  onClose: () => void;
}

export default function FilterPanel({ filter, onChange, onClose }: FilterPanelProps) {
  const isDefault =
    filter.statuses.size === 3 &&
    filter.pointTypes.size === POINT_TYPES.length &&
    filter.cableStatuses.size === 3;

  const toggleStatus = (val: string) => {
    const next = new Set(filter.statuses);
    if (next.has(val)) { if (next.size > 1) next.delete(val); } else next.add(val);
    onChange({ ...filter, statuses: next });
  };

  const toggleCableStatus = (val: string) => {
    const next = new Set(filter.cableStatuses);
    if (next.has(val)) { if (next.size > 1) next.delete(val); } else next.add(val);
    onChange({ ...filter, cableStatuses: next });
  };

  const toggleType = (val: string) => {
    const next = new Set(filter.pointTypes);
    if (next.has(val)) { if (next.size > 1) next.delete(val); } else next.add(val);
    onChange({ ...filter, pointTypes: next });
  };

  const reset = () => onChange({ ...DEFAULT_FILTER, statuses: new Set(DEFAULT_FILTER.statuses), pointTypes: new Set(DEFAULT_FILTER.pointTypes), cableStatuses: new Set(DEFAULT_FILTER.cableStatuses) });

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg w-64 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Filter className="w-3.5 h-3.5 text-primary" />
          Фильтр
        </div>
        <div className="flex items-center gap-1">
          {!isDefault && (
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 text-primary" onClick={reset}>
              Сбросить
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Point statuses */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Статус точек</div>
          <div className="flex flex-wrap gap-1">
            {STATUSES.map(({ value, label, color }) => {
              const active = filter.statuses.has(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleStatus(value)}
                  className="text-[11px] px-2 py-0.5 rounded-full border transition-all"
                  style={{
                    borderColor: active ? color : "#444",
                    color: active ? color : "#666",
                    backgroundColor: active ? color + "22" : "transparent",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cable statuses */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Статус кабелей</div>
          <div className="flex flex-wrap gap-1">
            {STATUSES.map(({ value, label, color }) => {
              const active = filter.cableStatuses.has(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleCableStatus(value)}
                  className="text-[11px] px-2 py-0.5 rounded-full border transition-all"
                  style={{
                    borderColor: active ? color : "#444",
                    color: active ? color : "#666",
                    backgroundColor: active ? color + "22" : "transparent",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Point types */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Типы точек</div>
            <div className="flex gap-1">
              <button className="text-[10px] text-primary hover:underline" onClick={() => onChange({ ...filter, pointTypes: new Set(POINT_TYPES) })}>Все</button>
              <span className="text-[10px] text-muted-foreground">/</span>
              <button className="text-[10px] text-primary hover:underline" onClick={() => onChange({ ...filter, pointTypes: new Set([POINT_TYPES[0]]) })}>Сбросить</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {POINT_TYPES.map((type) => {
              const active = filter.pointTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className="text-[11px] px-2 py-0.5 rounded-full border transition-all"
                  style={{
                    borderColor: active ? "#4a9eff" : "#444",
                    color: active ? "#4a9eff" : "#666",
                    backgroundColor: active ? "#4a9eff22" : "transparent",
                  }}
                >
                  {getTypeLabel(type)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active filter summary */}
        {!isDefault && (
          <div className="pt-1 border-t border-border">
            <div className="text-[10px] text-muted-foreground">
              Активен фильтр: {filter.statuses.size < 3 ? `статусы (${filter.statuses.size}/3)` : ""}{" "}
              {filter.pointTypes.size < POINT_TYPES.length ? `типы (${filter.pointTypes.size}/${POINT_TYPES.length})` : ""}
              {filter.cableStatuses.size < 3 ? ` кабели (${filter.cableStatuses.size}/3)` : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
