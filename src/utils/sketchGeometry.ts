import { FloorPlanAnalysis, FloorPlanPoint } from '../types/floorPlan';
import { SketchPipelineResult } from '../services/floorPlanPipeline/types';
import { runSketchEnhancementPipeline } from '../services/floorPlanPipeline';
import {
  extractInkWallSegments,
  mergeWallSegments,
  parseOcrMetersFromNotes,
  scaleRoomsToPlan,
} from './wallDetection';
import { ensureWallMetadata } from './planWallUtils';
import { normalizeRoomLayout } from './floorPlanLayout';
import { applyWallLayout } from './wallRoomLayout';

export type ProcessedSketch = {
  croppedDataUrl: string;
  base64: string;
  width: number;
  height: number;
  aspectRatio: number;
};

export type SketchGeometry = {
  footprintNormalized: FloorPlanPoint[];
  croppedDataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
};

const INK_THRESHOLD = 232;
const CROP_PADDING = 12;
const FOOTPRINT_MARGIN = 0.03;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar el boceto.'));
    image.src = dataUrl;
  });
}

function isInk(data: Uint8ClampedArray, index: number): boolean {
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

  if (!context) {
    throw new Error('No se pudo procesar el canvas del boceto.');
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return { canvas, context, imageData };
}

function findInkBoundsFromData(imageData: ImageData) {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let inkCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (!isInk(data, index)) continue;

      inkCount += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (inkCount === 0) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function findInkBounds(imageData: ImageData) {
  const bounds = findInkBoundsFromData(imageData);
  if (!bounds) return null;

  const { width, height } = imageData;
  return {
    minX: Math.max(0, bounds.minX - CROP_PADDING),
    minY: Math.max(0, bounds.minY - CROP_PADDING),
    maxX: Math.min(width - 1, bounds.maxX + CROP_PADDING),
    maxY: Math.min(height - 1, bounds.maxY + CROP_PADDING),
  };
}

function cropImageData(
  sourceCanvas: HTMLCanvasElement,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
  const cropWidth = bounds.maxX - bounds.minX + 1;
  const cropHeight = bounds.maxY - bounds.minY + 1;
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropContext = cropCanvas.getContext('2d');

  if (!cropContext) {
    throw new Error('No se pudo recortar el boceto.');
  }

  cropContext.drawImage(
    sourceCanvas,
    bounds.minX,
    bounds.minY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return {
    dataUrl: cropCanvas.toDataURL('image/png'),
    width: cropWidth,
    height: cropHeight,
    imageData: cropContext.getImageData(0, 0, cropWidth, cropHeight),
  };
}


function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function rectangleFootprintFromInk(imageData: ImageData): FloorPlanPoint[] {
  const bounds = findInkBoundsFromData(imageData);
  if (!bounds) return fallbackRectangleFootprint();

  const { width, height } = imageData;
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const marginX = spanX * FOOTPRINT_MARGIN;
  const marginY = spanY * FOOTPRINT_MARGIN;

  return [
    {
      x: clamp01((bounds.minX - marginX) / width),
      y: clamp01((bounds.minY - marginY) / height),
    },
    {
      x: clamp01((bounds.maxX + marginX) / width),
      y: clamp01((bounds.minY - marginY) / height),
    },
    {
      x: clamp01((bounds.maxX + marginX) / width),
      y: clamp01((bounds.maxY + marginY) / height),
    },
    {
      x: clamp01((bounds.minX - marginX) / width),
      y: clamp01((bounds.maxY + marginY) / height),
    },
  ];
}

function traceFootprintPolygon(imageData: ImageData): FloorPlanPoint[] {
  return rectangleFootprintFromInk(imageData);
}

function fallbackRectangleFootprint(): FloorPlanPoint[] {
  return [
    { x: 0.05, y: 0.05 },
    { x: 0.95, y: 0.05 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 },
  ];
}

export async function preprocessSketch(dataUrl: string): Promise<ProcessedSketch> {
  const image = await loadImage(dataUrl);
  const { canvas, imageData } = readImageData(image);
  const bounds = findInkBounds(imageData);

  if (!bounds) {
    return {
      croppedDataUrl: dataUrl,
      base64: dataUrl.split(',')[1] || '',
      width: image.naturalWidth,
      height: image.naturalHeight,
      aspectRatio: image.naturalWidth / Math.max(image.naturalHeight, 1),
    };
  }

  const cropped = cropImageData(canvas, bounds);

  return {
    croppedDataUrl: cropped.dataUrl,
    base64: cropped.dataUrl.split(',')[1] || '',
    width: cropped.width,
    height: cropped.height,
    aspectRatio: cropped.width / Math.max(cropped.height, 1),
  };
}

export async function extractSketchGeometry(dataUrl: string): Promise<SketchGeometry> {
  const processed = await preprocessSketch(dataUrl);
  const image = await loadImage(processed.croppedDataUrl);
  const { imageData } = readImageData(image);
  const footprintNormalized = traceFootprintPolygon(imageData);

  return {
    footprintNormalized:
      footprintNormalized.length >= 3 ? footprintNormalized : fallbackRectangleFootprint(),
    croppedDataUrl: processed.croppedDataUrl,
    width: processed.width,
    height: processed.height,
    aspectRatio: processed.aspectRatio,
  };
}

export function planDimensionsFromAspect(aspectRatio: number, maxSideMeters = 10) {
  if (aspectRatio >= 1) {
    return {
      totalWidth: maxSideMeters,
      totalLength: maxSideMeters / aspectRatio,
    };
  }

  return {
    totalWidth: maxSideMeters * aspectRatio,
    totalLength: maxSideMeters,
  };
}

export function footprintToMeters(
  points: FloorPlanPoint[],
  totalWidth: number,
  totalLength: number,
): FloorPlanPoint[] {
  return points.map((point) => ({
    x: point.x * totalWidth,
    y: point.y * totalLength,
  }));
}

export function applySketchGeometry(
  plan: FloorPlanAnalysis,
  geometry: SketchGeometry,
): FloorPlanAnalysis {
  const { totalWidth, totalLength } = planDimensionsFromAspect(geometry.aspectRatio);
  const footprint = footprintToMeters(geometry.footprintNormalized, totalWidth, totalLength);

  return {
    ...plan,
    footprint,
    totalWidth,
    totalLength,
    notes: [
      'Contorno 3D simplificado al perímetro del boceto. El detalle interior se ve en la planta.',
      ...plan.notes.filter((note) => !note.toLowerCase().includes('silueta 3d')),
    ],
  };
}

export async function buildPlanFromSketch(
  dataUrl: string,
  aiPlan: FloorPlanAnalysis,
  pipelineResult?: SketchPipelineResult,
): Promise<{ plan: FloorPlanAnalysis; displaySketch: string }> {
  const pipeline = pipelineResult ?? (await runSketchEnhancementPipeline(dataUrl));
  const geometry = await extractSketchGeometry(pipeline.processedDataUrl);

  const ocrMeters = parseOcrMetersFromNotes(pipeline.dimensionNotes);
  const maxOcrMeter = ocrMeters.length ? Math.max(...ocrMeters) : undefined;
  const dimensions = maxOcrMeter
    ? planDimensionsFromAspect(geometry.aspectRatio, maxOcrMeter)
    : planDimensionsFromAspect(geometry.aspectRatio);

  const footprint = footprintToMeters(
    geometry.footprintNormalized,
    dimensions.totalWidth,
    dimensions.totalLength,
  );

  const scaledRooms = scaleRoomsToPlan(
    aiPlan.rooms,
    aiPlan.totalWidth,
    aiPlan.totalLength,
    dimensions.totalWidth,
    dimensions.totalLength,
  );

  const inkWalls = await extractInkWallSegments(
    geometry.croppedDataUrl,
    dimensions.totalWidth,
    dimensions.totalLength,
  );
  const detectedWalls = ensureWallMetadata(
    mergeWallSegments(inkWalls),
    scaledRooms.length ? scaledRooms : aiPlan.rooms,
  );

  const plan: FloorPlanAnalysis = {
    ...aiPlan,
    rooms: scaledRooms.length ? scaledRooms : aiPlan.rooms,
    footprint,
    totalWidth: dimensions.totalWidth,
    totalLength: dimensions.totalLength,
    detectedWalls,
    processingSteps: pipeline.steps,
    notes: [
      ...pipeline.dimensionNotes,
      detectedWalls.length
        ? `${detectedWalls.length} tramos de muro trazados desde las líneas del boceto.`
        : 'No se detectaron muros internos; revisa el contraste del boceto.',
      ...aiPlan.notes,
    ],
  };

  const layoutPlan = plan.detectedWalls?.length
    ? applyWallLayout(plan)
    : normalizeRoomLayout(plan, { targetAspectRatio: geometry.aspectRatio });

  return {
    plan: layoutPlan,
    displaySketch: geometry.croppedDataUrl,
  };
}
