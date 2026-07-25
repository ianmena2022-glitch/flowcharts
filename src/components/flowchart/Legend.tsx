import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/flowchart/categories";
import type { NodeCategory } from "@/lib/flowchart/types";

export default function Legend({ categoriesInUse }: { categoriesInUse: Set<NodeCategory> }) {
  const visible = CATEGORY_ORDER.filter((category) => categoriesInUse.has(category));

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-[11px] shadow-sm">
      {visible.map((category) => {
        const config = CATEGORY_CONFIG[category];
        return (
          <div key={category} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border"
              style={{ backgroundColor: config.fill, borderColor: config.border }}
            />
            <span className="text-slate-600">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
