import type { Lane, LaneOrientation, Section } from "./types";

export const DEFAULT_LANE_THICKNESS = 180;
/** Piso mínimo para el largo de los carriles (diagramas chicos o vacíos). */
export const LANE_LENGTH = 10200;
/** Aire extra después del último contenido, para que el carril no corte justo al final. */
const LANE_LENGTH_MARGIN = 400;
export const LANE_CROSS_START = -60;
export const CROSS_START = 60;
export const CROSS_STEP = 190;

export const DEFAULT_SECTION_LENGTH = 900;
const SECTION_HEADER_HEIGHT = 34;
const SECTION_HEADER_GAP = 16;
/** Espacio reservado antes del primer carril para la cabecera de los subprocesos. */
export const SECTION_HEADER_RESERVE = SECTION_HEADER_HEIGHT + SECTION_HEADER_GAP;
/** Margen entre el borde de un subproceso y el primer nodo que contiene. */
const SECTION_LEFT_MARGIN = 40;

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

/**
 * Recalcula la posición de un nodo para que "siga" a su carril cuando el
 * stacking cambia (se borra, se reordena o se redimensiona un carril),
 * preservando el offset relativo exacto del nodo dentro de su banda —
 * no lo re-centra, solo lo desplaza lo mismo que se desplazó el carril.
 * Si el carril ya no existe (se acaba de borrar), devuelve la posición sin
 * tocar — el llamador debe reasignar ese nodo a otro carril aparte.
 */
export function shiftPositionForLaneChange(
  position: Point,
  laneId: string,
  oldSortedLanes: Lane[],
  newSortedLanes: Lane[],
  orientation: LaneOrientation
): Point {
  const oldIndex = oldSortedLanes.findIndex((l) => l.id === laneId);
  const newIndex = newSortedLanes.findIndex((l) => l.id === laneId);
  if (oldIndex === -1 || newIndex === -1) return position;
  const delta = laneMainStart(newSortedLanes, newIndex) - laneMainStart(oldSortedLanes, oldIndex);
  if (delta === 0) return position;
  return orientation === "horizontal"
    ? { x: position.x, y: position.y + delta }
    : { x: position.x + delta, y: position.y };
}

/** Rectángulo completo de un carril (para dibujar la banda/columna). */
export function laneRect(
  sortedLanes: Lane[],
  index: number,
  orientation: LaneOrientation,
  length: number = LANE_LENGTH
): Rect {
  const mainStart = laneMainStart(sortedLanes, index);
  const thickness = laneThickness(sortedLanes[index]);
  if (orientation === "horizontal") {
    return { x: LANE_CROSS_START, y: mainStart, width: length, height: thickness };
  }
  return { x: mainStart, y: LANE_CROSS_START, width: thickness, height: length };
}

/**
 * Largo real necesario para que los carriles cubran todo el contenido: el mayor entre
 * el piso default, la suma de los subprocesos y la posición del nodo más lejano.
 */
export function laneLength(
  sortedSections: Section[],
  nodes: { position: Point }[],
  orientation: LaneOrientation
): number {
  const fromSections = sortedSections.length > 0 ? totalSectionsLength(sortedSections) : 0;
  const fromNodes = nodes.reduce(
    (max, n) => Math.max(max, crossCoord(n.position, orientation)),
    0
  );
  return Math.max(LANE_LENGTH, fromSections, fromNodes + LANE_LENGTH_MARGIN);
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

export function sectionLength(section: Section) {
  return section.length ?? DEFAULT_SECTION_LENGTH;
}

export function totalSectionsLength(sortedSections: Section[]) {
  return sortedSections.reduce((sum, s) => sum + sectionLength(s), 0);
}

/** Coordenada de inicio (eje de flujo) del subproceso `index`, alineada con `CROSS_START`. */
export function sectionCrossStart(sortedSections: Section[], index: number) {
  let start = CROSS_START - SECTION_LEFT_MARGIN;
  for (let i = 0; i < index; i++) start += sectionLength(sortedSections[i]);
  return start;
}

/** Rectángulo completo de un subproceso: franja que atraviesa todos los carriles + su cabecera. */
export function sectionRect(
  sortedSections: Section[],
  index: number,
  orientation: LaneOrientation,
  sortedLanes: Lane[]
): Rect {
  const crossStart = sectionCrossStart(sortedSections, index);
  const length = sectionLength(sortedSections[index]);
  const mainSpan = totalLanesThickness(sortedLanes);
  return orientation === "horizontal"
    ? { x: crossStart, y: -SECTION_HEADER_RESERVE, width: length, height: mainSpan + SECTION_HEADER_RESERVE }
    : { x: -SECTION_HEADER_RESERVE, y: crossStart, width: mainSpan + SECTION_HEADER_RESERVE, height: length };
}

/** Rectángulo de la cabecera (título) de un subproceso, antes del primer carril. */
export function sectionHeaderRect(
  sortedSections: Section[],
  index: number,
  orientation: LaneOrientation
): Rect {
  const crossStart = sectionCrossStart(sortedSections, index);
  const length = sectionLength(sortedSections[index]);
  return orientation === "horizontal"
    ? { x: crossStart, y: -SECTION_HEADER_RESERVE, width: length, height: SECTION_HEADER_HEIGHT }
    : { x: -SECTION_HEADER_RESERVE, y: crossStart, width: SECTION_HEADER_HEIGHT, height: length };
}
