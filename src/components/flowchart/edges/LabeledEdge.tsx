"use client";

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

type NodeRect = { x: number; y: number; width: number; height: number };

export type LabeledEdgeData = {
  label?: string;
  onLabelChange?: (edgeId: string, label: string) => void;
  /** Rectángulo real del nodo origen/destino y en qué fracción de su lado
   * (0-1) engancha este edge en particular — así, cuando varios edges
   * comparten el mismo lado de un nodo, se reparten en vez de salir todos
   * del mismo punto. Lo calcula FlowchartEditor, que tiene la lista
   * completa de edges/nodos. */
  sourceRect?: NodeRect | null;
  targetRect?: NodeRect | null;
  sourceFraction?: number;
  targetFraction?: number;
};

export type LabeledEdgeType = Edge<LabeledEdgeData, "labeled">;

function pointOnRect(rect: NodeRect, position: Position, fraction: number) {
  switch (position) {
    case Position.Left:
      return { x: rect.x, y: rect.y + rect.height * fraction };
    case Position.Right:
      return { x: rect.x + rect.width, y: rect.y + rect.height * fraction };
    case Position.Top:
      return { x: rect.x + rect.width * fraction, y: rect.y };
    case Position.Bottom:
      return { x: rect.x + rect.width * fraction, y: rect.y + rect.height };
    default:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
}

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

  const source = data?.sourceRect
    ? pointOnRect(data.sourceRect, sourcePosition, data.sourceFraction ?? 0.5)
    : { x: sourceX, y: sourceY };
  const target = data?.targetRect
    ? pointOnRect(data.targetRect, targetPosition, data.targetFraction ?? 0.5)
    : { x: targetX, y: targetY };

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: source.x,
    sourceY: source.y,
    sourcePosition,
    targetX: target.x,
    targetY: target.y,
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
