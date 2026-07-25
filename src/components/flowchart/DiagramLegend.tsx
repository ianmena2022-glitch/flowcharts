"use client";

import { ViewportPortal } from "@xyflow/react";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/flowchart/categories";
import { LANE_X_START } from "@/lib/flowchart/layout";
import type { NodeCategory } from "@/lib/flowchart/types";

export default function DiagramLegend({
  categoriesInUse,
  top,
}: {
  categoriesInUse: Set<NodeCategory>;
  top: number;
}) {
  const visible = CATEGORY_ORDER.filter((category) => categoriesInUse.has(category));

  if (visible.length === 0) return null;

  return (
    <ViewportPortal>
      <div
        style={{
          position: "absolute",
          left: LANE_X_START,
          top,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          background: "#ffffff",
          border: "1px solid #94a3b8",
          borderRadius: 6,
          padding: "8px 12px",
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
              <span style={{ fontSize: 11, color: "#334155" }}>{config.label}</span>
            </div>
          );
        })}
      </div>
    </ViewportPortal>
  );
}
