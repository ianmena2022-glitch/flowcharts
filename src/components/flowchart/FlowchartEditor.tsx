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
import {
  ChevronUp,
  ChevronDown,
  Download,
  FileImage,
  FileJson,
  FileDown,
  Plus,
  RotateCcw,
  Save,
  Upload,
  X,
} from "lucide-react";

import ActivityNode from "./nodes/ActivityNode";
import DecisionNode from "./nodes/DecisionNode";
import TerminalNode from "./nodes/TerminalNode";
import LabeledEdge from "./edges/LabeledEdge";
import LaneLayer from "./LaneLayer";
import SectionLayer from "./SectionLayer";
import DiagramLegend from "./DiagramLegend";
import { CATEGORY_CONFIG, CATEGORY_ORDER, NODE_WIDTH, NODE_HEIGHT } from "@/lib/flowchart/categories";
import {
  DEFAULT_LANE_THICKNESS,
  DEFAULT_SECTION_LENGTH,
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
  EXPORT_PADDING,
  type ExportBounds,
} from "@/lib/flowchart/export";
import type {
  FlowchartData,
  FlowchartNode,
  Lane,
  LaneOrientation,
  NodeCategory,
  Section,
} from "@/lib/flowchart/types";

const nodeTypes = {
  activity: ActivityNode,
  decision: DecisionNode,
  terminal: TerminalNode,
};

const edgeTypes = {
  labeled: LabeledEdge,
};

// Estilo default de los conectores — más oscuro/grueso que el gris pálido
// que trae React Flow por defecto, para que las flechas se lean bien incluso
// en diagramas grandes. Se aplica a TODOS los edges al renderizar (import
// viejo, generados por script, dibujados a mano), no solo a los nuevos.
const EDGE_STROKE_COLOR = "#475569"; // slate-600
const EDGE_STROKE_WIDTH = 2.25;
const EDGE_MARKER_SIZE = 22;

// El PDF se arma en varias páginas angostas en vez de una sola gigante: los
// navegadores no rasterizan un canvas más ancho que ~16000px (el diagrama
// completo lo supera fácil), y aunque lo hicieran, achicar todo el proceso
// para que entre en una página lo vuelve ilegible. Cada página repite la
// columna de carriles a la izquierda para saber qué puesto es cada fila.
const PDF_LABEL_STRIP_WIDTH = 320;
const PDF_SLICE_SIZE = 2400;

function nextLaneOrder(lanes: Lane[]) {
  return lanes.length === 0 ? 0 : Math.max(...lanes.map((l) => l.order)) + 1;
}

function sortLanes(lanes: Lane[]) {
  return [...lanes].sort((a, b) => a.order - b.order);
}

function nextSectionOrder(sections: Section[]) {
  return sections.length === 0 ? 0 : Math.max(...sections.map((s) => s.order)) + 1;
}

