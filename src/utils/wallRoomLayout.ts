import { DetectedWall, FloorPlanAnalysis, FloorPlanRoom } from '../types/floorPlan';

export type WallBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  length: number;
};

type GridCell = {
  x: number;
  y: number;
  width: number;
  length: number;
};

const GRID_MERGE_TOLERANCE = 0.12;
const CELL_INSET = 0.05;
const MIN_CELL_SIZE = 0.35;

export function getWallBounds(walls: DetectedWall[]): WallBounds | null {
  if (!walls.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  walls.forEach((wall) => {
    minX = Math.min(minX, wall.x);
    minY = Math.min(minY, wall.y);
    maxX = Math.max(maxX, wall.x + wall.width);
    maxY = Math.max(maxY, wall.y + wall.length);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    length: maxY - minY,
  };
}

function mergeAxisValues(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const merged: number[] = [];

  sorted.forEach((value) => {
    const last = merged[merged.length - 1];
    if (last === undefined || Math.abs(value - last) > GRID_MERGE_TOLERANCE) {
      merged.push(value);
    }
  });

  return merged;
}

function collectGridLines(walls: DetectedWall[]) {
  const xs: number[] = [];
  const ys: number[] = [];

  walls.forEach((wall) => {
    xs.push(wall.x, wall.x + wall.width);
    ys.push(wall.y, wall.y + wall.length);
  });

  return {
    xs: mergeAxisValues(xs),
    ys: mergeAxisValues(ys),
  };
}

function pointInsideWall(x: number, y: number, wall: DetectedWall): boolean {
  return (
    x >= wall.x &&
    x <= wall.x + wall.width &&
    y >= wall.y &&
    y <= wall.y + wall.length
  );
}

function overlapArea(a: GridCell, b: Pick<FloorPlanRoom, 'x' | 'y' | 'width' | 'length'>) {
  const overlapWidth = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const overlapLength = Math.max(
    0,
    Math.min(a.y + a.length, b.y + b.length) - Math.max(a.y, b.y),
  );
  return overlapWidth * overlapLength;
}

function computeInteriorCells(walls: DetectedWall[], bounds: WallBounds): GridCell[] {
  const { xs, ys } = collectGridLines(walls);
  const cells: GridCell[] = [];

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      const cell: GridCell = {
        x: xs[xi],
        y: ys[yi],
        width: xs[xi + 1] - xs[xi],
        length: ys[yi + 1] - ys[yi],
      };

      if (cell.width < MIN_CELL_SIZE || cell.length < MIN_CELL_SIZE) continue;

      const centerX = cell.x + cell.width / 2;
      const centerY = cell.y + cell.length / 2;
      if (walls.some((wall) => pointInsideWall(centerX, centerY, wall))) continue;

      const area = cell.width * cell.length;
      const boundsArea = bounds.width * bounds.length;
      if (area < 0.45 || area > boundsArea * 0.82) continue;

      cells.push(cell);
    }
  }

  return cells.sort((a, b) => b.width * b.length - a.width * a.length);
}

export function snapRoomsToWallCells(
  walls: DetectedWall[],
  rooms: FloorPlanRoom[],
): FloorPlanRoom[] {
  const bounds = getWallBounds(walls);
  if (!bounds || !rooms.length) return rooms;

  const cells = computeInteriorCells(walls, bounds);
  if (!cells.length) return rooms;

  const usedCells = new Set<number>();

  return rooms.map((room) => {
    let bestIndex = -1;
    let bestScore = 0;

    cells.forEach((cell, index) => {
      if (usedCells.has(index)) return;
      const score = overlapArea(cell, room);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      const roomCenterX = room.x + room.width / 2;
      const roomCenterY = room.y + room.length / 2;

      cells.forEach((cell, index) => {
        if (usedCells.has(index)) return;
        const cellCenterX = cell.x + cell.width / 2;
        const cellCenterY = cell.y + cell.length / 2;
        const distance = Math.hypot(roomCenterX - cellCenterX, roomCenterY - cellCenterY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      bestIndex = nearestIndex;
    }

    usedCells.add(bestIndex);
    const cell = cells[bestIndex];

    return {
      ...room,
      x: cell.x + CELL_INSET,
      y: cell.y + CELL_INSET,
      width: Math.max(cell.width - CELL_INSET * 2, MIN_CELL_SIZE),
      length: Math.max(cell.length - CELL_INSET * 2, MIN_CELL_SIZE),
    };
  });
}

function shiftWall(wall: DetectedWall, dx: number, dy: number): DetectedWall {
  return { ...wall, x: wall.x - dx, y: wall.y - dy };
}

function shiftRoom(room: FloorPlanRoom, dx: number, dy: number): FloorPlanRoom {
  return {
    ...room,
    x: room.x - dx,
    y: room.y - dy,
    vertices: room.vertices?.map((vertex) => ({ x: vertex.x - dx, y: vertex.y - dy })),
  };
}

function renumberWalls(walls: DetectedWall[]): DetectedWall[] {
  return walls.map((wall, index) => ({ ...wall, number: index + 1 }));
}

export function applyWallLayout(plan: FloorPlanAnalysis): FloorPlanAnalysis {
  const walls = plan.detectedWalls ?? [];
  const bounds = getWallBounds(walls);
  if (!bounds) return plan;

  const shiftedWalls = walls.map((wall) => shiftWall(wall, bounds.minX, bounds.minY));
  const shiftedRooms = plan.rooms.map((room) => shiftRoom(room, bounds.minX, bounds.minY));
  const snappedRooms = snapRoomsToWallCells(shiftedWalls, shiftedRooms);

  return {
    ...plan,
    totalWidth: bounds.width,
    totalLength: bounds.length,
    detectedWalls: renumberWalls(shiftedWalls),
    rooms: snappedRooms,
    footprint: plan.footprint?.map((point) => ({
      x: point.x - bounds.minX,
      y: point.y - bounds.minY,
    })),
  };
}

export function getWallDisplayNumber(wall: DetectedWall, index: number): number {
  return wall.number ?? index + 1;
}
