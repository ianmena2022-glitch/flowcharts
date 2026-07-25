"use client";

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

export type LabeledEdgeData = {
  label?: string;
  onLabelChange?: (edgeId: string, label: string) => void;
};

export type LabeledEdgeType = Edge<LabeledEdgeData, "labeled">;

export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected,
}: EdgeProps<LabeledEdgeType>) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data?.label ?? "");

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  function commit() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed !== (data?.label ?? "")) data?.onLabelChange?.(id, trimmed);
  }

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            pointerEvents: "all",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setValue(data?.label ?? "");
            setEditing(true);
          }}
        >
          {editing ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ width: Math.max(50, value.length * 7 + 16) }}
              className="rounded border border-slate-400 bg-white px-1.5 py-0.5 text-[10px] text-slate-900 outline-none"
            />
          ) : (
            <div
              className={
                data?.label
                  ? "cursor-text rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 shadow-sm"
                  : selected
                    ? "cursor-text rounded border border-dashed border-slate-400 bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-400"
                    : "cursor-text px-1.5 py-0.5 text-[10px] text-transparent"
              }
            >
              {data?.label || (selected ? "doble click para texto" : "·")}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
