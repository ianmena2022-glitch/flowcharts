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
    fill: "#065F46",
    border: "#34D399",
    text: "#ECFDF5",
    shape: "activity",
  },
  system: {
    label: "Carga en Sistema",
    fill: "#5B21B6",
    border: "#C4B5FD",
    text: "#F5F3FF",
    shape: "activity",
  },
  decision: {
    label: "Decisión",
    fill: "#B45309",
    border: "#FBBF24",
    text: "#FFFBEB",
    shape: "decision",
  },
  terminal: {
    label: "Inicio / Fin",
    fill: "#334155",
    border: "#94A3B8",
    text: "#F1F5F9",
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

/** Ancho/alto efectivo de un nodo: el propio (si fue redimensionado a mano)
 * o el default de su forma. React Flow pasa 0 (no null/undefined) antes de
 * medir por primera vez, por eso `||` en vez de `??`. */
export function nodeDimensions(node: {
  width?: number | null;
  height?: number | null;
  data: { category: NodeCategory };
}): { width: number; height: number } {
  const shape = CATEGORY_CONFIG[node.data.category].shape;
  return {
    width: node.width || NODE_WIDTH[shape],
    height: node.height || NODE_HEIGHT[shape],
  };
}
