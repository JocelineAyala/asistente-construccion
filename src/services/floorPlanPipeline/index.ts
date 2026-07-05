import { planDimensionsFromAspect, preprocessSketch } from '../../utils/sketchGeometry';
import { isFalConfigured } from '../../config/floorPlanApis';
import { upscaleSketchWithFal } from './falUpscale';
import { SketchPipelineResult } from './types';

export async function runSketchEnhancementPipeline(
  dataUrl: string,
): Promise<SketchPipelineResult> {
  const steps: string[] = [];
  let processedDataUrl = dataUrl;

  if (isFalConfigured()) {
    try {
      processedDataUrl = await upscaleSketchWithFal(processedDataUrl);
      steps.push('Nítidez mejorada con fal.ai (ESRGAN).');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      steps.push(`fal.ai omitido: ${message}`);
    }
  } else {
    steps.push('fal.ai no configurado; se continuó con trazado local.');
  }

  const cropped = await preprocessSketch(processedDataUrl);
  processedDataUrl = cropped.croppedDataUrl;
  steps.push('Recorte automático y trazado local del boceto.');

  return {
    processedDataUrl,
    walls: [],
    dimensionNotes: [],
    steps,
    imageWidth: cropped.width,
    imageHeight: cropped.height,
  };
}

export type { SketchPipelineResult } from './types';
