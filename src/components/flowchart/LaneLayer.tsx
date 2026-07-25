"use client";

import { ViewportPortal } from "@xyflow/react";
import type { Lane } from "@/lib/flowchart/types";
import { LANE_HEIGHT, LANE_WIDTH, LANE_X_START, laneTop } from "@/lib/flowchart/layout";

export default function LaneLayer({ lanes }: { lanes: Lane[] }) {
  const sorted = [...lanes].sort((a, b) => a.order - b.order);

  return (
    <ViewportPortal>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}>
        {sorted.map((lane, index) => (
          <div
            key={lane.id}
            style={{
              position: "absolute",
              left: LANE_X_START,
              top: laneTop(index),
              width: LANE_WIDTH,
              height: LANE_HEIGHT,
              borderTop: "2px solid #94a3b8",
              borderBottom: "2px solid #94a3b8",
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
        ))}
      </div>
    </ViewportPortal>
  );
}
