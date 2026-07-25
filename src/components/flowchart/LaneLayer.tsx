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
              borderTop: "1px solid #e2e8f0",
              borderBottom: "1px solid #e2e8f0",
              background: index % 2 === 0 ? "#fafafa" : "#f4f4f5",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 8,
                top: 8,
                fontSize: 11,
                fontWeight: 600,
                color: "#475569",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                padding: "2px 8px",
                whiteSpace: "nowrap",
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
