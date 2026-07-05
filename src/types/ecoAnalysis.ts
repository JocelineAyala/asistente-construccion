import { FloorPlanAnalysis } from './floorPlan';

export type EcoWallSide = 'north' | 'south' | 'east' | 'west';

export type EcoViewLayers = {
  luz: boolean;
  viento: boolean;
  ventilacion: boolean;
  ventanas: boolean;
};

export const ECO_LAYER_OPTIONS: Array<{
  key: keyof EcoViewLayers;
  label: string;
  description: string;
}> = [
  { key: 'ventilacion', label: 'Ventilación', description: 'Aberturas y rejillas estratégicas' },
  { key: 'viento', label: 'Viento', description: 'Flujo de aire cruzado en el plano' },
  { key: 'luz', label: 'Luz', description: 'Entradas de luz natural' },
  { key: 'ventanas', label: 'Ventanas', description: 'Vidrios reflectantes anti-calor' },
];

export const DEFAULT_ECO_LAYERS: EcoViewLayers = {
  luz: true,
  viento: true,
  ventilacion: true,
  ventanas: true,
};

export function hasAnyEcoLayer(layers: EcoViewLayers): boolean {
  return layers.luz || layers.viento || layers.ventilacion || layers.ventanas;
}

export type EcoPlacement = {
  id: string;
  roomId: string;
  wall: EcoWallSide;
  /** Posición a lo largo del muro, de 0 a 1 */
  offset: number;
  label: string;
  benefit: string;
};

export type EcoFriendlyAnalysis = {
  summary: string;
  ventilationBenefits: string;
  lightBenefits: string;
  energySavings: string;
  reflectiveWindowNote: string;
  ventilationPoints: EcoPlacement[];
  lightPoints: EcoPlacement[];
  reflectiveWindows: EcoPlacement[];
  recommendations: string[];
};

export type EcoFriendlySession = {
  sketchPreview: string;
  plan: FloorPlanAnalysis;
  analysis: EcoFriendlyAnalysis;
  activeLayers: EcoViewLayers;
  projectTitle?: string;
  savedAt: string;
};