function sortSections(sections: Section[]) {
  return [...sections].sort((a, b) => a.order - b.order);
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
  const [sections, setSections] = useState<Section[]>(initialData.sections ?? []);
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
          {
            ...connection,
            type: "labeled",
            style: { stroke: EDGE_STROKE_COLOR, strokeWidth: EDGE_STROKE_WIDTH },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: EDGE_MARKER_SIZE,
              height: EDGE_MARKER_SIZE,
              color: EDGE_STROKE_COLOR,
            },
          },
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
    () =>
      edges.map((e) => ({
        ...e,
        style: { stroke: EDGE_STROKE_COLOR, strokeWidth: EDGE_STROKE_WIDTH, ...e.style },
        markerEnd:
          typeof e.markerEnd === "object" && e.markerEnd
            ? { width: EDGE_MARKER_SIZE, height: EDGE_MARKER_SIZE, color: EDGE_STROKE_COLOR, ...e.markerEnd }
            : (e.markerEnd ?? {
                type: MarkerType.ArrowClosed,
                width: EDGE_MARKER_SIZE,
                height: EDGE_MARKER_SIZE,
                color: EDGE_STROKE_COLOR,
              }),
        data: { ...e.data, onLabelChange: updateEdgeLabel },
      })),
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

  const addSection = useCallback(() => {
    setSections((prev) => [
      ...prev,
      { id: nextId("section"), label: `Subproceso ${prev.length + 1}`, order: nextSectionOrder(prev) },
    ]);
  }, []);

  const renameSection = useCallback((sectionId: string, label: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, label } : s)));
  }, []);

  const resizeSection = useCallback((sectionId: string, length: number) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, length } : s)));
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setSections((prev) => {
      const remaining = sortSections(prev.filter((s) => s.id !== sectionId));
      return remaining.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const moveSection = useCallback((sectionId: string, direction: -1 | 1) => {
    setSections((prev) => {
      const sorted = sortSections(prev);
      const index = sorted.findIndex((s) => s.id === sectionId);
      const swapIndex = index + direction;
      if (index === -1 || swapIndex < 0 || swapIndex >= sorted.length) return prev;
      const a = sorted[index];
      const b = sorted[swapIndex];
      return prev.map((s) => {
        if (s.id === a.id) return { ...s, order: b.order };
        if (s.id === b.id) return { ...s, order: a.order };
        return s;
      });
    });
  }, []);

  const categoriesInUse = useMemo(() => {
    const set = new Set<NodeCategory>();
    nodes.forEach((n) => set.add(n.data.category));
    return set;
  }, [nodes]);

  const sortedLanes = useMemo(() => sortLanes(lanes), [lanes]);
  const sortedSections = useMemo(() => sortSections(sections), [sections]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ lanes, sections, nodes, edges, orientation });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPng() {
    setExporting("png");
    try {
      const bounds = computeExportBounds(lanes, nodes, categoriesInUse.size > 0, orientation, sections);
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
      const bounds = computeExportBounds(lanes, nodes, categoriesInUse.size > 0, orientation, sections);
      const { jsPDF } = await import("jspdf");

      const isHorizontal = orientation === "horizontal";
      const crossStart = isHorizontal ? bounds.x : bounds.y;
      const crossTotal = isHorizontal ? bounds.width : bounds.height;
      const mainStart = isHorizontal ? bounds.y : bounds.x;
      const mainTotal = isHorizontal ? bounds.height : bounds.width;

      const crossBounds = (start: number, size: number): ExportBounds =>
        isHorizontal
          ? { x: start, y: mainStart, width: size, height: mainTotal }
          : { x: mainStart, y: start, width: mainTotal, height: size };

      // Franja de carriles, repetida en cada página para saber a qué puesto
      // corresponde cada fila (las páginas siguientes no vuelven a mostrarla).
      const labelSize = Math.min(PDF_LABEL_STRIP_WIDTH, crossTotal);
      const labelDataUrl = await captureFlowchartPng(crossBounds(crossStart, labelSize));
      const labelImgW = Math.ceil(labelSize) + EXPORT_PADDING * 2;
      const labelImgH = Math.ceil(mainTotal) + EXPORT_PADDING * 2;

      const contentStart = crossStart + labelSize;
      const contentTotal = Math.max(0, crossTotal - labelSize);
      const sliceCount = Math.max(1, Math.ceil(contentTotal / PDF_SLICE_SIZE));

      let pdf: InstanceType<typeof jsPDF> | null = null;

      for (let i = 0; i < sliceCount; i++) {
        const sliceStart = contentStart + i * PDF_SLICE_SIZE;
        const sliceSize = Math.max(0, Math.min(PDF_SLICE_SIZE, crossStart + crossTotal - sliceStart));
        const sliceDataUrl = sliceSize > 0 ? await captureFlowchartPng(crossBounds(sliceStart, sliceSize)) : null;
        const sliceImgW = Math.ceil(sliceSize) + EXPORT_PADDING * 2;
        const sliceImgH = labelImgH;

        const pageWidth = isHorizontal ? labelImgW + sliceImgW : Math.max(labelImgW, sliceImgW);
        const pageHeight = isHorizontal ? Math.max(labelImgH, sliceImgH) : labelImgH + sliceImgH;
        const pageOrientation = pageWidth > pageHeight ? "landscape" : "portrait";

        if (!pdf) {
          pdf = new jsPDF({ unit: "px", orientation: pageOrientation, format: [pageWidth, pageHeight] });
        } else {
          pdf.addPage([pageWidth, pageHeight], pageOrientation);
        }

        pdf.addImage(labelDataUrl, "PNG", 0, 0, labelImgW, labelImgH);
        if (sliceDataUrl) {
          const sliceX = isHorizontal ? labelImgW : 0;
          const sliceY = isHorizontal ? 0 : labelImgH;
          pdf.addImage(sliceDataUrl, "PNG", sliceX, sliceY, sliceImgW, sliceImgH);
        }
      }

      pdf?.save(`${slugify(title)}.pdf`);
    } catch {
      window.alert("No se pudo exportar el PDF. Probá de nuevo.");
    } finally {
      setExporting(null);
    }
  }

  function handleExportJson() {
    downloadBlob(
      JSON.stringify({ lanes, sections, nodes, edges, orientation }, null, 2),
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
    setSections(parsed.sections ?? []);
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
        <LaneLayer lanes={lanes} sections={sections} nodes={nodes} orientation={orientation} />
        <SectionLayer sections={sections} lanes={lanes} orientation={orientation} />

        <Panel position="top-left" className="w-64 space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500">Orientación</p>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setOrientation("horizontal")}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  orientation === "horizontal"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Horizontal
              </button>
              <button
                type="button"
                onClick={() => setOrientation("vertical")}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  orientation === "vertical"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Vertical
              </button>
            </div>
            <button
              type="button"
              onClick={reflowNodes}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RotateCcw size={12} />
              Reordenar nodos
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500">Carriles</p>
            <div className="space-y-1">
              {sortedLanes.map((lane, index) => (
                <div key={lane.id} className="space-y-1 rounded-md border border-slate-100 p-1">
                  <div className="flex items-center gap-1">
                    <input
                      value={lane.label}
                      onChange={(e) => renameLane(lane.id, e.target.value)}
                      className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => moveLane(lane.id, -1)}
                      disabled={index === 0}
                      className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLane(lane.id, 1)}
                      disabled={index === sortedLanes.length - 1}
                      className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLane(lane.id)}
                      disabled={sortedLanes.length <= 1}
                      className="rounded border border-slate-200 p-1 text-red-500 hover:bg-red-50 disabled:opacity-30"
                    >
                      <X size={12} />
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
                      className="w-16 rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20"
                    />
                    <span>px</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLane}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 py-1 text-xs text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600"
            >
              <Plus size={12} />
              Agregar carril
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500">Subprocesos</p>
            <div className="space-y-1">
              {sortedSections.map((section, index) => (
                <div key={section.id} className="space-y-1 rounded-md border border-slate-100 p-1">
                  <div className="flex items-center gap-1">
                    <input
                      value={section.label}
                      onChange={(e) => renameSection(section.id, e.target.value)}
                      className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => moveSection(section.id, -1)}
                      disabled={index === 0}
                      className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(section.id, 1)}
                      disabled={index === sortedSections.length - 1}
                      className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      className="rounded border border-slate-200 p-1 text-red-500 hover:bg-red-50"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>{orientation === "vertical" ? "Alto" : "Ancho"}</span>
                    <input
                      type="number"
                      min={200}
                      max={5000}
                      step={50}
                      value={section.length ?? DEFAULT_SECTION_LENGTH}
                      onChange={(e) => resizeSection(section.id, Number(e.target.value) || DEFAULT_SECTION_LENGTH)}
                      className="w-16 rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20"
                    />
                    <span>px</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSection}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 py-1 text-xs text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600"
            >
              <Plus size={12} />
              Agregar subproceso
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500">Agregar nodo</p>
            <div className="grid grid-cols-2 gap-1">
              {CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => addNode(category)}
                  className="rounded-md border px-2 py-1 text-left text-[11px] transition-transform hover:scale-[1.02]"
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
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Upload size={15} />
              Importar
            </button>

            <div className="relative">
              <details className="group">
                <summary className="flex list-none items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <Download size={15} />
                  Exportar
                </summary>
                <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={exporting !== null}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <FileImage size={14} />
                    {exporting === "png" ? "Exportando..." : "PNG"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={exporting !== null}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <FileDown size={14} />
                    {exporting === "pdf" ? "Exportando..." : "PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileJson size={14} />
                    JSON
                  </button>
                </div>
              </details>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              <Save size={15} />
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
