"use client";

import { ViewportPortal } from "@xyflow/react";
import type { Lane, LaneOrientation, Section } from "@/lib/flowchart/types";
import { sectionHeaderRect, sectionRect } from "@/lib/flowchart/layout";

export default function SectionLayer({
  sections,
  lanes,
  orientation,
}: {
  sections: Section[];
  lanes: Lane[];
  orientation: LaneOrientation;
}) {
  if (sections.length === 0) return null;

  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const sortedLanes = [...lanes].sort((a, b) => a.order - b.order);

  return (
    <ViewportPortal>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}>
        {sorted.map((section, index) => {
          const rect = sectionRect(sorted, index, orientation, sortedLanes);
          const header = sectionHeaderRect(sorted, index, orientation);
          return (
            <div key={section.id}>
              <div
                style={{
                  position: "absolute",
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  borderLeft: index > 0 ? "2px solid #64748b" : undefined,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: header.x,
                  top: header.y,
                  width: header.width,
                  height: header.height,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: index > 0 ? 12 : 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1e293b",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {section.label}
              </div>
            </div>
          );
        })}
      </div>
    </ViewportPortal>
  );
}
