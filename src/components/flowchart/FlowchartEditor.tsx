"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Panel,
  addEdge,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type OnNodeDrag,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ActivityNode from "./nodes/ActivityNode";
import DecisionNode from "./nodes/DecisionNode";
import TerminalNode from "./nodes/TerminalNode";
import LaneLayer from "./LaneLayer";
import Legend from "./Legend";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/flowchart/categories";
import { LANE_HEIGHT, laneTop, laneCenter } from "@/lib/flowchart/layout";
import type { FlowchartData, FlowchartNode, Lane, NodeCategory } from "@/lib/flowchart/types";

const nodeTypes = {
  activity: ActivityNode,
  decision: DecisionNode,
  terminal: TerminalNode,
};

function nextLaneOrder(lanes: Lane[]) {
  return lanes.length === 0 ? 0 : Math.max(...lanes.map((l) => l.order)) + 1;
}

function sortLanes(lanes: Lane[]) {
  return [...lanes].sort((a, b) => a.order - b.order);
}

function laneIndexById(lanes: Lane[], laneId: string) {
  return sortLanes(lanes).findIndex((l) => l.id === laneId);
}

function laneAtY(lanes: Lane[], y: number): Lane | undefined {
  const sorted = sortLanes(lanes);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(y / LANE_HEIGHT)));
  return sorted[index];
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

type FlowchartEditorProps = {
  initialData: FlowchartData;
  onSave: (data: FlowchartData) => Promise<void>;
};

export default function FlowchartEditor(props: FlowchartEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowchartCanvas {...props} />
    </ReactFlowProvider>
  );
}

function FlowchartCanvas({ initialData, onSave }: FlowchartEditorProps) {
  const [lanes, setLanes] = useState<Lane[]>(initialData.lanes);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowchartNode>(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialData.edges);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeDragStop: OnNodeDrag<FlowchartNode> = useCallback(
    (_event, draggedNode) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== draggedNode.id) return n;
          const lane = laneAtY(lanes, draggedNode.position.y + 20);
          if (!lane) return n;
          const index = laneIndexById(lanes, lane.id);
          const top = laneTop(index);
          const clampedY = Math.min(
            top + LANE_HEIGHT - 60,
            Math.max(top + 10, draggedNode.position.y)
          );
          return {
            ...n,
            position: { ...n.position, y: clampedY },
            data: { ...n.data, laneId: lane.id },
          };
        })
      );
    },
    [lanes, setNodes]
  );

  const addNode = useCallback(
    (category: NodeCategory) => {
      const lane = sortLanes(lanes)[0];
      if (!lane) return;
      const config = CATEGORY_CONFIG[category];
      const index = laneIndexById(lanes, lane.id);
      const countInLane = nodes.filter((n) => n.data.laneId === lane.id).length;

      const newNode: FlowchartNode = {
        id: nextId("node"),
        type: config.shape,
        position: { x: 60 + countInLane * 40, y: laneCenter(index) - 25 },
        data: { label: config.label, category, laneId: lane.id },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [lanes, nodes, setNodes]
  );

  const addLane = useCallback(() => {
    setLanes((prev) => [
      ...prev,
      { id: nextId("lane"), label: `Puesto ${prev.length + 1}`, order: nextLaneOrder(prev) },
    ]);
  }, []);

  const renameLane = useCallback((laneId: string, label: string) => {
    setLanes((prev) => prev.map((l) => (l.id === laneId ? { ...l, label } : l)));
  }, []);

  const removeLane = useCallback(
    (laneId: string) => {
      if (lanes.length <= 1) return;
      const remaining = sortLanes(lanes.filter((l) => l.id !== laneId));
      const reordered = remaining.map((l, i) => ({ ...l, order: i }));
      const fallbackLaneId = reordered[0]?.id;

      setLanes(reordered);
      if (fallbackLaneId) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.data.laneId !== laneId) return n;
            const index = laneIndexById(reordered, fallbackLaneId);
            return {
              ...n,
              position: { ...n.position, y: laneCenter(index) - 25 },
              data: { ...n.data, laneId: fallbackLaneId },
            };
          })
        );
      }
    },
    [lanes, setNodes]
  );

  const moveLane = useCallback((laneId: string, direction: -1 | 1) => {
    setLanes((prev) => {
      const sorted = sortLanes(prev);
      const index = sorted.findIndex((l) => l.id === laneId);
      const swapIndex = index + direction;
      if (index === -1 || swapIndex < 0 || swapIndex >= sorted.length) return prev;
      const a = sorted[index];
      const b = sorted[swapIndex];
      return prev.map((l) => {
        if (l.id === a.id) return { ...l, order: b.order };
        if (l.id === b.id) return { ...l, order: a.order };
        return l;
      });
    });
  }, []);

  const categoriesInUse = useMemo(() => {
    const set = new Set<NodeCategory>();
    nodes.forEach((n) => set.add(n.data.category));
    return set;
  }, [nodes]);

  const sortedLanes = useMemo(() => sortLanes(lanes), [lanes]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ lanes, nodes, edges });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        defaultEdgeOptions={{ type: "smoothstep" }}
        fitView
      >
        <Background />
        <LaneLayer lanes={lanes} />

        <Panel position="top-left" className="w-64 space-y-2">
          <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500">Carriles</p>
            <div className="space-y-1">
              {sortedLanes.map((lane, index) => (
                <div key={lane.id} className="flex items-center gap-1">
                  <input
                    value={lane.label}
                    onChange={(e) => renameLane(lane.id, e.target.value)}
                    className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-900 outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => moveLane(lane.id, -1)}
                    disabled={index === 0}
                    className="rounded border border-slate-200 px-1 text-xs text-slate-500 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLane(lane.id, 1)}
                    disabled={index === sortedLanes.length - 1}
                    className="rounded border border-slate-200 px-1 text-xs text-slate-500 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLane(lane.id)}
                    disabled={sortedLanes.length <= 1}
                    className="rounded border border-slate-200 px-1 text-xs text-red-500 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLane}
              className="mt-2 w-full rounded border border-dashed border-slate-300 py-1 text-xs text-slate-500 hover:border-slate-400"
            >
              + Agregar carril
            </button>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500">Agregar nodo</p>
            <div className="grid grid-cols-2 gap-1">
              {CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => addNode(category)}
                  className="rounded border px-2 py-1 text-left text-[11px]"
                  style={{
                    backgroundColor: CATEGORY_CONFIG[category].fill,
                    borderColor: CATEGORY_CONFIG[category].border,
                    color: CATEGORY_CONFIG[category].text,
                  }}
                >
                  {CATEGORY_CONFIG[category].label}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel position="top-right">
          <div className="flex items-center gap-2">
            {savedAt && (
              <span className="text-xs text-slate-400">
                Guardado {savedAt.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Panel>

        <Panel position="bottom-left">
          <Legend categoriesInUse={categoriesInUse} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
