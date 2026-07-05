import { FloorPlanAnalysis } from '../types/floorPlan';
import { EcoFriendlyAnalysis, EcoPlacement, EcoWallSide } from '../types/ecoAnalysis';

function placement(
  id: string,
  roomId: string,
  wall: EcoWallSide,
  offset: number,
  label: string,
  benefit: string,
): EcoPlacement {
  return { id, roomId, wall, offset, label, benefit };
}

export function buildMockEcoAnalysis(plan: FloorPlanAnalysis): EcoFriendlyAnalysis {
  const living = plan.rooms.find((room) => room.type === 'living') ?? plan.rooms[0];
  const kitchen = plan.rooms.find((room) => room.type === 'kitchen') ?? plan.rooms[1];
  const bedroom =
    plan.rooms.find((room) => room.type === 'bedroom') ?? plan.rooms[2] ?? living;
  const bathroom = plan.rooms.find((room) => room.type === 'bathroom');

  const ventilationPoints: EcoPlacement[] = [];
  const lightPoints: EcoPlacement[] = [];
  const reflectiveWindows: EcoPlacement[] = [];

  if (living) {
    ventilationPoints.push(
      placement(
        'vent-living-n',
        living.id,
        'north',
        0.35,
        'Ventana norte — entrada de brisa',
        'Permite ventilación cruzada con el muro opuesto y reduce uso de ventiladores.',
      ),
      placement(
        'vent-living-s',
        living.id,
        'south',
        0.65,
        'Salida de aire sur',
        'Completa el cruce de aire y evacua calor acumulado al final del día.',
      ),
    );
    lightPoints.push(
      placement(
        'light-living-e',
        living.id,
        'east',
        0.5,
        'Luz matutina controlada',
        'Ilumina la zona social sin encender lámparas en las primeras horas del día.',
      ),
    );
    reflectiveWindows.push(
      placement(
        'refl-living-w',
        living.id,
        'west',
        0.4,
        'Vidrio reflectante oceánico',
        'Rechaza radiación solar de la tarde y mantiene la sala más fresca.',
      ),
    );
  }

  if (kitchen) {
    ventilationPoints.push(
      placement(
        'vent-kitchen-e',
        kitchen.id,
        'east',
        0.5,
        'Ventana alta en cocina',
        'Extrae olores y humedad; evita depender del extractor eléctico todo el día.',
      ),
    );
    lightPoints.push(
      placement(
        'light-kitchen-n',
        kitchen.id,
        'north',
        0.5,
        'Claraboya / ventana norte',
        'Luz difusa constante para preparar alimentos con menos consumo eléctrico.',
      ),
    );
  }

  if (bedroom) {
    lightPoints.push(
      placement(
        'light-bed-e',
        bedroom.id,
        'east',
        0.45,
        'Ventana este dormitorio',
        'Despierta con luz natural y reduce horas de lámpara encendida.',
      ),
    );
    reflectiveWindows.push(
      placement(
        'refl-bed-w',
        bedroom.id,
        'west',
        0.55,
        'Película reflectante en ventana oeste',
        'Bloquea calor vespertino y mejora el descanso sin aire acondicionado.',
      ),
    );
    ventilationPoints.push(
      placement(
        'vent-bed-n',
        bedroom.id,
        'north',
        0.5,
        'Rejilla de ventilación nocturna',
        'Renueva el aire mientras duermes sin abrir ventanas grandes.',
      ),
    );
  }

  if (bathroom) {
    ventilationPoints.push(
      placement(
        'vent-bath-high',
        bathroom.id,
        'east',
        0.5,
        'Extractor pasivo / ventana alta',
        'Evita moho y reduce necesidad de extractor eléctico permanente.',
      ),
    );
  }

  return {
    summary:
      'Análisis ecofriendly del plano: se propone ventilación cruzada, captación de luz natural y ventanas reflectantes en muros soleados para reducir calor y consumo eléctrico en clima tropical.',
    ventilationBenefits:
      'La ventilación cruzada entre muros opuestos renueva el aire 4–6 veces por hora en condiciones favorables, bajando la sensación térmica entre 2 °C y 4 °C y permitiendo apagar ventiladores varias horas al día.',
    lightBenefits:
      'Ubicar ventanas y claraboyas en muros este y norte aporta luz difusa o matutina. En promedio se pueden reducir 2–3 horas diarias de iluminación artificial en salas y dormitorios.',
    energySavings:
      'Combinando ventilación natural, luz diurna y vidrios reflectantes en muros oeste, se estima un ahorro del 15–25 % en electricidad de iluminación y confort térmico pasivo.',
    reflectiveWindowNote:
      'Instala vidrio bajo emisivo o película reflectante en ventanas que reciben sol directo de tarde (oeste). Reflejan hasta el 70 % de la radiación infrarroja y evitan que el calor entre al interior.',
    ventilationPoints,
    lightPoints,
    reflectiveWindows,
    recommendations: [
      'Prioriza aberturas opuestas para ventilación cruzada en sala y dormitorios.',
      'Usa vidrio reflectante o película solar en muros oeste y sur expuestos.',
      'Mantén al menos 10–15 % de área de ventana respecto al piso en habitaciones.',
      'Combina cortinas claras con vidrio reflectante para controlar deslumbramiento.',
    ],
  };
}
