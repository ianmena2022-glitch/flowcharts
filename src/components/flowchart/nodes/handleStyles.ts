import type { CSSProperties } from "react";

/** Estilos de handle invisibles que cubren todo el lado del nodo (no un
 * puntito en el centro), para poder tirar una flecha desde cualquier
 * parte del borde. Sirven para nodos rectangulares/píldora (actividad,
 * inicio/fin) — un rombo (decisión) no tiene "lado", solo un vértice, así
 * que ese nodo usa handles puntuales en vez de estos. */
export const SIDE_HANDLE_STYLE: Record<"left" | "right" | "top" | "bottom", CSSProperties> = {
  left: {
    left: 0,
    top: 0,
    width: 14,
    height: "100%",
    transform: "none",
    borderRadius: 0,
    background: "transparent",
    border: "none",
    opacity: 0,
  },
  right: {
    right: 0,
    left: "auto",
    top: 0,
    width: 14,
    height: "100%",
    transform: "none",
    borderRadius: 0,
    background: "transparent",
    border: "none",
    opacity: 0,
  },
  top: {
    top: 0,
    left: 0,
    height: 14,
    width: "100%",
    transform: "none",
    borderRadius: 0,
    background: "transparent",
    border: "none",
    opacity: 0,
  },
  bottom: {
    bottom: 0,
    top: "auto",
    left: 0,
    height: 14,
    width: "100%",
    transform: "none",
    borderRadius: 0,
    background: "transparent",
    border: "none",
    opacity: 0,
  },
};

/** Handle invisible pero puntual (para el vértice de un rombo). */
export const POINT_HANDLE_STYLE: CSSProperties = { opacity: 0 };
