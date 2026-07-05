import { jsPDF } from 'jspdf';
import { APP_NAME } from '../constants/app';
import { DetectedWall, FloorPlanAnalysis } from '../types/floorPlan';
import { renderArchitecturalFloorPlanDataUrl } from './drawArchitecturalFloorPlan';
import { getWallDisplayNumber } from './wallRoomLayout';

function wallSpanMeters(wall: DetectedWall): number {
  return wall.orientation === 'horizontal' ? wall.width : wall.length;
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5,
) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

export async function exportFloorPlanPdf(plan: FloorPlanAnalysis): Promise<void> {
  const planImage = renderArchitecturalFloorPlanDataUrl(plan);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${APP_NAME} · Planta arquitectónica`, margin, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Exportado: ${new Date().toLocaleString('es-SV')}`, pageWidth - 52, 8);

  const imageProps = doc.getImageProperties(planImage);
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - 16;
  const ratio = Math.min(maxWidth / imageProps.width, maxHeight / imageProps.height);
  const imageWidth = imageProps.width * ratio;
  const imageHeight = imageProps.height * ratio;
  const imageX = (pageWidth - imageWidth) / 2;
  const imageY = 10 + (maxHeight - imageHeight) / 2;

  doc.addImage(planImage, 'PNG', imageX, imageY, imageWidth, imageHeight);

  doc.addPage('a4', 'portrait');
  const portraitWidth = doc.internal.pageSize.getWidth();
  const contentWidth = portraitWidth - 20;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Cuadro de áreas y especificaciones', 10, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(doc, plan.summary, 10, y, contentWidth) + 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Medidas generales', 10, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Ancho total: ${plan.totalWidth.toFixed(2)} m`, 10, y);
  y += 5;
  doc.text(`Largo total: ${plan.totalLength.toFixed(2)} m`, 10, y);
  y += 5;
  doc.text(`Altura de techo: ${plan.ceilingHeight.toFixed(2)} m`, 10, y);
  y += 5;
  doc.text(`Muros trazados desde boceto: ${plan.detectedWalls?.length ?? 0}`, 10, y);
  y += 8;

  if (plan.detectedWalls?.length) {
    doc.setFont('helvetica', 'bold');
    doc.text('Cotas de muros (planta)', 10, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    plan.detectedWalls.forEach((wall, index) => {
      const number = getWallDisplayNumber(wall, index);
      const orientation = wall.orientation === 'horizontal' ? 'Horizontal' : 'Vertical';
      const line = `Muro #${number} · ${orientation} · ${wallSpanMeters(wall).toFixed(2)} m · pos (${wall.x.toFixed(2)}, ${wall.y.toFixed(2)})`;
      if (y > 275) {
        doc.addPage();
        y = 18;
      }
      y = addWrappedText(doc, line, 10, y, contentWidth, 4.5) + 2;
    });

    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Desglose de espacios', 10, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  plan.rooms.forEach((room, index) => {
    const area = room.width * room.length;
    const line = `${index + 1}. ${room.name} — ${room.width.toFixed(2)} × ${room.length.toFixed(2)} m (área ${area.toFixed(2)} m²) · techo ${room.height.toFixed(2)} m`;
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    y = addWrappedText(doc, line, 10, y, contentWidth, 4.5) + 2;
  });

  y += 4;
  if (y > 250) {
    doc.addPage();
    y = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Notas', 10, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const notes = plan.notes.length
    ? plan.notes
    : ['Plano interpretado desde boceto. Validar cotas en sitio antes de construir.'];
  notes.forEach((note) => {
    y = addWrappedText(doc, `• ${note}`, 10, y, contentWidth, 4.5) + 2;
  });

  doc.save(`planta-arquitectonica-${new Date().toISOString().slice(0, 10)}.pdf`);
}
