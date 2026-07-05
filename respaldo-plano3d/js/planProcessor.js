// planProcessor.js
// Detecta paredes filtrando por negrura + apertura morfologica + Hough.

export function detectWalls(imgElement, canvas, opts = {}) {
  const {
    darkness = 110,
    thickness = 3,
    threshold = 60,
    orthoOnly = true,
    showMask = false,
  } = opts;

  if (typeof cv === "undefined" || !cv.Mat) {
    throw new Error("OpenCV aun no esta listo.");
  }

  const ctx = canvas.getContext("2d");
  const maxW = 900;
  const scale = Math.min(1, maxW / imgElement.naturalWidth);
  canvas.width = imgElement.naturalWidth * scale;
  canvas.height = imgElement.naturalHeight * scale;
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const mask = new cv.Mat();
  const opened = new cv.Mat();
  const lines = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.threshold(gray, mask, darkness, 255, cv.THRESH_BINARY_INV);

  const k = Math.max(1, thickness | 0);
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(k, k));
  cv.morphologyEx(mask, opened, cv.MORPH_OPEN, kernel);

  cv.HoughLinesP(opened, lines, 1, Math.PI / 180, threshold, 30, 8);

  let segments = [];
  for (let i = 0; i < lines.rows; i++) {
    segments.push({
      x1: lines.data32S[i * 4],
      y1: lines.data32S[i * 4 + 1],
      x2: lines.data32S[i * 4 + 2],
      y2: lines.data32S[i * 4 + 3],
    });
  }

  if (orthoOnly) {
    segments = segments.map(snapOrtho).filter(Boolean);
  }

  segments = mergeSegments(segments, orthoOnly);

  const minLen = Math.max(12, canvas.width * 0.03);
  segments = segments.filter((s) => segmentLength(s) >= minLen);

  if (showMask) {
    cv.imshow(canvas, opened);
  } else {
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
  }

  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 3;
  segments.forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  });

  src.delete();
  gray.delete();
  mask.delete();
  opened.delete();
  lines.delete();
  kernel.delete();

  return { segments, width: canvas.width, height: canvas.height };
}

function snapOrtho(s) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const angle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  const tol = 12;

  if (angle <= tol) {
    const y = Math.round((s.y1 + s.y2) / 2);
    return { x1: s.x1, y1: y, x2: s.x2, y2: y, dir: "h" };
  }

  if (angle >= 90 - tol) {
    const x = Math.round((s.x1 + s.x2) / 2);
    return { x1: x, y1: s.y1, x2: x, y2: s.y2, dir: "v" };
  }

  return null;
}

function mergeSegments(segs, ortho) {
  if (!ortho) return segs;
  const merged = [];
  const gap = 12;
  const band = 8;

  groupAndMerge(segs.filter((s) => s.dir === "h"), "y", "x", band, gap, merged, "h");
  groupAndMerge(segs.filter((s) => s.dir === "v"), "x", "y", band, gap, merged, "v");
  return merged;
}

function groupAndMerge(list, fixedKey, runKey, band, gap, out, dir) {
  const used = new Array(list.length).fill(false);

  for (let i = 0; i < list.length; i++) {
    if (used[i]) continue;
    const base = list[i];
    const fixedVals = [fixedGet(base, fixedKey)];
    let lo = Math.min(runGet(base, runKey, 1), runGet(base, runKey, 2));
    let hi = Math.max(runGet(base, runKey, 1), runGet(base, runKey, 2));
    used[i] = true;

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < list.length; j++) {
        if (used[j]) continue;
        const other = list[j];
        const avgFixed = fixedVals.reduce((a, b) => a + b, 0) / fixedVals.length;
        if (Math.abs(fixedGet(other, fixedKey) - avgFixed) > band) continue;

        const otherLo = Math.min(runGet(other, runKey, 1), runGet(other, runKey, 2));
        const otherHi = Math.max(runGet(other, runKey, 1), runGet(other, runKey, 2));
        if (otherLo <= hi + gap && otherHi >= lo - gap) {
          lo = Math.min(lo, otherLo);
          hi = Math.max(hi, otherHi);
          fixedVals.push(fixedGet(other, fixedKey));
          used[j] = true;
          changed = true;
        }
      }
    }

    const fixed = Math.round(fixedVals.reduce((a, b) => a + b, 0) / fixedVals.length);
    if (dir === "h") out.push({ x1: lo, y1: fixed, x2: hi, y2: fixed, dir });
    else out.push({ x1: fixed, y1: lo, x2: fixed, y2: hi, dir });
  }
}

function fixedGet(s, key) {
  return key === "y" ? (s.y1 + s.y2) / 2 : (s.x1 + s.x2) / 2;
}

function runGet(s, key, n) {
  return key === "x" ? s["x" + n] : s["y" + n];
}

function segmentLength(s) {
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
}

// Parte cada muro en los puntos donde otro muro lo cruza (X) o lo toca en T,
// para que cada tramo entre uniones sea una entidad borrable por separado.
// Así, en una T con un lado que sobresale, puedes borrar solo ese pedazo.
export function splitSegmentsAtJunctions(segments, tol = 4) {
  const out = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;

    const params = [0, 1];
    for (let j = 0; j < segments.length; j++) {
      if (i === j) continue;
      const o = segments[j];
      // T: un extremo de o cae en el interior de s.
      pushInteriorParam(params, { x: o.x1, y: o.y1 }, s, dx, dy, len2, tol);
      pushInteriorParam(params, { x: o.x2, y: o.y2 }, s, dx, dy, len2, tol);
      // X: s y o se cruzan en el interior de ambos.
      const t = crossParam(s, o);
      if (t != null) params.push(t);
    }

    const cuts = dedupeSortedParams(params);
    for (let k = 0; k < cuts.length - 1; k++) {
      const t0 = cuts[k];
      const t1 = cuts[k + 1];
      const seg = {
        x1: Math.round(s.x1 + dx * t0),
        y1: Math.round(s.y1 + dy * t0),
        x2: Math.round(s.x1 + dx * t1),
        y2: Math.round(s.y1 + dy * t1),
      };
      if (segmentLength(seg) >= tol * 2) out.push(seg);
    }
  }
  return out;
}

function pushInteriorParam(params, p, s, dx, dy, len2, tol) {
  const t = ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / len2;
  if (t <= 0.02 || t >= 0.98) return; // solo interior, no los extremos
  const px = s.x1 + dx * t;
  const py = s.y1 + dy * t;
  if (Math.hypot(p.x - px, p.y - py) <= tol) params.push(t);
}

function crossParam(s, o) {
  const rx = s.x2 - s.x1;
  const ry = s.y2 - s.y1;
  const qx = o.x2 - o.x1;
  const qy = o.y2 - o.y1;
  const denom = rx * qy - ry * qx;
  if (Math.abs(denom) < 1e-6) return null; // paralelos
  const t = ((o.x1 - s.x1) * qy - (o.y1 - s.y1) * qx) / denom;
  const u = ((o.x1 - s.x1) * ry - (o.y1 - s.y1) * rx) / denom;
  if (t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98) return t;
  return null;
}

function dedupeSortedParams(params) {
  const sorted = params.filter((t) => t >= 0 && t <= 1).sort((a, b) => a - b);
  const out = [];
  for (const t of sorted) {
    if (!out.length || t - out[out.length - 1] > 0.01) out.push(t);
  }
  if (out[0] > 0) out.unshift(0);
  if (out[out.length - 1] < 1) out.push(1);
  return out;
}
