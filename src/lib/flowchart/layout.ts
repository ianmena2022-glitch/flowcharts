import type { LaneOrientation } from "./types";

export const LANE_THICKNESS = 320;
export const LANE_LENGTH = 2200;
export const LANE_CROSS_START = -60;

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

export function laneMainStart(index: number) {
  return index * LANE_THICKNESS;
}

export function laneMainCenter(index: number) {
  return laneMainStart(index) + LANE_THICKNESS / 2;
}

/** Rectángulo completo de un carril (para dibujar la banda/columna). */
export function laneRect(index: number, orientation: LaneOrientation): Rect {
  const mainStart = laneMainStart(index);
  if (orientation === "horizontal") {
    return { x: LANE_CROSS_START, y: mainStart, width: LANE_LENGTH, height: LANE_THICKNESS };
  }
  return { x: mainStart, y: LANE_CROSS_START, width: LANE_THICKNESS, height: LANE_LENGTH };
}

/** Coordenada del punto sobre el eje en el que se apilan los carriles. */
export function mainCoord(point: Point, orientation: LaneOrientation) {
  return orientation === "horizontal" ? point.y : point.x;
}

/** Coordenada del punto sobre el eje de flujo dentro de un carril. */
export function crossCoord(point: Point, orientation: LaneOrientation) {
  return orientation === "horizontal" ? point.x : point.y;
}

/** Índice del carril bajo un punto dado, acotado a los carriles existentes. */
export function laneIndexAtPoint(
  point: Point,
  orientation: LaneOrientation,
  laneCount: number
) {
  if (laneCount === 0) return -1;
  const coord = mainCoord(point, orientation);
  return Math.min(laneCount - 1, Math.max(0, Math.floor(coord / LANE_THICKNESS)));
}

/** Clampea un punto para que su coordenada principal caiga dentro del carril `index`. */
export function clampPointToLane(
  point: Point,
  index: number,
  orientation: LaneOrientation
): Point {
  const start = laneMainStart(index);
  const clampedMain = Math.min(start + LANE_THICKNESS - 110, Math.max(start + 20, mainCoord(point, orientation)));
  return orientation === "horizontal" ? { x: point.x, y: clampedMain } : { x: clampedMain, y: point.y };
}

/** Posición default para un nodo nuevo (o reordenado) según su carril y su orden dentro de él. */
export function defaultNodePosition(
  index: number,
  orientation: LaneOrientation,
  ordinalInLane: number
): Point {
  const mainCenter = laneMainCenter(index) - 40;
  const crossOffset = 80 + ordinalInLane * 260;
  return orientation === "horizontal"
    ? { x: crossOffset, y: mainCenter }
    : { x: mainCenter, y: crossOffset };
}

/** Posición de la leyenda, ubicada después del último carril sobre el eje principal. */
export function legendPosition(mainOffset: number, orientation: LaneOrientation) {
  return orientation === "horizontal"
    ? { top: mainOffset, left: LANE_CROSS_START }
    : { top: LANE_CROSS_START, left: mainOffset };
}
