import { buildMockEcoAnalysis } from '../constants/mockEcoAnalysis';
import { EcoFriendlyAnalysis, EcoFriendlySession } from '../types/ecoAnalysis';
import { FloorPlanAnalysis } from '../types/floorPlan';
import { getActiveOpenAiKey } from './openai';

export const ECO_FRIENDLY_SESSION_KEY = 'buildassist:eco-friendly-session';

const ECO_ANALYSIS_PROMPT = `Eres un arquitecto bioclimático experto en viviendas en El Salvador (clima tropical cálido).

Analiza el plano arquitectónico proporcionado y diseña una estrategia ECOFRIENDLY de:
1. Ventilación natural estratégica (ventanas, rejillas, ventilación cruzada)
2. Entradas de luz natural para reducir iluminación eléctrica
3. Ventanas o vidrios reflectantes en muros soleados (especialmente oeste/sur) para rechazar calor solar

Responde SOLO con JSON válido (sin markdown) con esta estructura:
{
  "summary": "resumen breve del análisis ecofriendly",
  "ventilationBenefits": "párrafo sobre qué gana el usuario con la ventilación propuesta",
  "lightBenefits": "párrafo sobre ahorro de luz natural",
  "energySavings": "párrafo estimando ahorro eléctrico y confort térmico",
  "reflectiveWindowNote": "párrafo sobre vidrios reflectantes y reducción de calor",
  "ventilationPoints": [
    { "id": "vent-1", "roomId": "id-del-cuarto", "wall": "north|south|east|west", "offset": 0.5, "label": "nombre corto", "benefit": "beneficio concreto" }
  ],
  "lightPoints": [ mismo formato ],
  "reflectiveWindows": [ mismo formato ],
  "recommendations": ["consejo 1", "consejo 2", "consejo 3"]
}

Reglas:
- Usa SOLO roomId que existan en el plano enviado
- wall: north = borde superior del cuarto (menor y), south = borde inferior, west = borde izquierdo, east = borde derecho
- offset: 0 a 1 a lo largo del muro elegido
- Coloca al menos 2 puntos de ventilación, 2 de luz y 1 ventana reflectante
- Sé específico con beneficios de ahorro energético`;

function parseEcoAnalysis(raw: unknown): EcoFriendlyAnalysis {
  const data = raw as Partial<EcoFriendlyAnalysis>;
  const fallback = buildMockEcoAnalysis({ rooms: [], ceilingHeight: 2.5, totalWidth: 1, totalLength: 1, summary: '', mappingSteps: [], notes: [] });

  return {
    summary: data.summary || fallback.summary,
    ventilationBenefits: data.ventilationBenefits || fallback.ventilationBenefits,
    lightBenefits: data.lightBenefits || fallback.lightBenefits,
    energySavings: data.energySavings || fallback.energySavings,
    reflectiveWindowNote: data.reflectiveWindowNote || fallback.reflectiveWindowNote,
    ventilationPoints: Array.isArray(data.ventilationPoints) ? data.ventilationPoints : fallback.ventilationPoints,
    lightPoints: Array.isArray(data.lightPoints) ? data.lightPoints : fallback.lightPoints,
    reflectiveWindows: Array.isArray(data.reflectiveWindows) ? data.reflectiveWindows : fallback.reflectiveWindows,
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : fallback.recommendations,
  };
}

export async function analyzeEcoPlan(
  plan: FloorPlanAnalysis,
  userNotes?: string,
): Promise<EcoFriendlyAnalysis> {
  const apiKey = getActiveOpenAiKey();

  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return buildMockEcoAnalysis(plan);
  }

  const planContext = {
    summary: plan.summary,
    rooms: plan.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      x: room.x,
      y: room.y,
      width: room.width,
      length: room.length,
      hasWindows: room.hasWindows,
      hasDoor: room.hasDoor,
    })),
    totalWidth: plan.totalWidth,
    totalLength: plan.totalLength,
    ceilingHeight: plan.ceilingHeight,
    notes: plan.notes,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ECO_ANALYSIS_PROMPT },
          {
            role: 'user',
            content: `Plano a analizar:\n${JSON.stringify(planContext, null, 2)}\n\nNotas del usuario: ${userNotes || 'Ninguna'}`,
          },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    return parseEcoAnalysis(JSON.parse(content));
  } catch (error) {
    console.error('Eco analysis fallback to mock:', error);
    return buildMockEcoAnalysis(plan);
  }
}

export function saveEcoFriendlySession(session: EcoFriendlySession) {
  localStorage.setItem(ECO_FRIENDLY_SESSION_KEY, JSON.stringify(session));
}

export function loadEcoFriendlySession(): EcoFriendlySession | null {
  const raw = localStorage.getItem(ECO_FRIENDLY_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as EcoFriendlySession;
  } catch {
    return null;
  }
}

export function clearEcoFriendlySession() {
  localStorage.removeItem(ECO_FRIENDLY_SESSION_KEY);
}
