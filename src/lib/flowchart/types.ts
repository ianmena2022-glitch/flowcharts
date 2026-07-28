import type { Node, Edge } from "@xyflow/react";

export type NodeCategory = "approval" | "system" | "decision" | "terminal";

export type LaneOrientation = "horizontal" | "vertical";

export type Lane = {
  id: string;
  label: string;
  order: number;
  /** Grosor del carril (ancho en vertical, alto en horizontal). Si falta, se usa el default. */
  thickness?: number;
};

/**
 * Subproceso: franja vertical (en horizontal) u horizontal (en vertical) que
 * atraviesa TODOS los carriles, con su propio label. Es un eje ortogonal al
 * de los carriles (que representan roles/cargos) — no tiene relación
 * declarada con los nodos, es puramente estructural/visual.
 */
export type Section = {
  id: string;
  label: string;
  order: number;
  /** Extensión del subproceso a lo largo del eje de flujo. Si falta, se usa el default. */
  length?: number;
};

export type FlowchartNodeData = {
  label: string;
  category: NodeCategory;
  laneId: string;
  [key: string]: unknown;
};

export type FlowchartNode = Node<FlowchartNodeData>;

export type FlowchartData = {
  lanes: Lane[];
  sections: Section[];
  nodes: FlowchartNode[];
  edges: Edge[];
  orientation: LaneOrientation;
};
