import type { Lane, LaneOrientation } from "./types";

export const DEFAULT_LANE_THICKNESS = 240;
export const LANE_LENGTH = 12200;
export const LANE_CROSS_START = -60;
export const CROSS_START = 70;
export const CROSS_STEP = 210;

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

export function laneThickness(lane: Lane) {
  return lane.thickness ?? DEFAULT_LANE_THICKNESS;
}

export function totalLanesThickness(sortedLanes: Lane[]) {
  return sortedLanes.reduce((sum, l) => sum + laneThickness(l), 0);
}

export function laneMainStart(sortedLanes: Lane[], index: number) {
  let start = 0;
  for (let i = 0; i < index; i++) start += laneThickness(sortedLanes[i]);
  return start;
}

export function laneMainCenter(sortedLanes: Lane[], index: number) {
  return laneMainStart(sortedLanes, index) + laneThickness(sortedLanes[index]) / 2;
}

/** Rectángulo completo de un carril (para dibujar la banda/columna). */
export function laneRect(sortedLanes: Lane[], index: number, orientation: LaneOrientation): Rect {
  const mainStart = laneMainStart(sortedLanes, index);
  const thickness = laneThickness(sortedLanes[index]);
  if (orientation === "horizontal") {
    return { x: LANE_CROSS_START, y: mainStart, width: LANE_LENGTH, height: thickness };
  }
  return { x: mainStart, y: LANE_CROSS_START, width: thickness, height: LANE_LENGTH };
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
  sortedLanes: Lane[]
) {
  if (sortedLanes.length === 0) return -1;
  const coord = mainCoord(point, orientation);
  let acc = 0;
  for (let i = 0; i < sortedLanes.length; i++) {
    const thickness = laneThickness(sortedLanes[i]);
    if (coord < acc + thickness || i === sortedLanes.length - 1) return i;
    acc += thickness;
  }
  return sortedLanes.length - 1;
}

/** Clampea un punto para que su coordenada principal caiga dentro del carril `index`. */
export function clampPointToLane(
  point: Point,
  sortedLanes: Lane[],
  index: number,
  orientation: LaneOrientation
): Point {
  const start = laneMainStart(sortedLanes, index);
  const thickness = laneThickness(sortedLanes[index]);
  const margin = Math.min(20, thickness / 4);
  const clampedMain = Math.min(
    start + thickness - margin - 100,
    Math.max(start + margin, mainCoord(point, orientation))
  );
  return orientation === "horizontal" ? { x: point.x, y: clampedMain } : { x: clampedMain, y: point.y };
}

/**
 * Posición default para un nodo nuevo (o reordenado) según su carril y su orden dentro de él.
 * `nodeMainSize` es el ancho del nodo (orientación vertical) o el alto (horizontal), para
 * centrarlo correctamente dentro del carril sin importar cuán ancho sea éste.
 */
export function defaultNodePosition(
  sortedLanes: Lane[],
  index: number,
  orientation: LaneOrientation,
  ordinalInLane: number,
  nodeMainSize: number
): Point {
  const mainCenter = laneMainCenter(sortedLanes, index) - nodeMainSize / 2;
  const crossOffset = CROSS_START + ordinalInLane * CROSS_STEP;
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
