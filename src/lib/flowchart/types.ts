import type { Node, Edge } from "@xyflow/react";

export type NodeCategory = "approval" | "system" | "decision" | "terminal";

export type Lane = {
  id: string;
  label: string;
  order: number;
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
};
