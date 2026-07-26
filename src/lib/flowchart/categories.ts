import type { NodeCategory } from "./types";

export type NodeShape = "activity" | "decision" | "terminal";

type CategoryConfig = {
  label: string;
  fill: string;
  border: string;
  text: string;
  shape: NodeShape;
};

export const CATEGORY_CONFIG: Record<NodeCategory, CategoryConfig> = {
  approval: {
    label: "Aprobación",
    fill: "#CFF5EC",
    border: "#14B8A6",
    text: "#0F5C50",
    shape: "activity",
  },
  system: {
    label: "Carga en Sistema",
    fill: "#E3DBFB",
    border: "#8B5CF6",
    text: "#4C1D95",
    shape: "activity",
  },
  decision: {
    label: "Decisión",
    fill: "#FDE3C4",
    border: "#F97316",
    text: "#7C2D12",
    shape: "decision",
  },
  terminal: {
    label: "Inicio / Fin",
    fill: "#E5E7EB",
    border: "#9CA3AF",
    text: "#374151",
    shape: "terminal",
  },
};

export const CATEGORY_ORDER: NodeCategory[] = ["approval", "system", "decision", "terminal"];

/** Dimensiones reales de cada forma de nodo (deben coincidir con los componentes en components/flowchart/nodes). */
export const NODE_WIDTH: Record<NodeShape, number> = {
  activity: 200,
  decision: 170,
  terminal: 150,
};

export const NODE_HEIGHT: Record<NodeShape, number> = {
  activity: 60,
  decision: 110,
  terminal: 46,
};
