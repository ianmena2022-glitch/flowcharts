import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { toPng } from "html-to-image";
import {
  DEFAULT_LANE_THICKNESS,
  LANE_CROSS_START,
  SECTION_HEADER_RESERVE,
  laneIndexAtPoint,
  laneMainStart,
  laneThickness,
  totalLanesThickness,
} from "./layout";
import type { FlowchartNode, Lane, LaneOrientation, Section } from "./types";

export const EXPORT_PADDING = 24;
/** Aire extra después del último contenido real, para que el recorte no quede pegado. */
const CONTENT_MARGIN = 120;
/** Piso para el eje de flujo cuando el diagrama todavía no tiene nodos. */
const EMPTY_CROSS_FALLBACK = 1200;

export type ExportBounds = { x: number; y: number; width: number; height: number };

/**
 * Recorta el export a donde realmente llega el contenido: sobre el eje
 * principal (donde se apilan los carriles) usa solo los carriles que
 * tienen algún nodo, en vez de sumar todos los carriles definidos; sobre
 * el eje de flujo corta un poco después del último nodo en vez de usar
 * un piso fijo enorme. Siempre se mergea con el bounding box real de los
 * nodos como red de seguridad, por si algún nodo quedó arrastrado fuera
 * de la grilla de carriles.
 */
export function computeExportBounds(
  lanes: Lane[],
  nodes: FlowchartNode[],
  orientation: LaneOrientation,
  sections: Section[] = []
): ExportBounds {
  const sortedLanes = [...lanes].sort((a, b) => a.order - b.order);
  const sectionReserve = sections.length > 0 ? SECTION_HEADER_RESERVE : 0;
  const nodeBounds = nodes.length > 0 ? getNodesBounds(nodes) : null;

  let mainStart = 0;
  let mainEnd = sortedLanes.length > 0 ? totalLanesThickness(sortedLanes) : DEFAULT_LANE_THICKNESS;
  if (sortedLanes.length > 0 && nodes.length > 0) {
    const indexes = nodes.map((n) => laneIndexAtPoint(n.position, orientation, sortedLanes));
    const minIndex = Math.min(...indexes);
    const maxIndex = Math.max(...indexes);
    mainStart = laneMainStart(sortedLanes, minIndex);
    mainEnd = laneMainStart(sortedLanes, maxIndex) + laneThickness(sortedLanes[maxIndex]);
  }

  const crossEnd = nodeBounds
    ? (orientation === "horizontal" ? nodeBounds.x + nodeBounds.width : nodeBounds.y + nodeBounds.height) +
      CONTENT_MARGIN
    : LANE_CROSS_START + EMPTY_CROSS_FALLBACK;

  let minX: number;
  let minY: number;
  let maxX: number;
  let maxY: number;

  if (orientation === "horizontal") {
    minX = LANE_CROSS_START;
    minY = mainStart - sectionReserve;
    maxX = crossEnd;
    maxY = mainEnd;
  } else {
    minX = mainStart - sectionReserve;
    minY = LANE_CROSS_START;
    maxX = mainEnd;
    maxY = crossEnd;
  }

  if (nodeBounds) {
    minX = Math.min(minX, nodeBounds.x);
    minY = Math.min(minY, nodeBounds.y);
    maxX = Math.max(maxX, nodeBounds.x + nodeBounds.width);
    maxY = Math.max(maxY, nodeBounds.y + nodeBounds.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export type CapturedPng = { dataUrl: string; width: number; height: number };

export async function captureFlowchartPng(bounds: ExportBounds): Promise<CapturedPng> {
  const viewportEl = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewportEl) throw new Error("No se encontró el canvas del diagrama");

  const imageWidth = Math.ceil(bounds.width) + EXPORT_PADDING * 2;
  const imageHeight = Math.ceil(bounds.height) + EXPORT_PADDING * 2;

  const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.1, 2, "0px");

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: "#ffffff",
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });

  return { dataUrl, width: imageWidth, height: imageHeight };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

export const EXPORT_HEADER_HEIGHT = 96;
const HEADER_HEIGHT = EXPORT_HEADER_HEIGHT;
const HEADER_PADDING = 20;
const HEADER_LOGO_SRC = "/branding/caldenes-logo.jpeg";

let cachedLogo: Promise<HTMLImageElement> | null = null;
function loadLogo(): Promise<HTMLImageElement> {
  if (!cachedLogo) cachedLogo = loadImage(HEADER_LOGO_SRC);
  return cachedLogo;
}

/** Ancho máximo de la columna de nombres de carril agregada a los exports. */
export const LANE_LABEL_GUTTER = 240;
const LANE_LABEL_PADDING = 10;
const LANE_LABEL_FONT = "600 12px Arial, sans-serif";
const LANE_LABEL_LINE_HEIGHT = 15;
const LANE_LABEL_MAX_LINES = 3;

