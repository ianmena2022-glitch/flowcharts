"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import LabeledEdge from "./edges/LabeledEdge";
import LaneLayer from "./LaneLayer";
import DiagramLegend from "./DiagramLegend";
import { CATEGORY_CONFIG, CATEGORY_ORDER, NODE_WIDTH, NODE_HEIGHT } from "@/lib/flowchart/categories";
import {
  DEFAULT_LANE_THICKNESS,
  laneIndexAtPoint,
  clampPointToLane,
  defaultNodePosition,
  crossCoord,
  totalLanesThickness,
} from "@/lib/flowchart/layout";
import { flowchartDataSchema } from "@/lib/flowchart/schema";
import {
  computeExportBounds,
  captureFlowchartPng,
  downloadDataUrl,
  downloadBlob,
  slugify,
} from "@/lib/flowchart/export";
import type {
  FlowchartData,
  FlowchartNode,
  Lane,
  LaneOrientation,
  NodeCategory,
} from "@/lib/flowchart/types";

const nodeTypes = {
  activity: ActivityNode,
  decision: DecisionNode,
  terminal: TerminalNode,
};

const edgeTypes = {
  labeled: LabeledEdge,
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

function nodeMainSizeFor(category: NodeCategory, orientation: LaneOrientation) {
  const shape = CATEGORY_CONFIG[category].shape;
  return orientation === "vertical" ? NODE_WIDTH[shape] : NODE_HEIGHT[shape];
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

type FlowchartEditorProps = {
  title: string;
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

function FlowchartCanvas({ title, initialData, onSave }: FlowchartEditorProps) {
  const [lanes, setLanes] = useState<Lane[]>(initialData.lanes);
  const [orientation, setOrientation] = useState<LaneOrientation>(
    initialData.orientation ?? "horizontal"
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowchartNode>(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialData.edges);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, type: "labeled", markerEnd: { type: MarkerType.ArrowClosed } },
          eds
        )
      );
    },
    [setEdges]
  );

  const updateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n))
      );
    },
    [setNodes]
  );

  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, label } } : e))
      );
    },
    [setEdges]
  );

  const nodesForRender = useMemo(
    () => nodes.map((n) => ({ ...n, data: { ...n.data, onLabelChange: updateNodeLabel } })),
    [nodes, updateNodeLabel]
  );

  const edgesForRender = useMemo(
    () => edges.map((e) => ({ ...e, data: { ...e.data, onLabelChange: updateEdgeLabel } })),
    [edges, updateEdgeLabel]
  );

  const onNodeDragStop: OnNodeDrag<FlowchartNode> = useCallback(
    (_event, draggedNode) => {
      const sorted = sortLanes(lanes);
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== draggedNode.id) return n;
          const laneIndex = laneIndexAtPoint(draggedNode.position, orientation, sorted);
          const lane = sorted[laneIndex];
          if (!lane) return n;
          const clamped = clampPointToLane(draggedNode.position, sorted, laneIndex, orientation);
          return {
            ...n,
            position: clamped,
            data: { ...n.data, laneId: lane.id },
          };
        })
      );
    },
    [lanes, orientation, setNodes]
  );

  const addNode = useCallback(
    (category: NodeCategory) => {
      const sorted = sortLanes(lanes);
      const lane = sorted[0];
      if (!lane) return;
      const config = CATEGORY_CONFIG[category];
      const index = laneIndexById(lanes, lane.id);
      const countInLane = nodes.filter((n) => n.data.laneId === lane.id).length;
      const mainSize = nodeMainSizeFor(category, orientation);

      const newNode: FlowchartNode = {
        id: nextId("node"),
        type: config.shape,
        position: defaultNodePosition(sorted, index, orientation, countInLane, mainSize),
        data: { label: config.label, category, laneId: lane.id },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [lanes, nodes, orientation, setNodes]
  );

  const reflowNodes = useCallback(() => {
    const sorted = sortLanes(lanes);
    setNodes((nds) => {
      const byLane = new Map<string, FlowchartNode[]>();
      for (const n of nds) {
        const arr = byLane.get(n.data.laneId) ?? [];
        arr.push(n);
        byLane.set(n.data.laneId, arr);
      }

      return nds.map((n) => {
        const laneNodes = byLane.get(n.data.laneId);
        const index = laneIndexById(lanes, n.data.laneId);
        if (!laneNodes || index === -1) return n;

        const ordinal = [...laneNodes]
          .sort((a, b) => crossCoord(a.position, orientation) - crossCoord(b.position, orientation))
          .findIndex((ln) => ln.id === n.id);

        const mainSize = nodeMainSizeFor(n.data.category, orientation);
        return { ...n, position: defaultNodePosition(sorted, index, orientation, ordinal, mainSize) };
      });
    });
  }, [lanes, orientation, setNodes]);

  const addLane = useCallback(() => {
    setLanes((prev) => [
      ...prev,
      { id: nextId("lane"), label: `Puesto ${prev.length + 1}`, order: nextLaneOrder(prev) },
    ]);
  }, []);

  const renameLane = useCallback((laneId: string, label: string) => {
    setLanes((prev) => prev.map((l) => (l.id === laneId ? { ...l, label } : l)));
  }, []);

  const resizeLane = useCallback((laneId: string, thickness: number) => {
    setLanes((prev) => prev.map((l) => (l.id === laneId ? { ...l, thickness } : l)));
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
            const mainSize = nodeMainSizeFor(n.data.category, orientation);
            return {
              ...n,
              position: defaultNodePosition(reordered, index, orientation, 0, mainSize),
              data: { ...n.data, laneId: fallbackLaneId },
            };
          })
        );
      }
    },
    [lanes, orientation, setNodes]
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
      await onSave({ lanes, nodes, edges, orientation });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPng() {
    setExporting("png");
    try {
      const bounds = computeExportBounds(lanes, nodes, categoriesInUse.size > 0, orientation);
      const dataUrl = await captureFlowchartPng(bounds);
      downloadDataUrl(dataUrl, `${slugify(title)}.png`);
    } catch {
      window.alert("No se pudo exportar el PNG. Probá de nuevo.");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPdf() {
    setExporting("pdf");
    try {
      const bounds = computeExportBounds(lanes, nodes, categoriesInUse.size > 0, orientation);
      const dataUrl = await captureFlowchartPng(bounds);
      const { jsPDF } = await import("jspdf");
      const width = bounds.width + 48;
      const height = bounds.height + 48;
      const pdf = new jsPDF({
        orientation: width > height ? "landscape" : "portrait",
        unit: "px",
        format: [width, height],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`${slugify(title)}.pdf`);
    } catch {
      window.alert("No se pudo exportar el PDF. Probá de nuevo.");
    } finally {
      setExporting(null);
    }
  }

  function handleExportJson() {
    downloadBlob(
      JSON.stringify({ lanes, nodes, edges, orientation }, null, 2),
      "application/json",
      `${slugify(title)}.json`
    );
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    let parsed;
    try {
      parsed = flowchartDataSchema.parse(JSON.parse(await file.text()));
    } catch {
      window.alert("El archivo no es un JSON de flowchart válido.");
      return;
    }

    if (!window.confirm("Esto reemplaza el diagrama actual (todavía sin guardar). ¿Continuar?")) {
      return;
    }

    setLanes(parsed.lanes);
    setNodes(parsed.nodes as FlowchartNode[]);
    setEdges(parsed.edges as Edge[]);
    setOrientation(parsed.orientation ?? "horizontal");
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      <ReactFlow
        nodes={nodesForRender}
        edges={edgesForRender}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        defaultEdgeOptions={{ type: "labeled" }}
        fitView
      >
        <Background />
        <LaneLayer lanes={lanes} orientation={orientation} />

        <Panel position="top-left" className="w-64 space-y-2">
          <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500">Orientación</p>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setOrientation("horizontal")}
                className={`rounded border px-2 py-1 text-xs ${
                  orientation === "horizontal"
                    ? "border-slate-500 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Horizontal
              </button>
              <button
                type="button"
                onClick={() => setOrientation("vertical")}
                className={`rounded border px-2 py-1 text-xs ${
                  orientation === "vertical"
                    ? "border-slate-500 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Vertical
              </button>
            </div>
            <button
              type="button"
              onClick={reflowNodes}
              className="mt-2 w-full rounded border border-slate-300 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Reordenar nodos
            </button>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500">Carriles</p>
            <div className="space-y-1">
              {sortedLanes.map((lane, index) => (
                <div key={lane.id} className="space-y-1 rounded border border-slate-100 p-1">
                  <div className="flex items-center gap-1">
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
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>{orientation === "vertical" ? "Ancho" : "Alto"}</span>
                    <input
                      type="number"
                      min={120}
                      max={800}
                      step={10}
                      value={lane.thickness ?? DEFAULT_LANE_THICKNESS}
                      onChange={(e) => resizeLane(lane.id, Number(e.target.value) || DEFAULT_LANE_THICKNESS)}
                      className="w-16 rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-900 outline-none focus:border-slate-400"
                    />
                    <span>px</span>
                  </div>
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

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              onClick={handleImportClick}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Importar
            </button>

            <div className="relative">
              <details className="group">
                <summary className="list-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  Exportar
                </summary>
                <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={exporting !== null}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {exporting === "png" ? "Exportando..." : "PNG"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={exporting !== null}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {exporting === "pdf" ? "Exportando..." : "PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    JSON
                  </button>
                </div>
              </details>
            </div>

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

        <DiagramLegend
          categoriesInUse={categoriesInUse}
          mainOffset={totalLanesThickness(sortedLanes) + 10}
          orientation={orientation}
        />
      </ReactFlow>
    </div>
  );
}
