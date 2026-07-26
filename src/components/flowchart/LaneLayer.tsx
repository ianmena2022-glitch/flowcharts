"use client";

import { ViewportPortal } from "@xyflow/react";
import type { Lane, LaneOrientation } from "@/lib/flowchart/types";
import { laneRect } from "@/lib/flowchart/layout";

export default function LaneLayer({
  lanes,
  orientation,
}: {
  lanes: Lane[];
  orientation: LaneOrientation;
}) {
  const sorted = [...lanes].sort((a, b) => a.order - b.order);
  const isHorizontal = orientation === "horizontal";

  return (
    <ViewportPortal>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}>
        {sorted.map((lane, index) => {
          const rect = laneRect(index, orientation);
          return (
            <div
              key={lane.id}
              style={{
                position: "absolute",
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                borderTop: isHorizontal ? "2px solid #94a3b8" : undefined,
                borderBottom: isHorizontal ? "2px solid #94a3b8" : undefined,
                borderLeft: !isHorizontal ? "2px solid #94a3b8" : undefined,
                borderRight: !isHorizontal ? "2px solid #94a3b8" : undefined,
                background: index % 2 === 0 ? "#ffffff" : "#dbe3ee",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  top: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#1e293b",
                  background: "#ffffff",
                  border: "1px solid #94a3b8",
                  borderLeft: "4px solid #475569",
                  borderRadius: 4,
                  padding: "2px 10px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                }}
              >
                {lane.label}
              </div>
            </div>
          );
        })}
      </div>
    </ViewportPortal>
  );
}
