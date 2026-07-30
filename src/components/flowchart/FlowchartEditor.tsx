"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  ConnectionMode,
  addEdge,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type OnNodeDrag,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronUp,
  ChevronDown,
  Columns,
  Download,
  FileImage,
  FileJson,
  FileDown,
  Plus,
  Redo2,
  Rows,
  RotateCcw,
  Save,
  Undo2,
  Upload,
  X,
} from "lucide-react";

import ActivityNode from "./nodes/ActivityNode";
import DecisionNode from "./nodes/DecisionNode";
import TerminalNode from "./nodes/TerminalNode";
import LabeledEdge from "./edges/LabeledEdge";
import LaneLayer from "./LaneLayer";
import LaneLabelsOverlay from "./LaneLabelsOverlay";
import SectionLayer from "./SectionLayer";
import DiagramLegend from "./DiagramLegend";
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  NODE_WIDTH,
  NODE_HEIGHT,
  nodeDimensions,
} from "@/lib/flowchart/categories";
import {
  DEFAULT_LANE_THICKNESS,
  DEFAULT_SECTION_LENGTH,
  laneIndexAtPoint,
  shiftPositionForLaneChange,
  defaultNodePosition,
  crossCoord,
  totalLanesThickness,
  sectionCrossStart,
  sectionLength,
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

// Si el diagrama entero entra bajo el límite de rasterizado del navegador
// (~16384px de canvas), el PDF sale en una sola página, tal cual se ve.
// Si no entra, se parte en una página POR SUBPROCESO (nunca a la mitad de
// un cuadro), repitiendo la columna de carriles a la izquierda en cada
// página para saber qué puesto es cada fila. Sin subprocesos definidos, o
// si un subproceso en sí mismo sigue sin entrar, se cae a franjas de ancho
// fijo como respaldo.
const CANVAS_SAFE_LIMIT = 16000;
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

/** Como nodeMainSizeFor, pero respeta el ancho/alto que el usuario haya
 * redimensionado a mano en vez de asumir siempre el tamaño default. */
function nodeMainSize(node: FlowchartNode, orientation: LaneOrientation) {
  const custom = orientation === "vertical" ? node.width : node.height;
  return custom ?? nodeMainSizeFor(node.data.category, orientation);
}

type Snapshot = {
  lanes: Lane[];
  sections: Section[];
  nodes: FlowchartNode[];
  edges: Edge[];
  orientation: LaneOrientation;
};

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
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<FlowchartNode>(initialData.nodes);
  const [edges, setEdges, onEdgesChangeRaw] = useEdgesState<Edge>(initialData.edges);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Historial (Ctrl+Z / Ctrl+Shift+Z): guarda una foto completa ANTES de
  // cada acción que modifica el diagrama, nunca en cada tecla/frame — un
  // drag o un resize registra un solo checkpoint (al empezar el gesto), no
  // uno por pixel movido.
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const commitScheduledRef = useRef(false);
  const [historyCounts, setHistoryCounts] = useState({ past: 0, future: 0 });

  const commitHistory = useCallback(() => {
    if (commitScheduledRef.current) return;
    commitScheduledRef.current = true;
    pastRef.current.push({ lanes, sections, nodes, edges, orientation });
    if (pastRef.current.length > 100) pastRef.current.shift();
    futureRef.current = [];
    setHistoryCounts({ past: pastRef.current.length, future: 0 });
    queueMicrotask(() => {
      commitScheduledRef.current = false;
    });
  }, [lanes, sections, nodes, edges, orientation]);

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push({ lanes, sections, nodes, edges, orientation });
    setLanes(prev.lanes);
    setSections(prev.sections);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setOrientation(prev.orientation);
    setHistoryCounts({ past: pastRef.current.length, future: futureRef.current.length });
  }, [lanes, sections, nodes, edges, orientation, setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push({ lanes, sections, nodes, edges, orientation });
    setLanes(next.lanes);
    setSections(next.sections);
    setNodes(next.nodes);
    setEdges(next.edges);
    setOrientation(next.orientation);
    setHistoryCounts({ past: pastRef.current.length, future: futureRef.current.length });
  }, [lanes, sections, nodes, edges, orientation, setNodes, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowchartNode>[]) => {
      if (changes.some((c) => c.type === "remove")) commitHistory();
      onNodesChangeRaw(changes);
    },
    [onNodesChangeRaw, commitHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (changes.some((c) => c.type === "remove")) commitHistory();
      onEdgesChangeRaw(changes);
    },
    [onEdgesChangeRaw, commitHistory]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      commitHistory();
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
    [setEdges, commitHistory]
  );

  const updateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      commitHistory();
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n))
      );
    },
    [setNodes, commitHistory]
  );

  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      commitHistory();
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, label } } : e))
      );
    },
    [setEdges, commitHistory]
  );

  const onNodeResizeStart = useCallback(() => {
    commitHistory();
  }, [commitHistory]);

  const onNodeResize = useCallback(
    (nodeId: string, x: number, y: number, width: number, height: number) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, position: { x, y }, width, height } : n))
      );
    },
    [setNodes]
  );

  const nodesForRender = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onLabelChange: updateNodeLabel,
          onResizeStart: onNodeResizeStart,
          onResize: onNodeResize,
        },
      })),
    [nodes, updateNodeLabel, onNodeResizeStart, onNodeResize]
  );

  // Reparte los edges que comparten (nodo, lado) a lo largo de ese lado en
  // vez de que todos salgan/entren del mismo punto — solo para actividad e
  // inicio/fin (rectángulo/píldora, tienen un lado real); una decisión es
  // un rombo, cada lado es un solo vértice, no hay dónde repartir.
  const edgeSlots = useMemo(() => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const canSpread = (nodeId: string) => nodeById.get(nodeId)?.data.category !== "decision";

    const groups = new Map<string, string[]>();
    function register(nodeId: string, handle: string | null | undefined, edgeId: string) {
      if (!handle || !canSpread(nodeId)) return;
      const key = `${nodeId}:${handle}`;
      const arr = groups.get(key);
      if (arr) arr.push(edgeId);
      else groups.set(key, [edgeId]);
    }
    for (const e of edges) {
      register(e.source, e.sourceHandle, e.id);
      register(e.target, e.targetHandle, e.id);
    }

    function fraction(nodeId: string, handle: string | null | undefined, edgeId: string) {
      if (!handle) return 0.5;
      const arr = groups.get(`${nodeId}:${handle}`);
      if (!arr) return 0.5;
      const i = arr.indexOf(edgeId);
      return (i + 1) / (arr.length + 1);
    }

    return { nodeById, fraction };
  }, [edges, nodes]);

  const edgesForRender = useMemo(
    () =>
      edges.map((e) => {
        const sourceNode = edgeSlots.nodeById.get(e.source);
        const targetNode = edgeSlots.nodeById.get(e.target);
        return {
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
          data: {
            ...e.data,
            onLabelChange: updateEdgeLabel,
            sourceRect: sourceNode ? { ...sourceNode.position, ...nodeDimensions(sourceNode) } : null,
            targetRect: targetNode ? { ...targetNode.position, ...nodeDimensions(targetNode) } : null,
            sourceFraction: edgeSlots.fraction(e.source, e.sourceHandle, e.id),
            targetFraction: edgeSlots.fraction(e.target, e.targetHandle, e.id),
          },
        };
      }),
    [edges, edgeSlots, updateEdgeLabel]
  );

  const onNodeDragStart: OnNodeDrag<FlowchartNode> = useCallback(() => {
    commitHistory();
  }, [commitHistory]);

  // Sin clamp: el nodo se queda exactamente donde lo soltás, libre dentro
  // del lienzo. Solo se actualiza de qué carril "es" (metadata para las
  // bandas/exportación), según la banda sobre la que quedó el centro del
  // nodo al soltarlo.
  const onNodeDragStop: OnNodeDrag<FlowchartNode> = useCallback(
    (_event, draggedNode) => {
      const sorted = sortLanes(lanes);
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== draggedNode.id) return n;
          const laneIndex = laneIndexAtPoint(draggedNode.position, orientation, sorted);
          const lane = sorted[laneIndex];
          if (!lane) return n;
          return { ...n, data: { ...n.data, laneId: lane.id } };
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

      commitHistory();
      setNodes((nds) => [...nds, newNode]);
    },
    [lanes, nodes, orientation, setNodes, commitHistory]
  );

  const reflowNodes = useCallback(() => {
    const sorted = sortLanes(lanes);
    commitHistory();
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

        return {
          ...n,
          position: defaultNodePosition(sorted, index, orientation, ordinal, nodeMainSize(n, orientation)),
        };
      });
    });
  }, [lanes, orientation, setNodes, commitHistory]);

  const addLane = useCallback(() => {
    commitHistory();
    setLanes((prev) => [
      ...prev,
      { id: nextId("lane"), label: `Puesto ${prev.length + 1}`, order: nextLaneOrder(prev) },
    ]);
  }, [commitHistory]);

  const renameLane = useCallback((laneId: string, label: string) => {
    setLanes((prev) => prev.map((l) => (l.id === laneId ? { ...l, label } : l)));
  }, []);

  const resizeLane = useCallback(
    (laneId: string, thickness: number) => {
      const oldSorted = sortLanes(lanes);
      const newLanes = lanes.map((l) => (l.id === laneId ? { ...l, thickness } : l));
      const newSorted = sortLanes(newLanes);
      setLanes(newLanes);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          position: shiftPositionForLaneChange(n.position, n.data.laneId, oldSorted, newSorted, orientation),
        }))
      );
    },
    [lanes, orientation, setNodes]
  );

  const removeLane = useCallback(
    (laneId: string) => {
      if (lanes.length <= 1) return;
      const oldSorted = sortLanes(lanes);
      const remaining = sortLanes(lanes.filter((l) => l.id !== laneId));
      const reordered = remaining.map((l, i) => ({ ...l, order: i }));
      const newSorted = sortLanes(reordered);
      const fallbackLaneId = newSorted[0]?.id;

      commitHistory();
      setLanes(reordered);
      setNodes((nds) =>
        nds.map((n) => {
          if (n.data.laneId === laneId) {
            if (!fallbackLaneId) return n;
            const index = laneIndexById(reordered, fallbackLaneId);
            return {
              ...n,
              position: defaultNodePosition(reordered, index, orientation, 0, nodeMainSize(n, orientation)),
              data: { ...n.data, laneId: fallbackLaneId },
            };
          }
          return {
            ...n,
            position: shiftPositionForLaneChange(n.position, n.data.laneId, oldSorted, newSorted, orientation),
          };
        })
      );
    },
    [lanes, orientation, setNodes, commitHistory]
  );

  const moveLane = useCallback(
    (laneId: string, direction: -1 | 1) => {
      const oldSorted = sortLanes(lanes);
      const index = oldSorted.findIndex((l) => l.id === laneId);
      const swapIndex = index + direction;
      if (index === -1 || swapIndex < 0 || swapIndex >= oldSorted.length) return;
      const a = oldSorted[index];
      const b = oldSorted[swapIndex];

      commitHistory();
      const newLanes = lanes.map((l) => {
        if (l.id === a.id) return { ...l, order: b.order };
        if (l.id === b.id) return { ...l, order: a.order };
        return l;
      });
      const newSorted = sortLanes(newLanes);
      setLanes(newLanes);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          position: shiftPositionForLaneChange(n.position, n.data.laneId, oldSorted, newSorted, orientation),
        }))
      );
    },
    [lanes, orientation, setNodes, commitHistory]
  );

  const addSection = useCallback(() => {
    commitHistory();
    setSections((prev) => [
      ...prev,
      { id: nextId("section"), label: `Subproceso ${prev.length + 1}`, order: nextSectionOrder(prev) },
    ]);
  }, [commitHistory]);

  const renameSection = useCallback((sectionId: string, label: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, label } : s)));
  }, []);

  const resizeSection = useCallback((sectionId: string, length: number) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, length } : s)));
  }, []);

  const removeSection = useCallback(
    (sectionId: string) => {
      commitHistory();
      setSections((prev) => {
        const remaining = sortSections(prev.filter((s) => s.id !== sectionId));
        return remaining.map((s, i) => ({ ...s, order: i }));
      });
    },
    [commitHistory]
  );

  const moveSection = useCallback((sectionId: string, direction: -1 | 1) => {
    commitHistory();
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
  }, [commitHistory]);

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
      type Pdf = InstanceType<typeof jsPDF>;

      const isHorizontal = orientation === "horizontal";
      const crossStart = isHorizontal ? bounds.x : bounds.y;
      const crossTotal = isHorizontal ? bounds.width : bounds.height;
      const crossEnd = crossStart + crossTotal;
      const mainStart = isHorizontal ? bounds.y : bounds.x;
      const mainTotal = isHorizontal ? bounds.height : bounds.width;

      const crossBounds = (start: number, size: number): ExportBounds =>
        isHorizontal
          ? { x: start, y: mainStart, width: size, height: mainTotal }
          : { x: mainStart, y: start, width: mainTotal, height: size };

      const addPdfPage = (pdf: Pdf | null, width: number, height: number): Pdf => {
        const pageOrientation = width > height ? "landscape" : "portrait";
        if (!pdf) return new jsPDF({ unit: "px", orientation: pageOrientation, format: [width, height] });
        pdf.addPage([width, height], pageOrientation);
        return pdf;
      };

      // Si el diagrama entero entra bajo el límite de rasterizado del
      // navegador, se exporta tal cual, en una sola página.
      const wholeWidth = Math.ceil(crossTotal) + EXPORT_PADDING * 2;
      const wholeHeight = Math.ceil(mainTotal) + EXPORT_PADDING * 2;
      if (wholeWidth <= CANVAS_SAFE_LIMIT && wholeHeight <= CANVAS_SAFE_LIMIT) {
        const dataUrl = await captureFlowchartPng(bounds);
        const pdf = addPdfPage(null, wholeWidth, wholeHeight);
        pdf.addImage(dataUrl, "PNG", 0, 0, wholeWidth, wholeHeight);
        pdf.save(`${slugify(title)}.pdf`);
        return;
      }

      // No entra: se parte en una página por subproceso (nunca a la mitad
      // de un cuadro), repitiendo la columna de carriles a la izquierda.
      const labelSize = Math.min(PDF_LABEL_STRIP_WIDTH, crossTotal);
      const labelDataUrl = await captureFlowchartPng(crossBounds(crossStart, labelSize));
      const labelImgW = Math.ceil(labelSize) + EXPORT_PADDING * 2;
      const labelImgH = Math.ceil(mainTotal) + EXPORT_PADDING * 2;

      const ranges: { start: number; size: number }[] = [];
      if (sortedSections.length > 0) {
        sortedSections.forEach((section, i) => {
          const start = sectionCrossStart(sortedSections, i);
          const isLast = i === sortedSections.length - 1;
          const end = isLast ? Math.max(start + sectionLength(section), crossEnd) : start + sectionLength(section);
          ranges.push({ start, size: end - start });
        });
      } else {
        // Sin subprocesos definidos: se cae a franjas de ancho fijo.
        const contentStart = crossStart + labelSize;
        const contentTotal = Math.max(0, crossEnd - contentStart);
        const count = Math.max(1, Math.ceil(contentTotal / PDF_SLICE_SIZE));
        for (let i = 0; i < count; i++) {
          const start = contentStart + i * PDF_SLICE_SIZE;
          ranges.push({ start, size: Math.min(PDF_SLICE_SIZE, crossEnd - start) });
        }
      }

      // Si un subproceso en sí mismo sigue sin entrar bajo el límite, se
      // subdivide en franjas más chicas (respaldo, no debería ser común).
      const maxContentPerPage = Math.max(200, CANVAS_SAFE_LIMIT - labelImgW - EXPORT_PADDING * 2);
      const finalRanges = ranges.flatMap((range) => {
        if (Math.ceil(range.size) + EXPORT_PADDING * 2 + labelImgW <= CANVAS_SAFE_LIMIT) return [range];
        const subCount = Math.ceil(range.size / maxContentPerPage);
        return Array.from({ length: subCount }, (_, i) => {
          const start = range.start + i * maxContentPerPage;
          return { start, size: Math.min(maxContentPerPage, range.start + range.size - start) };
        });
      });

      let pdf: Pdf | null = null;
      for (const range of finalRanges) {
        const sliceSize = Math.max(0, range.size);
        const sliceDataUrl = sliceSize > 0 ? await captureFlowchartPng(crossBounds(range.start, sliceSize)) : null;
        const sliceImgW = Math.ceil(sliceSize) + EXPORT_PADDING * 2;
        const sliceImgH = labelImgH;

        const pageWidth = isHorizontal ? labelImgW + sliceImgW : Math.max(labelImgW, sliceImgW);
        const pageHeight = isHorizontal ? Math.max(labelImgH, sliceImgH) : labelImgH + sliceImgH;

        pdf = addPdfPage(pdf, pageWidth, pageHeight);
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

    commitHistory();
    setLanes(parsed.lanes);
    setSections(parsed.sections ?? []);
    setNodes(parsed.nodes as FlowchartNode[]);
    setEdges(parsed.edges as Edge[]);
    setOrientation(parsed.orientation ?? "horizontal");
  }

  const canUndo = historyCounts.past > 0;
  const canRedo = historyCounts.future > 0;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex flex-wrap items-stretch gap-x-1 gap-y-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <RibbonGroup label="Archivo">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <RibbonButton onClick={handleImportClick} icon={<Upload size={15} />}>
            Importar
          </RibbonButton>
          <div className="relative">
            <details className="group">
              <summary className="flex h-full list-none cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-white [&::-webkit-details-marker]:hidden">
                <Download size={15} />
                Exportar
              </summary>
              <div className="absolute left-0 z-10 mt-1 w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
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
          <RibbonButton onClick={handleSave} disabled={saving} icon={<Save size={15} />} accent>
            {saving ? "Guardando..." : "Guardar"}
          </RibbonButton>
          {savedAt && (
            <span className="flex items-center px-1 text-[11px] text-slate-400">
              Guardado {savedAt.toLocaleTimeString()}
            </span>
          )}
        </RibbonGroup>

        <RibbonDivider />

        <RibbonGroup label="Deshacer">
          <RibbonButton onClick={undo} disabled={!canUndo} icon={<Undo2 size={15} />} title="Ctrl+Z">
            Deshacer
          </RibbonButton>
          <RibbonButton onClick={redo} disabled={!canRedo} icon={<Redo2 size={15} />} title="Ctrl+Shift+Z">
            Rehacer
          </RibbonButton>
        </RibbonGroup>

        <RibbonDivider />

        <RibbonGroup label="Vista">
          <div className="flex h-full flex-col items-center justify-center gap-1 px-1">
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => setOrientation("horizontal")}
                className={`rounded px-2 py-1 text-[11px] transition-colors ${
                  orientation === "horizontal"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                Horizontal
              </button>
              <button
                type="button"
                onClick={() => setOrientation("vertical")}
                className={`rounded px-2 py-1 text-[11px] transition-colors ${
                  orientation === "vertical"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                Vertical
              </button>
            </div>
          </div>
          <RibbonButton onClick={reflowNodes} icon={<RotateCcw size={15} />}>
            Reordenar
          </RibbonButton>
        </RibbonGroup>

        <RibbonDivider />

        <RibbonGroup label="Carriles">
          <div className="relative">
            <details className="group">
              <summary className="flex h-full list-none cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-white [&::-webkit-details-marker]:hidden">
                <Rows size={15} />
                Carriles ({sortedLanes.length})
              </summary>
              <div className="absolute left-0 z-10 mt-1 w-72 space-y-1 overflow-hidden rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {sortedLanes.map((lane, index) => (
                    <div key={lane.id} className="space-y-1 rounded-md border border-slate-100 p-1">
                      <div className="flex items-center gap-1">
                        <input
                          value={lane.label}
                          onFocus={commitHistory}
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
                          onFocus={commitHistory}
                          onChange={(e) =>
                            resizeLane(lane.id, Number(e.target.value) || DEFAULT_LANE_THICKNESS)
                          }
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 py-1 text-xs text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600"
                >
                  <Plus size={12} />
                  Agregar carril
                </button>
              </div>
            </details>
          </div>
        </RibbonGroup>

        <RibbonDivider />

        <RibbonGroup label="Subprocesos">
          <div className="relative">
            <details className="group">
              <summary className="flex h-full list-none cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-white [&::-webkit-details-marker]:hidden">
                <Columns size={15} />
                Subprocesos ({sortedSections.length})
              </summary>
              <div className="absolute left-0 z-10 mt-1 w-72 space-y-1 overflow-hidden rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {sortedSections.map((section, index) => (
                    <div key={section.id} className="space-y-1 rounded-md border border-slate-100 p-1">
                      <div className="flex items-center gap-1">
                        <input
                          value={section.label}
                          onFocus={commitHistory}
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
                          onFocus={commitHistory}
                          onChange={(e) =>
                            resizeSection(section.id, Number(e.target.value) || DEFAULT_SECTION_LENGTH)
                          }
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 py-1 text-xs text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600"
                >
                  <Plus size={12} />
                  Agregar subproceso
                </button>
              </div>
            </details>
          </div>
        </RibbonGroup>

        <RibbonDivider />

        <RibbonGroup label="Agregar nodo">
          {CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => addNode(category)}
              className="flex h-full items-center justify-center rounded-md border px-2.5 py-1 text-[11px] font-medium transition-transform hover:scale-[1.03]"
              style={{
                backgroundColor: CATEGORY_CONFIG[category].fill,
                borderColor: CATEGORY_CONFIG[category].border,
                color: CATEGORY_CONFIG[category].text,
              }}
            >
              {CATEGORY_CONFIG[category].label}
            </button>
          ))}
        </RibbonGroup>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <ReactFlow
          nodes={nodesForRender}
          edges={edgesForRender}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          defaultEdgeOptions={{ type: "labeled" }}
          connectionMode={ConnectionMode.Loose}
          fitView
        >
          <Background />
          <LaneLayer lanes={lanes} sections={sections} nodes={nodes} orientation={orientation} />
          <SectionLayer sections={sections} lanes={lanes} orientation={orientation} />

          <DiagramLegend
            categoriesInUse={categoriesInUse}
            mainOffset={totalLanesThickness(sortedLanes) + 10}
            orientation={orientation}
          />
        </ReactFlow>
        <LaneLabelsOverlay lanes={lanes} orientation={orientation} />
      </div>
    </div>
  );
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-stretch">
      <div className="flex flex-1 items-stretch gap-0.5">{children}</div>
      <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function RibbonDivider() {
  return <div className="mx-1 w-px self-stretch bg-slate-200" />;
}

function RibbonButton({
  onClick,
  disabled,
  icon,
  title,
  accent,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-full flex-col items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        accent ? "bg-indigo-600 text-white hover:bg-indigo-500" : "text-slate-700 hover:bg-white"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
