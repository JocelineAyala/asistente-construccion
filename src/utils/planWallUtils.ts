import { DetectedWall, FloorPlanRoom } from '../types/floorPlan';

export const WALL_ZONE_OPTIONS = [
  { value: 'living', label: 'Sala / comedor' },
  { value: 'kitchen', label: 'Cocina' },
  { value: 'bedroom', label: 'Dormitorio' },
  { value: 'bathroom', label: 'Baño' },
  { value: 'hall', label: 'Pasillo' },
  { value: 'other', label: 'Otro / muro' },
] as const;

export const WALL_ZONE_COLORS: Record<string, number> = {
  living: 0x46a8ef,
  kitchen: 0xf59e0b,
  bedroom: 0x00937e,
  bathroom: 0x7c3aed,
  hall: 0x64748b,
  other: 0xcbd5e1,
};

export const WALL_DISPLAY_THICKNESS = 0.07;

export function inferWallZone(wall: DetectedWall, rooms: FloorPlanRoom[]): string {
  const centerX = wall.x + wall.width / 2;
  const centerY = wall.y + wall.length / 2;

  let nearestRoom = rooms[0];
  let nearestDistance = Infinity;

  rooms.forEach((room) => {
    const roomCenterX = room.x + room.width / 2;
    const roomCenterY = room.y + room.length / 2;
    const distance = Math.hypot(centerX - roomCenterX, centerY - roomCenterY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRoom = room;
    }
  });

  return nearestRoom?.type || 'other';
}

export function ensureWallMetadata(
  walls: DetectedWall[],
  rooms: FloorPlanRoom[],
): DetectedWall[] {
  return walls.map((wall, index) => {
    const orientation =
      wall.orientation ?? (wall.width >= wall.length ? 'horizontal' : 'vertical');
    return {
      ...normalizeWallDimensions({ ...wall, orientation }),
      id: wall.id || `wall-${index + 1}`,
      number: wall.number ?? index + 1,
      zone: wall.zone || inferWallZone(wall, rooms),
    };
  });
}

export function getWallColor(wall: DetectedWall, rooms: FloorPlanRoom[]): number {
  const zone = wall.zone || inferWallZone(wall, rooms);
  return WALL_ZONE_COLORS[zone] ?? WALL_ZONE_COLORS.other;
}

export function normalizeWallDimensions(wall: DetectedWall): DetectedWall {
  if (wall.orientation === 'horizontal') {
    return {
      ...wall,
      width: Math.max(wall.width, 0.2),
      length: Math.min(Math.max(wall.length, 0.04), WALL_DISPLAY_THICKNESS),
    };
  }

  return {
    ...wall,
    width: Math.min(Math.max(wall.width, 0.04), WALL_DISPLAY_THICKNESS),
    length: Math.max(wall.length, 0.2),
  };
}
