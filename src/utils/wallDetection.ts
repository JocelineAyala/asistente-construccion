import { DetectedWall, FloorPlanRoom } from '../types/floorPlan';

const INK_THRESHOLD = 232;
const WALL_THICKNESS_METERS = 0.07;
const MIN_SPAN_RATIO = 0.07;
const MERGE_AXIS_TOLERANCE_PX = 6;
const MERGE_GAP_TOLERANCE_PX = 8;

type InkRun = {
  orientation: 'horizontal' | 'vertical';
  fixed: number;
  start: number;
  end: number;
};

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar el boceto.'));
    image.src = dataUrl;
  });
}

function isInk(data: Uint8ClampedArray, width: number, x: number, y: number): boolean {
  const index = (y * width + x) * 4;
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const alpha = data[index + 3];
  return alpha > 20 && (red + green + blue) / 3 < INK_THRESHOLD;
}

function readImageData(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo leer el boceto.');
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function parseOcrMetersFromNotes(notes: string[]): number[] {
  const values: number[] = [];

  notes.forEach((note) => {
    const matches = note.match(/(\d+(?:[.,]\d+)?)\s*m\b/gi);
    matches?.forEach((match) => {
      const numeric = Number(match.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (Number.isFinite(numeric) && numeric > 0 && numeric <= 100) {
        values.push(numeric);
      }
    });
  });

  return values;
}

export function scaleRoomsToPlan(
  rooms: FloorPlanRoom[],
  sourceWidth: number,
  sourceLength: number,
  targetWidth: number,
  targetLength: number,
): FloorPlanRoom[] {
  if (!rooms.length || sourceWidth <= 0 || sourceLength <= 0) {
    return rooms;
  }

  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetLength / sourceLength;

  return rooms.map((room) => ({
    ...room,
    x: room.x * scaleX,
    y: room.y * scaleY,
    width: room.width * scaleX,
    length: room.length * scaleY,
    vertices: room.vertices?.map((vertex) => ({
      x: vertex.x * scaleX,
      y: vertex.y * scaleY,
    })),
  }));
}

function collectHorizontalRuns(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): InkRun[] {
  const runs: InkRun[] = [];
  const minSpan = width * MIN_SPAN_RATIO;

  for (let y = 0; y < height; y += 1) {
    let runStart = -1;
    for (let x = 0; x <= width; x += 1) {
      const hasInk = x < width && isInk(data, width, x, y);
      if (hasInk && runStart === -1) runStart = x;
      if ((!hasInk || x === width) && runStart !== -1) {
        const runLength = x - runStart;
        if (runLength >= minSpan && runLength <= width * 0.96) {
          runs.push({
            orientation: 'horizontal',
            fixed: y,
            start: runStart,
            end: x - 1,
          });
        }
        runStart = -1;
      }
    }
  }

  return runs;
}

function collectVerticalRuns(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): InkRun[] {
  const runs: InkRun[] = [];
  const minSpan = height * MIN_SPAN_RATIO;

  for (let x = 0; x < width; x += 1) {
    let runStart = -1;
    for (let y = 0; y <= height; y += 1) {
      const hasInk = y < height && isInk(data, width, x, y);
      if (hasInk && runStart === -1) runStart = y;
      if ((!hasInk || y === height) && runStart !== -1) {
        const runLength = y - runStart;
        if (runLength >= minSpan && runLength <= height * 0.96) {
          runs.push({
            orientation: 'vertical',
            fixed: x,
            start: runStart,
            end: y - 1,
          });
        }
        runStart = -1;
      }
    }
  }

  return runs;
}

function mergeRuns(runs: InkRun[]): InkRun[] {
  if (!runs.length) return [];

  const sorted = [...runs].sort((a, b) => a.fixed - b.fixed || a.start - b.start);
  const merged: InkRun[] = [];

  sorted.forEach((run) => {
    const matchIndex = merged.findIndex((existing) => {
      if (existing.orientation !== run.orientation) return false;
      if (Math.abs(existing.fixed - run.fixed) > MERGE_AXIS_TOLERANCE_PX) return false;
      const gap = run.start > existing.end ? run.start - existing.end : existing.start - run.end;
      return gap <= MERGE_GAP_TOLERANCE_PX;
    });

    if (matchIndex === -1) {
      merged.push({ ...run });
      return;
    }

    const existing = merged[matchIndex];
    existing.start = Math.min(existing.start, run.start);
    existing.end = Math.max(existing.end, run.end);
    existing.fixed = Math.round((existing.fixed + run.fixed) / 2);
  });

  return merged;
}

function runsToWalls(
  runs: InkRun[],
  imageWidth: number,
  imageHeight: number,
  totalWidth: number,
  totalLength: number,
  idOffset: number,
): DetectedWall[] {
  return runs.map((run, index) => {
    if (run.orientation === 'horizontal') {
      const x = (run.start / imageWidth) * totalWidth;
      const y = (run.fixed / imageHeight) * totalLength;
      const width = ((run.end - run.start + 1) / imageWidth) * totalWidth;
      return {
        id: `wall-ink-${idOffset + index + 1}`,
        x,
        y: y - WALL_THICKNESS_METERS / 2,
        width,
        length: WALL_THICKNESS_METERS,
        confidence: 0.7,
        orientation: 'horizontal' as const,
        zone: 'other',
      };
    }

    const x = (run.fixed / imageWidth) * totalWidth;
    const y = (run.start / imageHeight) * totalLength;
    const length = ((run.end - run.start + 1) / imageHeight) * totalLength;
    return {
      id: `wall-ink-${idOffset + index + 1}`,
      x: x - WALL_THICKNESS_METERS / 2,
      y,
      width: WALL_THICKNESS_METERS,
      length,
      confidence: 0.7,
      orientation: 'vertical' as const,
      zone: 'other',
    };
  });
}

function mergeCollinearWalls(walls: DetectedWall[]): DetectedWall[] {
  const horizontal = walls.filter((wall) => wall.orientation === 'horizontal');
  const vertical = walls.filter((wall) => wall.orientation === 'vertical');
  const merged: DetectedWall[] = [];

  const mergeGroup = (group: DetectedWall[], axis: 'horizontal' | 'vertical') => {
    const sorted = [...group].sort((a, b) =>
      axis === 'horizontal' ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y,
    );

    sorted.forEach((wall) => {
      const match = merged.find((existing) => {
        if (existing.orientation !== axis) return false;
        if (axis === 'horizontal') {
          if (Math.abs(existing.y - wall.y) > 0.14) return false;
          const gap =
            wall.x > existing.x + existing.width
              ? wall.x - (existing.x + existing.width)
              : existing.x - (wall.x + wall.width);
          return gap <= 0.2;
        }

        if (Math.abs(existing.x - wall.x) > 0.14) return false;
        const gap =
          wall.y > existing.y + existing.length
            ? wall.y - (existing.y + existing.length)
            : existing.y - (wall.y + wall.length);
        return gap <= 0.2;
      });

      if (!match) {
        merged.push({ ...wall });
        return;
      }

      if (axis === 'horizontal') {
        const left = Math.min(match.x, wall.x);
        const right = Math.max(match.x + match.width, wall.x + wall.width);
        match.x = left;
        match.width = right - left;
        match.y = (match.y + wall.y) / 2;
      } else {
        const top = Math.min(match.y, wall.y);
        const bottom = Math.max(match.y + match.length, wall.y + wall.length);
        match.y = top;
        match.length = bottom - top;
        match.x = (match.x + wall.x) / 2;
      }
    });
  };

  mergeGroup(horizontal, 'horizontal');
  mergeGroup(vertical, 'vertical');
  return merged;
}

function dedupeWalls(walls: DetectedWall[]): DetectedWall[] {
  const kept: DetectedWall[] = [];

  walls.forEach((wall) => {
    const duplicate = kept.some((existing) => {
      if (existing.orientation !== wall.orientation) return false;

      if (wall.orientation === 'horizontal') {
        const sameRow = Math.abs(existing.y - wall.y) < 0.18;
        const overlap =
          Math.min(existing.x + existing.width, wall.x + wall.width) -
            Math.max(existing.x, wall.x) >
          Math.min(existing.width, wall.width) * 0.55;
        return sameRow && overlap;
      }

      const sameColumn = Math.abs(existing.x - wall.x) < 0.18;
      const overlap =
        Math.min(existing.y + existing.length, wall.y + wall.length) -
          Math.max(existing.y, wall.y) >
        Math.min(existing.length, wall.length) * 0.55;
      return sameColumn && overlap;
    });

    if (!duplicate) kept.push(wall);
  });

  return kept.slice(0, 32);
}

export async function extractInkWallSegments(
  dataUrl: string,
  totalWidth: number,
  totalLength: number,
): Promise<DetectedWall[]> {
  const image = await loadImage(dataUrl);
  const imageData = readImageData(image);
  const { data, width, height } = imageData;

  const horizontalRuns = mergeRuns(collectHorizontalRuns(data, width, height));
  const verticalRuns = mergeRuns(collectVerticalRuns(data, width, height));

  const horizontalWalls = runsToWalls(
    horizontalRuns,
    width,
    height,
    totalWidth,
    totalLength,
    0,
  );
  const verticalWalls = runsToWalls(
    verticalRuns,
    width,
    height,
    totalWidth,
    totalLength,
    horizontalWalls.length,
  );

  return dedupeWalls(mergeCollinearWalls([...horizontalWalls, ...verticalWalls]));
}

export function mergeWallSegments(walls: DetectedWall[]): DetectedWall[] {
  return dedupeWalls(walls);
}
