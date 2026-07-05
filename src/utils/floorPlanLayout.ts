import { FloorPlanAnalysis, FloorPlanPoint, FloorPlanRoom } from '../types/floorPlan';

function shiftPoint(point: FloorPlanPoint, dx: number, dy: number): FloorPlanPoint {
  return { x: point.x - dx, y: point.y - dy };
}

function scalePoint(point: FloorPlanPoint, sx: number, sy: number): FloorPlanPoint {
  return { x: point.x * sx, y: point.y * sy };
}

function scaleRoom(room: FloorPlanRoom, sx: number, sy: number): FloorPlanRoom {
  return {
    ...room,
    x: room.x * sx,
    y: room.y * sy,
    width: room.width * sx,
    length: room.length * sy,
    vertices: room.vertices?.map((vertex) => scalePoint(vertex, sx, sy)),
  };
}

function getRoomBounds(rooms: FloorPlanRoom[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;

  for (const room of rooms) {
    minX = Math.min(minX, room.x);
    minY = Math.min(minY, room.y);
    maxX = Math.max(maxX, room.x + room.width);
    maxY = Math.max(maxY, room.y + room.length);

    room.vertices?.forEach((vertex) => {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    });
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, length: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    length: maxY - minY,
  };
}

export function normalizeRoomLayout(
  plan: FloorPlanAnalysis,
  options?: { targetAspectRatio?: number },
): FloorPlanAnalysis {
  if (!plan.rooms.length) {
    return plan;
  }

  const bounds = getRoomBounds(plan.rooms);
  const originX = bounds.minX;
  const originY = bounds.minY;

  let rooms: FloorPlanRoom[] = plan.rooms.map((room) => ({
    ...room,
    x: room.x - originX,
    y: room.y - originY,
    vertices: room.vertices?.map((vertex) => shiftPoint(vertex, originX, originY)),
  }));

  let footprint = plan.footprint?.map((point) => shiftPoint(point, originX, originY));

  let totalWidth = Math.max(bounds.width, 0.1);
  let totalLength = Math.max(bounds.length, 0.1);

  const targetAspectRatio = options?.targetAspectRatio;
  if (targetAspectRatio && totalLength > 0) {
    const layoutAspect = totalWidth / totalLength;
    const aspectGap = Math.abs(layoutAspect - targetAspectRatio) / targetAspectRatio;

    if (aspectGap > 0.12) {
      if (layoutAspect > targetAspectRatio) {
        const scaleY = layoutAspect / targetAspectRatio;
        rooms = rooms.map((room) => scaleRoom(room, 1, scaleY));
        footprint = footprint?.map((point) => scalePoint(point, 1, scaleY));
        totalLength *= scaleY;
      } else {
        const scaleX = targetAspectRatio / layoutAspect;
        rooms = rooms.map((room) => scaleRoom(room, scaleX, 1));
        footprint = footprint?.map((point) => scalePoint(point, scaleX, 1));
        totalWidth *= scaleX;
      }
    }
  }

  const refreshedBounds = getRoomBounds(rooms);
  const hasWalls = (plan.detectedWalls?.length ?? 0) > 0;

  if (hasWalls) {
    totalWidth = plan.totalWidth;
    totalLength = plan.totalLength;
  } else {
    totalWidth = Math.max(totalWidth, refreshedBounds.width, plan.totalWidth);
    totalLength = Math.max(totalLength, refreshedBounds.length, plan.totalLength);
  }

  return {
    ...plan,
    rooms,
    footprint,
    totalWidth,
    totalLength,
  };
}

export function convertNormalizedFootprint(
  points: FloorPlanPoint[] | undefined,
  totalWidth: number,
  totalLength: number,
): FloorPlanPoint[] | undefined {
  if (!points?.length) return undefined;

  return points.map((point) => ({
    x: point.x * totalWidth,
    y: point.y * totalLength,
  }));
}
