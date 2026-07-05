import { DetectedWall, FloorPlanAnalysis } from '../types/floorPlan';
import { getWallBounds, getWallDisplayNumber } from './wallRoomLayout';

type PlanBounds = {  width: number;
  length: number;
};

function getPlanBounds(plan: FloorPlanAnalysis): PlanBounds {
  const wallBounds = getWallBounds(plan.detectedWalls ?? []);
  if (wallBounds) {
    return {
      width: Math.max(wallBounds.width, 0.1),
      length: Math.max(wallBounds.length, 0.1),
    };
  }

  const roomMaxX = plan.rooms.reduce((max, room) => Math.max(max, room.x + room.width), 0);
  const roomMaxY = plan.rooms.reduce((max, room) => Math.max(max, room.y + room.length), 0);

  return {
    width: Math.max(plan.totalWidth, roomMaxX, 1),
    length: Math.max(plan.totalLength, roomMaxY, 1),
  };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  bounds: PlanBounds,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  ctx.save();
  ctx.strokeStyle = '#e5edf0';
  ctx.lineWidth = 1;

  for (let x = 0; x <= bounds.width; x += 1) {
    const px = offsetX + x * scale;
    ctx.beginPath();
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, offsetY + bounds.length * scale);
    ctx.stroke();
  }

  for (let y = 0; y <= bounds.length; y += 1) {
    const py = offsetY + y * scale;
    ctx.beginPath();
    ctx.moveTo(offsetX, py);
    ctx.lineTo(offsetX + bounds.width * scale, py);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDimensionLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  offset: number,
  horizontal: boolean,
) {
  ctx.save();
  ctx.strokeStyle = '#1f2937';
  ctx.fillStyle = '#1f2937';
  ctx.lineWidth = 1.2;
  ctx.font = '600 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (horizontal) {
    const y = y1 - offset;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, y);
    ctx.moveTo(x2, y1);
    ctx.lineTo(x2, y);
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.fillText(label, (x1 + x2) / 2, y - 10);
  } else {
    const x = x1 - offset;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x, y1);
    ctx.moveTo(x1, y2);
    ctx.lineTo(x, y2);
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
    ctx.save();
    ctx.translate(x - 12, (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function drawWallCota(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  offset: number,
  horizontal: boolean,
) {
  ctx.save();
  ctx.strokeStyle = '#475569';
  ctx.fillStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.font = '600 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (horizontal) {
    const dimY = y1 + offset;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, dimY);
    ctx.moveTo(x2, y1);
    ctx.lineTo(x2, dimY);
    ctx.moveTo(x1, dimY);
    ctx.lineTo(x2, dimY);
    ctx.stroke();
    ctx.fillText(label, (x1 + x2) / 2, dimY + (offset < 0 ? -8 : 8));
  } else {
    const dimX = offset < 0 ? x1 + offset : x1 + offset;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(dimX, y1);
    ctx.moveTo(x1, y2);
    ctx.lineTo(dimX, y2);
    ctx.moveTo(dimX, y1);
    ctx.lineTo(dimX, y2);
    ctx.stroke();
    ctx.save();
    ctx.translate(dimX + (offset < 0 ? -8 : 8), (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function getWallSpanMeters(wall: DetectedWall): number {
  return wall.orientation === 'horizontal' ? wall.width : wall.length;
}

function drawWallDimensions(
  ctx: CanvasRenderingContext2D,
  walls: DetectedWall[],
  scale: number,
  offsetX: number,
  offsetY: number,
  bounds: PlanBounds,
) {
  if (!walls.length) return;

  const planCenterX = offsetX + (bounds.width * scale) / 2;
  const planCenterY = offsetY + (bounds.length * scale) / 2;

  walls.forEach((wall, index) => {
    const spanMeters = getWallSpanMeters(wall);
    if (spanMeters < 0.28) return;

    const x = offsetX + wall.x * scale;
    const y = offsetY + wall.y * scale;
    const w = Math.max(wall.width * scale, 2);
    const h = Math.max(wall.length * scale, 2);
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const number = getWallDisplayNumber(wall, index);
    const label = `${spanMeters.toFixed(2)} m (#${number})`;

    if (wall.orientation === 'horizontal') {
      const above = centerY < planCenterY;
      const baseY = above ? y : y + h;
      const offset = above ? -18 : 18;
      drawWallCota(ctx, x, baseY, x + w, baseY, label, offset, true);
      return;
    }

    const left = centerX < planCenterX;
    const baseX = left ? x : x + w;
    const offset = left ? -20 : 20;
    drawWallCota(ctx, baseX, y, baseX, y + h, label, offset, false);
  });
}

function drawDetectedWalls(
  ctx: CanvasRenderingContext2D,
  walls: DetectedWall[],
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  if (!walls.length) return;

  ctx.save();
  walls.forEach((wall, index) => {
    const x = offsetX + wall.x * scale;
    const y = offsetY + wall.y * scale;
    const w = Math.max(wall.width * scale, 2);
    const h = Math.max(wall.length * scale, 2);
    const number = getWallDisplayNumber(wall, index);

    ctx.fillStyle = '#d1d5db';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const badgeSize = Math.max(16, Math.min(22, Math.min(w, h) * 0.85));

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(centerX, centerY, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.max(10, badgeSize * 0.55)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), centerX, centerY + 0.5);
  });
  ctx.restore();
}

function drawTitleBlock(  ctx: CanvasRenderingContext2D,
  plan: FloorPlanAnalysis,
  canvasWidth: number,
  canvasHeight: number,
) {
  const blockWidth = 320;
  const blockHeight = 92;
  const x = canvasWidth - blockWidth - 28;
  const y = canvasHeight - blockHeight - 24;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, blockWidth, blockHeight);
  ctx.strokeRect(x, y, blockWidth, blockHeight);

  ctx.beginPath();
  ctx.moveTo(x, y + 28);
  ctx.lineTo(x + blockWidth, y + 28);
  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.font = '700 15px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('PLANTA ARQUITECTÓNICA', x + 12, y + 8);
  ctx.font = '500 12px Arial, sans-serif';
  ctx.fillText(`Proyecto: ${plan.summary.slice(0, 42)}...`, x + 12, y + 36);
  ctx.fillText(`Escala gráfica · ${new Date().toLocaleDateString('es-SV')}`, x + 12, y + 54);
  ctx.fillText(
    `Altura de techo: ${plan.ceilingHeight.toFixed(2)} m · ${plan.rooms.length} espacios · ${plan.detectedWalls?.length ?? 0} muros`,
    x + 12,
    y + 70,
  );
  ctx.restore();
}

function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  scale: number,
  offsetX: number,
  offsetY: number,
  bounds: PlanBounds,
) {
  const barMeters = bounds.width >= 8 ? 2 : 1;
  const barPx = barMeters * scale;
  const x = offsetX;
  const y = offsetY + bounds.length * scale + 48;

  ctx.save();
  ctx.strokeStyle = '#111827';
  ctx.fillStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + barPx, y);
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y + 6);
  ctx.moveTo(x + barPx, y - 6);
  ctx.lineTo(x + barPx, y + 6);
  ctx.stroke();
  ctx.font = '600 13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`0`, x, y + 18);
  ctx.fillText(`${barMeters} m`, x + barPx, y + 18);
  ctx.fillText('ESCala', x + barPx / 2, y - 14);
  ctx.restore();
}

