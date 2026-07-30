"use client";

import { useViewport } from "@xyflow/react";
import type { Lane, LaneOrientation } from "@/lib/flowchart/types";
import { laneMainStart, laneThickness } from "@/lib/flowchart/layout";

/**
 * Nombres de carril anclados al borde de la pantalla (no al lienzo): no se
 * pierden al scrollear horizontalmente el diagrama, solo se acomodan en
 * vertical/horizontal siguiendo el pan/zoom actual para seguir alineados
 * con su banda.
 */
export default function LaneLabelsOverlay({
  lanes,
  orientation,
}: {
  lanes: Lane[];
  orientation: LaneOrientation;
}) {
  const { x, y, zoom } = useViewport();
  const sorted = [...lanes].sort((a, b) => a.order - b.order);
  const isHorizontal = orientation === "horizontal";
  const panMain = isHorizontal ? y : x;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {sorted.map((lane, index) => {
        const start = laneMainStart(sorted, index) * zoom + panMain;
        const thicknessPx = laneThickness(lane) * zoom;
        return (
          <div
            key={lane.id}
            className="absolute flex items-center"
            style={
              isHorizontal
                ? { left: 0, top: start, height: thicknessPx, width: 220 }
                : { top: 0, left: start, width: thicknessPx, height: 40 }
            }
          >
            <span className="ml-1.5 max-w-full truncate rounded border border-slate-700 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 shadow-sm">
              {lane.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
