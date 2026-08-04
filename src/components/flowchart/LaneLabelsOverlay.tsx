"use client";

import { useViewport } from "@xyflow/react";
import type { Lane, LaneOrientation } from "@/lib/flowchart/types";
import { laneMainStart, laneThickness } from "@/lib/flowchart/layout";
import { LANE_LABEL_GUTTER } from "@/lib/flowchart/export";

/** Ancho máximo del badge de nombre de carril, para que no ocupe media
 * pantalla — pasado ese ancho, el texto pasa a la línea siguiente en vez
 * de cortarse. */
const LABEL_MAX_WIDTH = LANE_LABEL_GUTTER - 20;

/**
 * Nombres de carril anclados al borde de la pantalla (no al lienzo): no se
 * pierden al scrollear horizontalmente el diagrama, solo se acomodan en
 * vertical/horizontal siguiendo el pan/zoom actual para seguir alineados
 * con su banda. El texto completo nunca se corta: si no entra en una
 * línea, pasa a una segunda (o tercera, si hace falta).
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
            className={isHorizontal ? "absolute flex items-center" : "absolute flex items-start"}
            style={
              isHorizontal
                ? { left: 0, top: start, height: thicknessPx, width: LABEL_MAX_WIDTH + 12 }
                : { top: 0, left: start, width: thicknessPx, paddingTop: 4 }
            }
          >
            <span
              className="ml-1.5 rounded border border-slate-700 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-300 shadow-sm"
              style={{ maxWidth: LABEL_MAX_WIDTH, whiteSpace: "normal", wordBreak: "break-word" }}
            >
              {lane.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
