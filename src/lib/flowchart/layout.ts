export const LANE_HEIGHT = 160;
export const LANE_WIDTH = 1800;
export const LANE_X_START = -60;

export function laneTop(index: number) {
  return index * LANE_HEIGHT;
}

export function laneCenter(index: number) {
  return laneTop(index) + LANE_HEIGHT / 2;
}
