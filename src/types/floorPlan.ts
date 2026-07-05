export type DetectedWall = {
  id: string;
  x: number;
  y: number;
  width: number;
  length: number;
  confidence: number;
  orientation: 'horizontal' | 'vertical';
  /** Tipo de ambiente para color (living, kitchen, etc.) */
  zone?: string;
  /** Número visible en planta, PDF y panel de edición */
  number?: number;
};

export type FloorPlanPoint = {
  x: number;
  y: number;
};

export type MappingStep = {
  step: number;
  title: string;
  description: string;
  specification: string;
};

export type FloorPlanRoom = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  length: number;
  height: number;
  hasWindows?: boolean;
  hasDoor?: boolean;
  /** Vértices opcionales del cuarto en metros (planta), para formas no rectangulares. */
  vertices?: FloorPlanPoint[];
};

export type FloorPlanAnalysis = {
  summary: string;
  mappingSteps: MappingStep[];
  rooms: FloorPlanRoom[];
  ceilingHeight: number;
  totalWidth: number;
  totalLength: number;
  notes: string[];
  /** Contorno exterior del boceto en metros (planta). */
  footprint?: FloorPlanPoint[];
  /** Muros trazados localmente desde el boceto, en metros. */
  detectedWalls?: DetectedWall[];
  /** Pasos del pipeline de mejora de imagen aplicados. */
  processingSteps?: string[];
};

export type FloorPlanSession = {
  sketchPreview: string;
  analysis: FloorPlanAnalysis;
  savedAt: string;
};