function drawNorthArrow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = '#111827';
  ctx.fillStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 34);
  ctx.lineTo(x, y);
  ctx.lineTo(x - 10, y + 16);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 10, y + 16);
  ctx.stroke();
  ctx.font = '700 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', x, y - 8);
  ctx.restore();
}

export function renderArchitecturalFloorPlan(
  plan: FloorPlanAnalysis,
  canvasWidth = 1800,
  canvasHeight = 1300,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const bounds = getPlanBounds(plan);
  const detectedWalls = plan.detectedWalls ?? [];
  const hasDetectedWalls = detectedWalls.length > 0;
  const margin = 140;
  const titleSpace = 120;
  const drawWidth = canvasWidth - margin * 2;
  const drawHeight = canvasHeight - margin * 2 - titleSpace;
  const scale =
    Math.min(drawWidth / bounds.width, drawHeight / bounds.length) * (hasDetectedWalls ? 0.9 : 0.82);
  const planPixelWidth = bounds.width * scale;
  const planPixelHeight = bounds.length * scale;
  const offsetX = margin + (drawWidth - planPixelWidth) / 2;
  const offsetY = margin + (drawHeight - planPixelHeight) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#64748b';
  ctx.font = '700 24px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PLANTA DE DISTRIBUCIÓN', margin, 42);
  ctx.font = '500 15px Arial, sans-serif';
  ctx.fillText('Levantamiento interpretado desde boceto · cotas en metros', margin, 68);

  drawGrid(ctx, bounds, scale, offsetX, offsetY);

  drawDetectedWalls(ctx, detectedWalls, scale, offsetX, offsetY);
  drawWallDimensions(ctx, detectedWalls, scale, offsetX, offsetY, bounds);

  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#111827';
  ctx.strokeRect(offsetX, offsetY, planPixelWidth, planPixelHeight);
  ctx.restore();

  drawDimensionLine(
    ctx,
    offsetX,
    offsetY,
    offsetX + planPixelWidth,
    offsetY,
    `${bounds.width.toFixed(2)} m`,
    28,
    true,
  );
  drawDimensionLine(
    ctx,
    offsetX,
    offsetY,
    offsetX,
    offsetY + planPixelHeight,
    `${bounds.length.toFixed(2)} m`,
    28,
    false,
  );

  drawScaleBar(ctx, scale, offsetX, offsetY, bounds);
  drawNorthArrow(ctx, offsetX + planPixelWidth + 36, offsetY + 12);
  drawTitleBlock(ctx, plan, canvasWidth, canvasHeight);

  return canvas;
}

export function renderArchitecturalFloorPlanDataUrl(plan: FloorPlanAnalysis): string {
  return renderArchitecturalFloorPlan(plan).toDataURL('image/png');
}