/** Corta `text` en líneas que entren en `maxWidth`, partiendo por palabra. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(attempt).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawLaneLabelBands(
  ctx: CanvasRenderingContext2D,
  sortedLanes: Lane[],
  orientation: LaneOrientation,
  viewport: { x: number; y: number; zoom: number },
  gutterOrigin: number,
  gutterThickness: number
) {
  const isHorizontal = orientation === "horizontal";
  const panMain = isHorizontal ? viewport.y : viewport.x;

  sortedLanes.forEach((lane, index) => {
    const mainStart = laneMainStart(sortedLanes, index);
    const thickness = laneThickness(lane);
    const pixelStart = mainStart * viewport.zoom + panMain;
    const pixelEnd = (mainStart + thickness) * viewport.zoom + panMain;

    const rectX = isHorizontal ? gutterOrigin : pixelStart;
    const rectY = isHorizontal ? pixelStart : gutterOrigin;
    const rectW = isHorizontal ? gutterThickness : pixelEnd - pixelStart;
    const rectH = isHorizontal ? pixelEnd - pixelStart : gutterThickness;

    ctx.fillStyle = index % 2 === 0 ? "#f4f4f5" : "#e4e4e7";
    ctx.fillRect(rectX, rectY, rectW, rectH);
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 1;
    ctx.strokeRect(rectX + 0.5, rectY + 0.5, Math.max(0, rectW - 1), Math.max(0, rectH - 1));

    ctx.fillStyle = "#18181b";
    ctx.font = LANE_LABEL_FONT;
    ctx.textBaseline = "middle";
    const maxTextWidth = Math.max(10, rectW - LANE_LABEL_PADDING * 2);
    const lines = wrapText(ctx, lane.label, maxTextWidth).slice(0, LANE_LABEL_MAX_LINES);
    const totalTextHeight = lines.length * LANE_LABEL_LINE_HEIGHT;
    const startY = rectY + rectH / 2 - totalTextHeight / 2 + LANE_LABEL_LINE_HEIGHT / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, rectX + LANE_LABEL_PADDING, startY + i * LANE_LABEL_LINE_HEIGHT, maxTextWidth);
    });
  });
}

/** Agrega una columna con el nombre completo de cada carril (sin cortar) al
 * borde del export, alineada pixel a pixel con las bandas reales usando la
 * misma transformación de viewport con la que se capturó el contenido. */
export async function composeExportLaneLabels(
  content: CapturedPng,
  bounds: ExportBounds,
  lanes: Lane[],
  orientation: LaneOrientation
): Promise<CapturedPng> {
  const sortedLanes = [...lanes].sort((a, b) => a.order - b.order);
  if (sortedLanes.length === 0) return content;

  const img = await loadImage(content.dataUrl);
  const viewport = getViewportForBounds(bounds, content.width, content.height, 0.1, 2, "0px");
  const gutterPx = Math.round(LANE_LABEL_GUTTER * viewport.zoom);
  const isHorizontal = orientation === "horizontal";

  const canvas = document.createElement("canvas");
  canvas.width = isHorizontal ? content.width + gutterPx : content.width;
  canvas.height = isHorizontal ? content.height : content.height + gutterPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo componer los nombres de carril del export");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const contentX = isHorizontal ? gutterPx : 0;
  const contentY = isHorizontal ? 0 : gutterPx;
  ctx.drawImage(img, contentX, contentY);

  drawLaneLabelBands(ctx, sortedLanes, orientation, viewport, 0, gutterPx);

  return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}

/** Agrega una franja superior con el logo de Caldenes y el nombre del
 * flowchart encima de una imagen de export ya capturada. */
export async function composeExportHeader(
  contentDataUrl: string,
  contentWidth: number,
  contentHeight: number,
  title: string
): Promise<CapturedPng> {
  const [logo, content] = await Promise.all([loadLogo(), loadImage(contentDataUrl)]);

  const canvas = document.createElement("canvas");
  canvas.width = contentWidth;
  canvas.height = HEADER_HEIGHT + contentHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo componer el header del export");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(0, 0, canvas.width, HEADER_HEIGHT);
  ctx.strokeStyle = "#d4d4d8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_HEIGHT - 0.5);
  ctx.lineTo(canvas.width, HEADER_HEIGHT - 0.5);
  ctx.stroke();

  const logoHeight = HEADER_HEIGHT - HEADER_PADDING * 2;
  const logoWidth = logoHeight * (logo.width / logo.height);
  ctx.drawImage(logo, HEADER_PADDING, HEADER_PADDING, logoWidth, logoHeight);

  ctx.fillStyle = "#18181b";
  ctx.font = "600 26px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(title, HEADER_PADDING * 2 + logoWidth, HEADER_HEIGHT / 2 + 1);

  ctx.drawImage(content, 0, HEADER_HEIGHT, contentWidth, contentHeight);

  return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}

const DIACRITICS_REGEX = /[̀-ͯ]/g;

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(DIACRITICS_REGEX, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "flowchart"
  );
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}
