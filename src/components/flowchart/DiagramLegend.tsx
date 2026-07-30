"use client";

import { ViewportPortal } from "@xyflow/react";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/flowchart/categories";
import { legendPosition } from "@/lib/flowchart/layout";
import type { LaneOrientation, NodeCategory } from "@/lib/flowchart/types";

export default function DiagramLegend({
  categoriesInUse,
  mainOffset,
  orientation,
}: {
  categoriesInUse: Set<NodeCategory>;
  mainOffset: number;
  orientation: LaneOrientation;
}) {
  const visible = CATEGORY_ORDER.filter((category) => categoriesInUse.has(category));

  if (visible.length === 0) return null;

  const position = legendPosition(mainOffset, orientation);

  return (
    <ViewportPortal>
      <div
        style={{
          position: "absolute",
          left: position.left,
          top: position.top,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 6,
          padding: "8px 12px",
          boxShadow: "0 4px 16px -4px rgba(0,0,0,0.5)",
        }}
      >
        {visible.map((category) => {
          const config = CATEGORY_CONFIG[category];
          return (
            <div key={category} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: config.fill,
                  border: `1px solid ${config.border}`,
                }}
              />
              <span style={{ fontSize: 11, color: "#cbd5e1" }}>{config.label}</span>
            </div>
          );
        })}
      </div>
    </ViewportPortal>
  );
}
