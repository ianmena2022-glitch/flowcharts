import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { toPng } from "html-to-image";
import { LANE_HEIGHT, LANE_WIDTH, LANE_X_START } from "./layout";
import type { FlowchartNode, Lane } from "./types";

export const EXPORT_PADDING = 24;
const LEGEND_RESERVE = 60;

export type ExportBounds = { x: number; y: number; width: number; height: number };

export function computeExportBounds(
  lanes: Lane[],
  nodes: FlowchartNode[],
  hasLegend: boolean
): ExportBounds {
  const laneCount = Math.max(lanes.length, 1);
  const laneAreaHeight = laneCount * LANE_HEIGHT + (hasLegend ? LEGEND_RESERVE : 0);

  let minX = LANE_X_START;
  let minY = 0;
  let maxX = LANE_X_START + LANE_WIDTH;
  let maxY = laneAreaHeight;

  if (nodes.length > 0) {
    const bounds = getNodesBounds(nodes);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export async function captureFlowchartPng(bounds: ExportBounds) {
  const viewportEl = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewportEl) throw new Error("No se encontró el canvas del diagrama");

  const imageWidth = Math.ceil(bounds.width) + EXPORT_PADDING * 2;
  const imageHeight = Math.ceil(bounds.height) + EXPORT_PADDING * 2;

  const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.1, 2, "0px");

  return toPng(viewportEl, {
    backgroundColor: "#ffffff",
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
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
