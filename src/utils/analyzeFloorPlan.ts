import { MOCK_FLOOR_PLAN_ANALYSIS } from '../constants/mockFloorPlan';
import { FloorPlanAnalysis, FloorPlanPoint } from '../types/floorPlan';
import {
  convertNormalizedFootprint,
  normalizeRoomLayout,
} from './floorPlanLayout';
import { getActiveOpenAiKey } from './openai';

const PLAN_ANALYSIS_PROMPT = `Eres un arquitecto experto en digitalizar bocetos de planos de edificaciones y proyectos constructivos en El Salvador.

Tu tarea es LEER LA GEOMETRÍA REAL del boceto en la imagen, no inventar una distribución genérica.

Analiza la imagen y devuelve SOLO un JSON válido (sin markdown) con esta estructura exacta:
{
  "summary": "string breve del plano interpretado",
  "mappingSteps": [
    {
      "step": 1,
      "title": "título corto del paso de mapeo",
      "description": "qué debe hacer el usuario en este paso",
      "specification": "dato concreto: medida, tipo de cuarto, puerta, ventana, orientación, etc."
    }
  ],
  "footprintNormalized": [
    { "x": 0.0, "y": 0.0 },
    { "x": 1.0, "y": 0.0 }
  ],
  "rooms": [
    {
      "id": "identificador-unico",
      "name": "nombre del cuarto",
      "type": "living|kitchen|bedroom|bathroom|hall|other",
      "x": 0,
      "y": 0,
      "width": 4.0,
      "length": 3.5,
      "height": 2.5,
      "hasWindows": true,
      "hasDoor": true,
      "vertices": [
        { "x": 0, "y": 0 },
        { "x": 4.0, "y": 0 },
        { "x": 4.0, "y": 3.5 },
        { "x": 0, "y": 3.5 }
      ]
    }
  ],
  "ceilingHeight": 2.5,
  "totalWidth": 10.0,
  "totalLength": 8.0,
  "notes": ["nota técnica 1", "nota técnica 2"]
}

Reglas críticas de geometría:
1. footprintNormalized debe trazar la SILUETA EXTERIOR del boceto en sentido horario, con coordenadas normalizadas de 0 a 1 respecto al rectángulo del dibujo (esquina superior izquierda = 0,0).
2. Incluye entre 4 y 16 puntos en footprintNormalized siguiendo esquinas y quiebres visibles del contorno.
3. totalWidth y totalLength deben respetar la proporción ancho/alto del boceto en la imagen (si el dibujo es más ancho que alto, totalWidth > totalLength).
4. rooms debe ubicar cada espacio DENTRO del contorno, con x,y,width,length en metros desde la esquina superior izquierda del plano.
5. Los cuartos deben encajar sin grandes huecos ni superposiciones; respeta muros compartidos visibles en el boceto.
6. Si un cuarto no es rectangular (forma en L, recorte, etc.), usa vertices con el polígono real en metros. Si es rectangular, vertices puede repetir las 4 esquinas del rectángulo.
7. No uses siempre la misma planta tipo; adapta cantidad, forma y posición de cuartos a lo que se ve en ESTE boceto.
8. Entrega entre 5 y 8 pasos en mappingSteps, ordenados para mapear el plano de afuera hacia adentro.
9. Si no puedes inferir una medida absoluta, usa proporciones relativas coherentes con el dibujo y menciónalo en notes.
10. Responde en español.`;

type RawFloorPlanAnalysis = Partial<FloorPlanAnalysis> & {
  footprintNormalized?: FloorPlanPoint[];
};

function normalizeAnalysis(
  raw: RawFloorPlanAnalysis,
  options?: { targetAspectRatio?: number },
): FloorPlanAnalysis {
  const ceilingHeight = Number(raw.ceilingHeight) || 2.5;
  const totalWidth = Math.max(3, Number(raw.totalWidth) || 6);
  const totalLength = Math.max(3, Number(raw.totalLength) || 6);

  const footprint =
    convertNormalizedFootprint(raw.footprintNormalized, totalWidth, totalLength) ||
    raw.footprint;

  const plan: FloorPlanAnalysis = {
    summary: raw.summary || 'Plano analizado a partir del boceto subido.',
    mappingSteps: (raw.mappingSteps || []).map((step, index) => ({
      step: step.step ?? index + 1,
      title: step.title || `Paso ${index + 1}`,
      description: step.description || '',
      specification: step.specification || '',
    })),
    rooms: (raw.rooms || []).map((room, index) => ({
      id: room.id || `room-${index + 1}`,
      name: room.name || `Espacio ${index + 1}`,
      type: room.type || 'other',
      x: Number(room.x) || 0,
      y: Number(room.y) || 0,
      width: Math.max(1, Number(room.width) || 3),
      length: Math.max(1, Number(room.length) || 3),
      height: Math.max(2, Number(room.height) || ceilingHeight),
      hasWindows: Boolean(room.hasWindows),
      hasDoor: room.hasDoor !== false,
      vertices: room.vertices?.map((vertex) => ({
        x: Number(vertex.x) || 0,
        y: Number(vertex.y) || 0,
      })),
    })),
    ceilingHeight,
    totalWidth,
    totalLength,
    notes: raw.notes?.length ? raw.notes : ['Validar medidas en sitio antes de construir.'],
    footprint,
  };

  return normalizeRoomLayout(plan, options);
}

export async function analyzeFloorPlanSketch(
  imageBase64: string,
  options?: { imageWidth?: number; imageHeight?: number; dimensionHints?: string[] },
): Promise<FloorPlanAnalysis> {
  const activeKey = getActiveOpenAiKey();
  const targetAspectRatio =
    options?.imageWidth && options?.imageHeight
      ? options.imageWidth / options.imageHeight
      : undefined;

  if (!activeKey) {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    return normalizeRoomLayout(MOCK_FLOOR_PLAN_ANALYSIS, { targetAspectRatio });
  }

  const aspectHint =
    targetAspectRatio !== undefined
      ? ` La imagen tiene proporción ancho/alto ≈ ${targetAspectRatio.toFixed(2)}; respeta esa silueta en totalWidth/totalLength y en footprintNormalized.`
      : '';

  const dimensionHint =
    options?.dimensionHints?.length ?
      ` Cotas detectadas previamente: ${options.dimensionHints.join(', ')}. Usa esas medidas como referencia principal para totalWidth, totalLength y rooms.`
    : '';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: PLAN_ANALYSIS_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza este boceto de plano y devuelve el JSON con footprintNormalized, cuartos con posiciones reales y pasos de mapeo para reconstruir su silueta en 3D.${aspectHint}${dimensionHint}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 2600,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || 'Error en la respuesta de OpenAI');
  }

  const data = await response.json();
  const contentText = data.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(contentText) as RawFloorPlanAnalysis;
  return normalizeAnalysis(parsed, { targetAspectRatio });
}

export const FLOOR_PLAN_SESSION_KEY = 'buildassist:floor-plan-session';

export function saveFloorPlanSession(sketchPreview: string, analysis: FloorPlanAnalysis) {
  const session = {
    sketchPreview,
    analysis,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(FLOOR_PLAN_SESSION_KEY, JSON.stringify(session));
}

export function loadFloorPlanSession() {
  const raw = localStorage.getItem(FLOOR_PLAN_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as {
      sketchPreview: string;
      analysis: FloorPlanAnalysis;
      savedAt: string;
    };
  } catch {
    return null;
  }
}

export function clearFloorPlanSession() {
  localStorage.removeItem(FLOOR_PLAN_SESSION_KEY);
}
