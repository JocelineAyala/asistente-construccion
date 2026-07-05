// carbon.js
// Estima huella de carbono de la construcción a partir del área de muros
// y da tips de reducción. Valores aproximados/educativos (factores típicos).

// kg CO2 embebido por material (referenciales, por m² o por unidad).
const FACTORS = {
  wallPerM2: 90,      // muro de concreto/ladrillo: ~90 kg CO2e / m²
  floorPerM2: 60,     // losa de piso
  furniture: {
    table: 45,
    chair: 20,
    bed: 90,
    toilet: 55,       // incluye cerámica + fabricación
    door: 35,
  },
};

// Recibe: segmentos de pared, escala (m por pixel), altura de muro, lista de muebles.
export function computeCarbon({ segments, metersPerPixel, wallHeight, furniture }) {
  // Longitud total de muros (m).
  let wallLength = 0;
  segments.forEach((s) => {
    const dx = (s.x2 - s.x1) * metersPerPixel;
    const dy = (s.y2 - s.y1) * metersPerPixel;
    wallLength += Math.hypot(dx, dy);
  });

  const wallArea = wallLength * wallHeight;           // m²
  const wallCO2 = wallArea * FACTORS.wallPerM2;

  // Área de piso aproximada (bounding box de los muros).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  segments.forEach((s) => {
    minX = Math.min(minX, s.x1, s.x2);
    maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxY = Math.max(maxY, s.y1, s.y2);
  });
  const floorArea = segments.length
    ? Math.abs((maxX - minX) * (maxY - minY)) * metersPerPixel * metersPerPixel
    : 0;
  const floorCO2 = floorArea * FACTORS.floorPerM2;

  let furnitureCO2 = 0;
  const counts = {};
  furniture.forEach((f) => {
    furnitureCO2 += FACTORS.furniture[f] || 0;
    counts[f] = (counts[f] || 0) + 1;
  });

  const total = wallCO2 + floorCO2 + furnitureCO2;

  return {
    wallLength,
    wallArea,
    floorArea,
    wallCO2,
    floorCO2,
    furnitureCO2,
    total,
    counts,
    tips: buildTips({ floorArea, counts, total }),
  };
}

function buildTips({ floorArea, counts, total }) {
  const tips = [];
  tips.push(
    "Usa <b>concreto con cemento reciclado (GGBS/cenizas)</b>: reduce hasta 30% del CO₂ de los muros."
  );
  tips.push(
    "Prefiere <b>madera certificada</b> en pisos y muebles: almacena carbono en vez de emitirlo."
  );
  if (floorArea > 40) {
    tips.push(
      `El área (~${floorArea.toFixed(0)} m²) es amplia: <b>optimizar el diseño</b> y evitar espacios sin uso ahorra material y energía.`
    );
  }
  if ((counts.toilet || 0) > 0) {
    tips.push(
      "En el baño, instala <b>inodoros de doble descarga</b> y grifería eficiente: menos agua y menos energía de bombeo."
    );
  }
  tips.push(
    "Añade <b>aislamiento térmico y ventanas eficientes</b>: baja el CO₂ de operación (calefacción/AC) durante toda la vida del edificio."
  );
  tips.push(
    "Instala <b>paneles solares</b>: pueden compensar gran parte de las emisiones operativas anuales."
  );
  if (total > 20000) {
    tips.push(
      "La huella es alta: considera <b>construcción modular/prefabricada</b>, que genera menos desperdicio de obra."
    );
  }
  return tips;
}
