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

export type FlowchartNodeData = {
  label: string;
  category: NodeCategory;
  laneId: string;
  [key: string]: unknown;
};

export type FlowchartNode = Node<FlowchartNodeData>;

export type FlowchartData = {
  lanes: Lane[];
  nodes: FlowchartNode[];
  edges: Edge[];
  orientation: LaneOrientation;
};
