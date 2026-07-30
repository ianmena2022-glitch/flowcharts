"use client";

import { ViewportPortal } from "@xyflow/react";
import type { FlowchartNode, Lane, LaneOrientation, Section } from "@/lib/flowchart/types";
import { laneLength, laneRect } from "@/lib/flowchart/layout";

export default function LaneLayer({
  lanes,
  sections,
  nodes,
  orientation,
}: {
  lanes: Lane[];
  sections: Section[];
  nodes: FlowchartNode[];
  orientation: LaneOrientation;
}) {
  const sorted = [...lanes].sort((a, b) => a.order - b.order);
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const length = laneLength(sortedSections, nodes, orientation);
  const isHorizontal = orientation === "horizontal";

  return (
    <ViewportPortal>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}>
        {sorted.map((lane, index) => {
          const rect = laneRect(sorted, index, orientation, length);
          return (
            <div
              key={lane.id}
              style={{
                position: "absolute",
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                borderBottom: isHorizontal ? "1px solid #e2e8f0" : undefined,
                borderRight: !isHorizontal ? "1px solid #e2e8f0" : undefined,
                background: index % 2 === 0 ? "transparent" : "rgba(100, 116, 139, 0.045)",
              }}
            />
          );
        })}
      </div>
    </ViewportPortal>
  );
}
