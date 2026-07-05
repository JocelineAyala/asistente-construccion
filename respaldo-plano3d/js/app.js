import { Builder3D } from "./builder3d.js";
import { detectWalls, splitSegmentsAtJunctions } from "./planProcessor.js";

const BACKEND_URL = "http://localhost:3001/analizar-plano";

const els = {
  fileInput: document.getElementById("fileInput"),
  analyzeBtn: document.getElementById("detectBtn"),
  status: document.getElementById("cvStatus"),
  progressList: document.getElementById("progressList"),
  planCanvas: document.getElementById("planCanvas"),
  scene3d: document.getElementById("scene3d"),
  wallHeight: document.getElementById("wallHeight"),
  wallHeightVal: document.getElementById("wallHeightVal"),
  stats: document.getElementById("carbonStats"),
  tips: document.getElementById("carbonTips"),
  selectTool: document.getElementById("selectTool"),
  addWallTool: document.getElementById("addWallTool"),
  deleteWallTool: document.getElementById("deleteWallTool"),
  undoEditBtn: document.getElementById("undoEditBtn"),
  clearWallsBtn: document.getElementById("clearWallsBtn"),
  editorHint: document.getElementById("editorHint"),
  windowTool: document.getElementById("windowTool"),
  doorTool: document.getElementById("doorTool"),
  winW: document.getElementById("winW"),
  winWVal: document.getElementById("winWVal"),
  winH: document.getElementById("winH"),
  winHVal: document.getElementById("winHVal"),
  sill: document.getElementById("sill"),
  sillVal: document.getElementById("sillVal"),
  doorW: document.getElementById("doorW"),
  doorWVal: document.getElementById("doorWVal"),
  acTool: document.getElementById("acTool"),
  acHint: document.getElementById("acHint"),
};

const EDITOR_HINTS = {
  select: "👆 Ver: gira la cámara libre. Clic en un muro (2D/3D) lo selecciona; Supr lo borra.",
  add: "➕ Agregar (cámara fija): clic en 2 vértices en el 3D para unir dos paredes; en 2D arrastra.",
  delete: "➖ Quitar (cámara fija): clic en el tramo resaltado en rojo. Se borra solo ese pedazo.",
  window: "🪟 Ventana (cámara fija): clic sobre un muro en el 3D. Ajusta ancho/alto/repisa abajo.",
  door: "🚪 Puerta (cámara fija): clic sobre un muro en el 3D. Se dibuja abierta con su arco.",
};

EDITOR_HINTS.window = "Ventana: selecciona pared A y luego pared B. La app abre las dos caras alineadas.";
EDITOR_HINTS.door = "Puerta: selecciona pared A y luego pared B. Si eliges la misma pared, crea una sola puerta.";
EDITOR_HINTS.delete = "Quitar: clic borra un tramo completo; arrastra sobre una linea para borrar solo ese pedazo.";
EDITOR_HINTS.window = "Ventana: marca inicio y final. Se crea ventana completa entre esos dos puntos.";
EDITOR_HINTS.door = "Puerta: marca inicio y final. Se crea una sola puerta grande entre esos dos puntos.";

const openingCfg = { windowWidth: 1.1, windowHeight: 1.1, sill: 0.9, doorWidth: 0.9 };
let currentOpenings = []; // [{x, y (px en el plano), type: 'window'|'door'}]

let currentFile = null;
let currentSegments = [];
let currentImageSize = { width: 0, height: 0 };
let progressTimers = [];
let processedImage = null;
let cvReady = false;
let editMode = "select";
let editStart = null;
let editHistory = [];
let lastAnalysisData = null;
let floorPlanCanvas = null;
let pendingOpeningSegment = null; // primera pared elegida para ventana/puerta A -> B
let eraseStart = null;
let eraseTargetIndex = -1;
let erasePreview = null;
let isPanningPlan = false;
let panStart = null;
let canvasView = { scale: 1, x: 0, y: 0 };
let acSuggestion = null;
let hoverIndex = -1; // muro bajo el cursor (modo quitar)
let selectedIndex = -1; // muro seleccionado (modo ver)
let previewSeg = null; // línea fantasma mientras se arrastra (modo agregar)

const HIT_TOLERANCE = 14; // px de cercanía para seleccionar/quitar un muro

const MIN_HIT_TOLERANCE = 3.5;

const PROCESS_STEPS = [
  { id: "fal", label: "Upscale fal.ai", target: 18, ms: 5000 },
  { id: "cloudinary", label: "Limpieza Cloudinary", target: 35, ms: 5000 },
  { id: "roboflow", label: "Roboflow auxiliar", target: 58, ms: 7000 },
  { id: "cloudflare", label: "OCR de cotas", target: 82, ms: 9000 },
  { id: "opencv", label: "Muros OpenCV local", target: 92, ms: 2500 },
  { id: "materials", label: "Materiales y 3D", target: 95, ms: 2500 },
];

const builder = new Builder3D(els.scene3d);

// Edición desde el 3D (se sincroniza con el 2D vía currentSegments).
builder.onWallPick = (index) => {
  if (editMode === "delete") {
    if (index < 0) return;
    pushHistory();
    currentSegments.splice(index, 1);
    resetEditorOverlay();
    redrawPlan();
    rebuildEditedModel();
  } else if (editMode === "select") {
    selectedIndex = index;
    redrawPlan();
    builder.highlightSegment(index);
  }
};

builder.onWallAdd = (segment) => {
  pushHistory();
  currentSegments.push(segment);
  currentSegments = splitSegmentsAtJunctions(currentSegments);
  resetEditorOverlay();
  redrawPlan();
  rebuildEditedModel();
};

builder.onOpeningAdd = (opening) => {
  const target = resolveOpeningTarget(opening, hitTolerance(8));
  if (target) {
    handleOpeningSegmentSelection(target, opening.type);
  }
};

window.__cvReady = () => {
  cvReady = true;
};

(function waitForCv() {
  if (cvReady) return;
  if (typeof cv !== "undefined" && cv.Mat) {
    window.__cvReady();
    return;
  }
  setTimeout(waitForCv, 200);
})();

els.fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  currentFile = file;
  currentSegments = [];
  currentOpenings = [];
  processedImage = null;
  floorPlanCanvas = null;
  canvasView = { scale: 1, x: 0, y: 0 };
  acSuggestion = null;
  builder.setACSuggestion(null);
  editHistory = [];
  lastAnalysisData = null;
  resetEditorOverlay();
  updateEditorButtons();
  els.analyzeBtn.disabled = false;
  els.status.textContent = "Imagen lista. Pulsa Analizar plano.";
  els.stats.innerHTML = "";
  els.tips.innerHTML = "";
  resetProgress();
  previewImage(URL.createObjectURL(file));
});

els.analyzeBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  els.analyzeBtn.disabled = true;
  els.status.textContent = "Analizando con backend IA...";
  startProgress();

  try {
    const fd = new FormData();
    fd.append("foto", currentFile, currentFile.name);

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    let imageForOpenCv = processedImage;
    if (data.imagen_procesada_url) {
      imageForOpenCv = await loadImageToCanvas(data.imagen_procesada_url).catch((err) => {
        console.warn("No se pudo dibujar la imagen procesada, se mantiene el preview local.", err);
        return processedImage;
      });
    }
    floorPlanCanvas = makeCanvasCopy(els.planCanvas);

    const localDetection = detectWallsLocal(imageForOpenCv);
    currentSegments = localDetection.segments.length
      ? localDetection.segments
      : wallsToSegments(data.muros || []);
    currentSegments = splitSegmentsAtJunctions(currentSegments);
    currentImageSize = localDetection.segments.length
      ? { width: localDetection.width, height: localDetection.height }
      : {
          width: data.imagen_width || els.planCanvas.width || 1000,
          height: data.imagen_height || els.planCanvas.height || 1000,
        };

    resetEditorOverlay();
    builder.buildWalls(
      currentSegments,
      currentImageSize.width,
      currentImageSize.height,
      parseFloat(els.wallHeight.value)
    );

    renderMaterials(data, currentSegments.length, localDetection.segments.length);
    lastAnalysisData = data;
    builder.setFloorPlanTexture(floorPlanCanvas || els.planCanvas, currentImageSize.width, currentImageSize.height);
    updateEditorButtons();
    completeProgress();
    const statusText = localDetection.segments.length
      ? `Listo: ${currentSegments.length} muros detectados con OpenCV local.`
      : `Listo: ${currentSegments.length} muros detectados por fallback backend.`;
    const warnings = [];
    if (data.fal_error) warnings.push("fal.ai se salto");
    if (data.roboflow_error) warnings.push("Roboflow auxiliar fallo");
    els.status.textContent = warnings.length
      ? `${statusText} ${warnings.join("; ")}, pero el 3D sigue con OpenCV.`
      : statusText;
  } catch (err) {
    failProgress();
    els.status.textContent = `Error: ${err.message}`;
    console.error(err);
  } finally {
    els.analyzeBtn.disabled = false;
  }
});

els.selectTool.addEventListener("click", () => setEditMode("select"));
els.addWallTool.addEventListener("click", () => setEditMode("add"));
els.deleteWallTool.addEventListener("click", () => setEditMode("delete"));
els.windowTool.addEventListener("click", () => setEditMode("window"));
els.doorTool.addEventListener("click", () => setEditMode("door"));
els.undoEditBtn.addEventListener("click", undoEdit);
els.clearWallsBtn.addEventListener("click", () => {
  if (!currentSegments.length && !currentOpenings.length) return;
  pushHistory();
  currentSegments = [];
  currentOpenings = [];
  resetEditorOverlay();
  redrawPlan();
  applyOpenings();
});

// Sliders de ventanas/puertas: ajustan tamaño en vivo (aplica a todas).
function bindOpeningSlider(input, label, unit, apply) {
  input.addEventListener("input", () => {
    label.textContent = `${parseFloat(input.value).toFixed(1)} ${unit}`;
    apply(parseFloat(input.value));
    applyOpenings();
  });
}
bindOpeningSlider(els.winW, els.winWVal, "m", (v) => (openingCfg.windowWidth = v));
bindOpeningSlider(els.winH, els.winHVal, "m", (v) => (openingCfg.windowHeight = v));
bindOpeningSlider(els.sill, els.sillVal, "m", (v) => (openingCfg.sill = v));
bindOpeningSlider(els.doorW, els.doorWVal, "m", (v) => (openingCfg.doorWidth = v));

els.acTool?.addEventListener("click", () => {
  acSuggestion = calculateACSuggestion();
  builder.setACSuggestion(acSuggestion?.best || null);
  redrawPlan();
  if (!els.acHint) return;
  if (!acSuggestion?.best) {
    els.acHint.textContent = "No hay muros suficientes para sugerir aire acondicionado.";
    return;
  }
  els.acHint.textContent = `Recomendado: cobertura ${Math.round(acSuggestion.best.coverage)}%, score ${Math.round(acSuggestion.best.score)}.`;
});

// Sincroniza aberturas + config con el 3D y reconstruye.
function applyOpenings() {
  builder.setOpenings(currentOpenings, openingCfg);
  builder.highlightSegment(selectedIndex);
  updateEditorButtons();
}

els.planCanvas.addEventListener("pointerdown", (event) => {
  if (event.button === 1 || event.button === 2 || event.altKey) {
    isPanningPlan = true;
    panStart = { clientX: event.clientX, clientY: event.clientY, x: canvasView.x, y: canvasView.y };
    els.planCanvas.setPointerCapture(event.pointerId);
    return;
  }

  const point = canvasPoint(event);
  if (editMode === "add") {
    editStart = point;
    previewSeg = { x1: point.x, y1: point.y, x2: point.x, y2: point.y };
    els.planCanvas.setPointerCapture(event.pointerId);
  } else if (editMode === "delete") {
    const index = nearestSegmentIndex(point, hitTolerance());
    if (index >= 0) {
      eraseStart = point;
      eraseTargetIndex = index;
      erasePreview = null;
      els.planCanvas.setPointerCapture(event.pointerId);
    }
  } else if (editMode === "select") {
    selectedIndex = nearestSegmentIndex(point, hitTolerance());
    redrawPlan();
  } else if (editMode === "window" || editMode === "door") {
    // Coloca la abertura sobre el muro más cercano, proyectada en su centro.
    const target = resolveOpeningTarget(point, hitTolerance(6));
    if (target) {
      handleOpeningSegmentSelection(target, editMode);
    }
  }
});

els.planCanvas.addEventListener("pointermove", (event) => {
  if (isPanningPlan && panStart) {
    canvasView.x = panStart.x + event.clientX - panStart.clientX;
    canvasView.y = panStart.y + event.clientY - panStart.clientY;
    redrawPlan();
    return;
  }

  const point = canvasPoint(event);
  if (editMode === "add" && editStart) {
    const end = snapEditSegment(editStart, point);
    previewSeg = { x1: editStart.x, y1: editStart.y, x2: end.x, y2: end.y };
    redrawPlan();
  } else if (editMode === "delete" && eraseStart && eraseTargetIndex >= 0) {
    const segment = currentSegments[eraseTargetIndex];
    if (segment) {
      const a = projectOnSegment(eraseStart, segment);
      const b = projectOnSegment(point, segment);
      erasePreview = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      redrawPlan();
    }
  } else if (editMode === "delete") {
    const index = nearestSegmentIndex(point, hitTolerance());
    if (index !== hoverIndex) {
      hoverIndex = index;
      redrawPlan();
    }
  }
});

els.planCanvas.addEventListener("pointerleave", () => {
  if (isPanningPlan || eraseStart) return;
  if (hoverIndex === -1 && !previewSeg) return;
  hoverIndex = -1;
  if (!editStart) previewSeg = null;
  redrawPlan();
});

els.planCanvas.addEventListener("pointerup", (event) => {
  if (isPanningPlan) {
    isPanningPlan = false;
    panStart = null;
    els.planCanvas.releasePointerCapture(event.pointerId);
    return;
  }

  if (editMode === "delete" && eraseStart && eraseTargetIndex >= 0) {
    const endPoint = canvasPoint(event);
    const didErase = eraseSegmentPortion(eraseTargetIndex, eraseStart, endPoint);
    eraseStart = null;
    eraseTargetIndex = -1;
    erasePreview = null;
    hoverIndex = -1;
    els.planCanvas.releasePointerCapture(event.pointerId);
    redrawPlan();
    if (didErase) rebuildEditedModel();
    return;
  }

  if (editMode !== "add" || !editStart) return;
  const end = snapEditSegment(editStart, canvasPoint(event));
  els.planCanvas.releasePointerCapture(event.pointerId);
  const isValid = Math.hypot(end.x - editStart.x, end.y - editStart.y) >= 10;
  if (isValid) {
    pushHistory();
    currentSegments.push({ x1: editStart.x, y1: editStart.y, x2: end.x, y2: end.y });
    currentSegments = splitSegmentsAtJunctions(currentSegments);
  }
  editStart = null;
  previewSeg = null;
  redrawPlan();
  if (isValid) rebuildEditedModel();
});

els.planCanvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = els.planCanvas.getBoundingClientRect();
  const sx = ((event.clientX - rect.left) / rect.width) * els.planCanvas.width;
  const sy = ((event.clientY - rect.top) / rect.height) * els.planCanvas.height;
  const before = screenToCanvasPoint(sx, sy);
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  canvasView.scale = Math.max(0.5, Math.min(6, canvasView.scale * factor));
  canvasView.x = sx - before.x * canvasView.scale;
  canvasView.y = sy - before.y * canvasView.scale;
  redrawPlan();
}, { passive: false });

els.planCanvas.addEventListener("contextmenu", (event) => event.preventDefault());

// Borrar el muro seleccionado con Supr/Backspace (modo Ver).
window.addEventListener("keydown", (event) => {
  if (event.key !== "Delete" && event.key !== "Backspace") return;
  if (selectedIndex < 0 || selectedIndex >= currentSegments.length) return;
  if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
  event.preventDefault();
  pushHistory();
  currentSegments.splice(selectedIndex, 1);
  selectedIndex = -1;
  redrawPlan();
  rebuildEditedModel();
});

function resetProgress() {
  clearProgressTimers();
  els.progressList.innerHTML = PROCESS_STEPS.map((step) => `
    <div class="progress-item" data-step="${step.id}">
      <div class="progress-row">
        <b>${step.label}</b>
        <span>0%</span>
      </div>
      <div class="progress-track"><div class="progress-fill"></div></div>
    </div>
  `).join("");
}

function startProgress() {
  resetProgress();
  PROCESS_STEPS.forEach((step, index) => {
    const timer = window.setTimeout(() => {
      setStepProgress(step.id, step.target, "Procesando");
      for (let i = 0; i < index; i++) {
        setStepProgress(PROCESS_STEPS[i].id, 100, "Listo", "done");
      }
    }, PROCESS_STEPS.slice(0, index).reduce((sum, item) => sum + item.ms, 0));
    progressTimers.push(timer);
  });
}

function completeProgress() {
  clearProgressTimers();
  PROCESS_STEPS.forEach((step) => setStepProgress(step.id, 100, "Listo", "done"));
}

function failProgress() {
  clearProgressTimers();
  const active = [...els.progressList.querySelectorAll(".progress-item")]
    .find((item) => !item.classList.contains("done"));
  if (!active) return;
  active.classList.add("error");
  const label = active.querySelector(".progress-row span");
  if (label) label.textContent = "Error";
}

function clearProgressTimers() {
  progressTimers.forEach((timer) => window.clearTimeout(timer));
  progressTimers = [];
}

function setStepProgress(id, percent, text, state) {
  const item = els.progressList.querySelector(`[data-step="${id}"]`);
  if (!item) return;
  item.classList.remove("error");
  if (state) item.classList.add(state);
  const fill = item.querySelector(".progress-fill");
  const label = item.querySelector(".progress-row span");
  if (fill) fill.style.width = `${percent}%`;
  if (label) label.textContent = text || `${percent}%`;
}

els.wallHeight.addEventListener("input", () => {
  els.wallHeightVal.textContent = `${els.wallHeight.value} m`;
  if (!currentSegments.length) return;
  builder.buildWalls(
    currentSegments,
    currentImageSize.width,
    currentImageSize.height,
    parseFloat(els.wallHeight.value)
  );
});

function previewImage(src) {
  return loadImageToCanvas(src).then((image) => {
    processedImage = image;
    return image;
  });
}

function loadImageToCanvas(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const ctx = els.planCanvas.getContext("2d");
      const scale = Math.min(1, 900 / image.naturalWidth);
      els.planCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      els.planCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      ctx.clearRect(0, 0, els.planCanvas.width, els.planCanvas.height);
      ctx.drawImage(image, 0, 0, els.planCanvas.width, els.planCanvas.height);
      resolve(image);
    };
    image.onerror = () => reject(new Error("No se pudo cargar la imagen procesada."));
    image.src = src;
  });
}

function detectWallsLocal(image) {
  if (!image) return { segments: [], width: els.planCanvas.width, height: els.planCanvas.height };
  if (!cvReady || typeof cv === "undefined" || !cv.Mat) {
    console.warn("OpenCV aun no esta listo, usando fallback backend.");
    return { segments: [], width: els.planCanvas.width, height: els.planCanvas.height };
  }

  try {
    return detectWalls(image, els.planCanvas, {
      darkness: 145,
      thickness: 2,
      threshold: 45,
      orthoOnly: true,
      showMask: false,
    });
  } catch (err) {
    console.warn("OpenCV local fallo, usando fallback backend.", err);
    return { segments: [], width: els.planCanvas.width, height: els.planCanvas.height };
  }
}

function setEditMode(mode) {
  editMode = mode;
  editStart = null;
  previewSeg = null;
  eraseStart = null;
  eraseTargetIndex = -1;
  erasePreview = null;
  isPanningPlan = false;
  hoverIndex = -1;
  selectedIndex = -1;
  pendingOpeningSegment = null;
  const toolByMode = {
    select: els.selectTool,
    add: els.addWallTool,
    delete: els.deleteWallTool,
    window: els.windowTool,
    door: els.doorTool,
  };
  Object.values(toolByMode).forEach((button) => button.classList.remove("active"));
  toolByMode[mode]?.classList.add("active");
  els.planCanvas.style.cursor =
    mode === "add" ? "crosshair" : mode === "select" ? "default" : "pointer";
  if (els.editorHint && EDITOR_HINTS[mode]) els.editorHint.textContent = EDITOR_HINTS[mode];
  builder.setWallEditMode(mode);
  builder.highlightSegment(selectedIndex);
  redrawPlan();
}

function pushHistory() {
  editHistory.push({
    segments: currentSegments.map((s) => ({ ...s })),
    openings: currentOpenings.map((o) => ({ ...o })),
  });
  if (editHistory.length > 20) editHistory.shift();
  updateEditorButtons();
}

function undoEdit() {
  const previous = editHistory.pop();
  if (!previous) return;
  currentSegments = previous.segments;
  currentOpenings = previous.openings;
  resetEditorOverlay();
  redrawPlan();
  builder.setOpenings(currentOpenings, openingCfg);
  rebuildEditedModel();
  updateEditorButtons();
}

function resetEditorOverlay() {
  hoverIndex = -1;
  selectedIndex = -1;
  previewSeg = null;
  editStart = null;
  pendingOpeningSegment = null;
  eraseStart = null;
  eraseTargetIndex = -1;
  erasePreview = null;
}

function updateEditorButtons() {
  els.undoEditBtn.disabled = !editHistory.length;
  els.clearWallsBtn.disabled = !currentSegments.length && !currentOpenings.length;
}

function rebuildEditedModel() {
  const hadAC = !!acSuggestion;
  builder.openings = currentOpenings; // aberturas siempre en sync antes de construir
  builder.openingCfg = { ...builder.openingCfg, ...openingCfg };
  builder.buildWalls(
    currentSegments,
    currentImageSize.width || els.planCanvas.width || 1000,
    currentImageSize.height || els.planCanvas.height || 1000,
    parseFloat(els.wallHeight.value)
  );
  builder.setFloorPlanTexture(floorPlanCanvas || els.planCanvas, currentImageSize.width, currentImageSize.height);
  builder.setWallEditMode(editMode); // refresca imanes de esquinas para el modo actual
  builder.highlightSegment(selectedIndex);
  if (hadAC) {
    acSuggestion = calculateACSuggestion();
    builder.setACSuggestion(acSuggestion?.best || null);
  }
  renderMaterials(lastAnalysisData || {}, currentSegments.length, currentSegments.length);
  updateEditorButtons();
}

function makeCanvasCopy(source) {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  copy.getContext("2d").drawImage(source, 0, 0);
  return copy;
}

function redrawPlan() {
  const ctx = els.planCanvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, els.planCanvas.width, els.planCanvas.height);
  ctx.save();
  ctx.setTransform(canvasView.scale, 0, 0, canvasView.scale, canvasView.x, canvasView.y);
  if (processedImage) {
    ctx.drawImage(processedImage, 0, 0, els.planCanvas.width, els.planCanvas.height);
  }

  ctx.lineCap = "round";
  currentSegments.forEach((s, index) => {
    const isHover = index === hoverIndex && editMode === "delete";
    const isSelected = index === selectedIndex;
    if (isHover) {
      ctx.strokeStyle = "#f87171"; // rojo: se va a borrar
      ctx.lineWidth = 6;
    } else if (isSelected) {
      ctx.strokeStyle = "#fbbf24"; // ámbar: seleccionado
      ctx.lineWidth = 6;
    } else {
      ctx.strokeStyle = "#34d399"; // verde: muro normal
      ctx.lineWidth = 3;
    }
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    if (isHover || isSelected) {
      drawHandle(ctx, s.x1, s.y1);
      drawHandle(ctx, s.x2, s.y2);
    }
  });

  // Aberturas (ventanas azul, puertas marrón) sobre los muros.
  currentOpenings.forEach((o) => {
    if (o.span) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = o.type === "door" ? "#b5793f" : "#60a5fa";
      ctx.lineWidth = o.type === "door" ? 8 : 6;
      ctx.beginPath();
      ctx.moveTo(o.x1, o.y1);
      ctx.lineTo(o.x2, o.y2);
      ctx.stroke();
      drawHandle(ctx, o.x1, o.y1);
      drawHandle(ctx, o.x2, o.y2);
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.arc(o.x, o.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = o.type === "door" ? "#b5793f" : "#60a5fa";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e5eef5";
    ctx.stroke();
  });

  if (previewSeg) {
    ctx.save();
    ctx.setLineDash([9, 6]);
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(previewSeg.x1, previewSeg.y1);
    ctx.lineTo(previewSeg.x2, previewSeg.y2);
    ctx.stroke();
    ctx.restore();
    drawHandle(ctx, previewSeg.x1, previewSeg.y1);
    drawHandle(ctx, previewSeg.x2, previewSeg.y2);
  }

  if (erasePreview) {
    ctx.save();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 7;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(erasePreview.x1, erasePreview.y1);
    ctx.lineTo(erasePreview.x2, erasePreview.y2);
    ctx.stroke();
    ctx.restore();
  }

  drawACOverlay(ctx);
  ctx.restore();
}

function drawHandle(ctx, x, y) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#0b1016";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#e5eef5";
  ctx.stroke();
  ctx.restore();
}

function drawACOverlay(ctx) {
  if (!acSuggestion?.best) return;
  const alternatives = acSuggestion.alternatives || [];
  alternatives.forEach((item) => drawACMarker(ctx, item, "rgba(148, 163, 184, 0.45)", false));

  const best = acSuggestion.best;
  ctx.save();
  best.rays.forEach((ray) => {
    ctx.strokeStyle = ray.hitDoor ? "rgba(251, 146, 60, 0.42)" : "rgba(56, 189, 248, 0.32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(best.x, best.y);
    ctx.lineTo(ray.x2, ray.y2);
    ctx.stroke();
  });

  for (let r = 24; r <= 72; r += 24) {
    ctx.beginPath();
    ctx.arc(best.x, best.y, r, best.angle - 0.6, best.angle + 0.6);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();

  drawACMarker(ctx, best, "#38bdf8", true);
}

function drawACMarker(ctx, item, color, label) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#e0f2fe";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-16, -9, 32, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (label) {
    ctx.save();
    ctx.fillStyle = "#e0f2fe";
    ctx.strokeStyle = "rgba(2, 6, 23, 0.85)";
    ctx.lineWidth = 4;
    ctx.font = "bold 13px system-ui, sans-serif";
    const text = `A/C ${Math.round(item.coverage)}%`;
    ctx.strokeText(text, item.x + 12, item.y - 14);
    ctx.fillText(text, item.x + 12, item.y - 14);
    ctx.restore();
  }
}

function canvasPoint(event) {
  const rect = els.planCanvas.getBoundingClientRect();
  const sx = ((event.clientX - rect.left) / rect.width) * els.planCanvas.width;
  const sy = ((event.clientY - rect.top) / rect.height) * els.planCanvas.height;
  return screenToCanvasPoint(sx, sy);
}

function screenToCanvasPoint(sx, sy) {
  return {
    x: (sx - canvasView.x) / canvasView.scale,
    y: (sy - canvasView.y) / canvasView.scale,
  };
}

function hitTolerance(extra = 0) {
  return Math.max(MIN_HIT_TOLERANCE, (HIT_TOLERANCE + extra) / canvasView.scale);
}

function snapEditSegment(start, end) {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  return dx >= dy ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
}

function resolveOpeningTarget(point, maxDistance) {
  const cornerTarget = nearestCornerSmallFaceTarget(point, maxDistance);
  if (cornerTarget) return cornerTarget;

  const index = nearestSegmentIndex(point, maxDistance);
  if (index < 0) return null;
  return {
    index,
    point: projectOnSegment(point, currentSegments[index]),
  };
}

function nearestCornerSmallFaceTarget(point, maxDistance) {
  let best = null;
  currentSegments.forEach((segment, index) => {
    [
      { x: segment.x1, y: segment.y1 },
      { x: segment.x2, y: segment.y2 },
    ].forEach((corner) => {
      const distance = Math.hypot(point.x - corner.x, point.y - corner.y);
      if (distance > maxDistance) return;
      if (!best || distance < best.distance) best = { corner, distance, index };
    });
  });
  if (!best) return null;

  const connected = currentSegments
    .map((segment, index) => ({ segment, index, length: segmentLength(segment) }))
    .filter(({ segment }) => endpointDistance(segment, best.corner) <= hitTolerance(-6))
    .sort((a, b) => a.length - b.length);

  const chosen = connected[0] || { index: best.index, segment: currentSegments[best.index] };
  return {
    index: chosen.index,
    point: projectOnSegment(best.corner, chosen.segment),
  };
}

function handleOpeningSegmentSelection(target, type) {
  if (!target || !currentSegments[target.index]) return;

  if (!pendingOpeningSegment || pendingOpeningSegment.type !== type) {
    pendingOpeningSegment = { ...target, type };
    selectedIndex = target.index;
    builder.highlightSegment(target.index);
    redrawPlan();
    if (els.editorHint) {
      els.editorHint.textContent = `${type === "door" ? "Puerta" : "Ventana"}: pared A lista. Ahora selecciona la pared B.`;
    }
    return;
  }

  const openings = buildOpeningsBetweenSegments(pendingOpeningSegment, target, type);
  pendingOpeningSegment = null;
  selectedIndex = -1;
  if (!openings.length) return;

  pushHistory();
  currentOpenings.push(...openings);
  applyOpenings();
  redrawPlan();
  if (els.editorHint && EDITOR_HINTS[type]) els.editorHint.textContent = EDITOR_HINTS[type];
}

function buildOpeningsBetweenSegments(firstTarget, secondTarget, type) {
  const firstIndex = firstTarget.index;
  const secondIndex = secondTarget.index;
  const a = currentSegments[firstIndex];
  const b = currentSegments[secondIndex];
  if (!a || !b) return [];
  if (firstIndex === secondIndex) {
    const p = projectOnSegment(secondTarget.point, b);
    return [{ x: p.x, y: p.y, type }];
  }

  const pair = alignedWallPairPoints(a, b, firstTarget.point, secondTarget.point);
  if (type === "window" || type === "door") {
    return [{
      type,
      span: true,
      x1: pair.a.x,
      y1: pair.a.y,
      x2: pair.b.x,
      y2: pair.b.y,
    }];
  }

  return uniqueOpenings([
    { x: pair.a.x, y: pair.a.y, type },
    { x: pair.b.x, y: pair.b.y, type },
  ]);
}

function alignedWallPairPoints(a, b, firstPoint, secondPoint) {
  const ac = segmentCenter(a);
  const bc = segmentCenter(b);
  const aHorizontal = Math.abs(a.x2 - a.x1) >= Math.abs(a.y2 - a.y1);
  const bHorizontal = Math.abs(b.x2 - b.x1) >= Math.abs(b.y2 - b.y1);

  if (aHorizontal === bHorizontal) {
    if (aHorizontal) {
      const x = Number.isFinite(firstPoint?.x) ? firstPoint.x : (ac.x + bc.x) / 2;
      return {
        a: projectOnSegment({ x, y: ac.y }, a),
        b: projectOnSegment({ x, y: bc.y }, b),
      };
    }
    const y = Number.isFinite(firstPoint?.y) ? firstPoint.y : (ac.y + bc.y) / 2;
    return {
      a: projectOnSegment({ x: ac.x, y }, a),
      b: projectOnSegment({ x: bc.x, y }, b),
    };
  }

  return {
    a: projectOnSegment(secondPoint || bc, a),
    b: projectOnSegment(firstPoint || ac, b),
  };
}

function uniqueOpenings(openings) {
  const seen = new Set();
  return openings.filter((opening) => {
    const key = `${Math.round(opening.x)}:${Math.round(opening.y)}:${opening.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function segmentCenter(segment) {
  return {
    x: (segment.x1 + segment.x2) / 2,
    y: (segment.y1 + segment.y2) / 2,
  };
}

function calculateACSuggestion() {
  if (currentSegments.length < 2) return { best: null, alternatives: [] };
  const bounds = planBounds(currentSegments);
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const maxRay = Math.max(120, Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.75);
  const candidates = buildACCandidates(center);
  if (!candidates.length) return { best: null, alternatives: [] };

  const scored = candidates
    .map((candidate) => scoreACCandidate(candidate, bounds, center, maxRay))
    .sort((a, b) => b.score - a.score);
  const best = scored[0] || null;
  return {
    best,
    alternatives: scored.slice(1, 3),
  };
}

function buildACCandidates(center) {
  const candidates = [];
  const spacing = 40;
  currentSegments.forEach((segment, wallIndex) => {
    const len = segmentLength(segment);
    if (len < 70) return;
    const count = Math.max(1, Math.floor(len / spacing));
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      if (t < 0.14 || t > 0.86) continue;
      const x = segment.x1 + (segment.x2 - segment.x1) * t;
      const y = segment.y1 + (segment.y2 - segment.y1) * t;
      const point = { x, y };
      if (isNearOpening(point, 34)) continue;
      if (isNearCorner(point, 28)) continue;

      const dx = segment.x2 - segment.x1;
      const dy = segment.y2 - segment.y1;
      const lenSafe = Math.max(1, Math.hypot(dx, dy));
      const normals = [
        { x: -dy / lenSafe, y: dx / lenSafe },
        { x: dy / lenSafe, y: -dx / lenSafe },
      ];
      const toCenter = { x: center.x - x, y: center.y - y };
      const normal = dot(normals[0], toCenter) >= dot(normals[1], toCenter) ? normals[0] : normals[1];
      candidates.push({
        x,
        y,
        wallIndex,
        angle: Math.atan2(normal.y, normal.x),
        wallLength: len,
      });
    }
  });
  return candidates;
}

function scoreACCandidate(candidate, bounds, center, maxRay) {
  const rayCount = 23;
  const spread = (70 * Math.PI) / 180;
  const rays = [];
  const covered = new Set();
  let totalDistance = 0;
  let earlyHits = 0;
  let doorHits = 0;

  for (let i = 0; i < rayCount; i++) {
    const offset = -spread / 2 + (spread * i) / (rayCount - 1);
    const angle = candidate.angle + offset;
    const ray = traceACRay(candidate, angle, maxRay);
    rays.push(ray);
    totalDistance += ray.distance;
    if (ray.distance < maxRay * 0.28) earlyHits++;
    if (ray.hitDoor) doorHits++;

    const samples = Math.max(3, Math.floor(ray.distance / 18));
    for (let s = 0; s <= samples; s++) {
      const t = s / samples;
      const px = candidate.x + Math.cos(angle) * ray.distance * t;
      const py = candidate.y + Math.sin(angle) * ray.distance * t;
      if (px < bounds.minX || px > bounds.maxX || py < bounds.minY || py > bounds.maxY) continue;
      covered.add(`${Math.round(px / 24)}:${Math.round(py / 24)}`);
    }
  }

  const avgDistance = totalDistance / rayCount;
  const bboxCells = Math.max(1, ((bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)) / (24 * 24));
  const coverage = Math.min(100, (covered.size / bboxCells) * 130);
  const doorPenalty = nearestOpeningDistance(candidate, "door");
  const windowPenalty = nearestOpeningDistance(candidate, "window");
  const centerAlignment = Math.max(0, Math.cos(candidate.angle - Math.atan2(center.y - candidate.y, center.x - candidate.x)));
  const cornerPenalty = nearestCornerDistance(candidate);

  const score =
    coverage * 1.0 +
    (avgDistance / maxRay) * 40 +
    centerAlignment * 18 -
    earlyHits * 3.5 -
    doorHits * 7 -
    proximityPenalty(doorPenalty, 90) * 28 -
    proximityPenalty(windowPenalty, 70) * 14 -
    proximityPenalty(cornerPenalty, 45) * 10;

  return {
    ...candidate,
    rays,
    score,
    coverage,
    avgDistance,
  };
}

function traceACRay(origin, angle, maxRay) {
  const end = {
    x: origin.x + Math.cos(angle) * maxRay,
    y: origin.y + Math.sin(angle) * maxRay,
  };
  let bestT = 1;
  currentSegments.forEach((segment) => {
    const hit = segmentIntersection(origin, end, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 });
    if (hit && hit.t > 0.025 && hit.t < bestT) bestT = hit.t;
  });

  const distance = maxRay * bestT;
  const x2 = origin.x + Math.cos(angle) * distance;
  const y2 = origin.y + Math.sin(angle) * distance;
  return {
    x2,
    y2,
    distance,
    hitDoor: rayCrossesOpening(origin, { x: x2, y: y2 }, "door"),
  };
}

function segmentIntersection(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const den = cross(r, s);
  if (Math.abs(den) < 0.0001) return null;
  const qp = { x: c.x - a.x, y: c.y - a.y };
  const t = cross(qp, s) / den;
  const u = cross(qp, r) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, u, x: a.x + r.x * t, y: a.y + r.y * t };
}

function rayCrossesOpening(a, b, type) {
  return currentOpenings.some((opening) => {
    if (opening.type !== type) return false;
    if (opening.span) {
      return segmentIntersection(a, b, { x: opening.x1, y: opening.y1 }, { x: opening.x2, y: opening.y2 });
    }
    return pointToSegmentDistance(opening, { x1: a.x, y1: a.y, x2: b.x, y2: b.y }) < 18;
  });
}

function isNearOpening(point, distance) {
  return currentOpenings.some((opening) => openingDistance(point, opening) < distance);
}

function nearestOpeningDistance(point, type) {
  let best = Infinity;
  currentOpenings.forEach((opening) => {
    if (opening.type !== type) return;
    best = Math.min(best, openingDistance(point, opening));
  });
  return best;
}

function openingDistance(point, opening) {
  if (opening.span) {
    return pointToSegmentDistance(point, { x1: opening.x1, y1: opening.y1, x2: opening.x2, y2: opening.y2 });
  }
  return Math.hypot(point.x - opening.x, point.y - opening.y);
}

function isNearCorner(point, distance) {
  return nearestCornerDistance(point) < distance;
}

function nearestCornerDistance(point) {
  let best = Infinity;
  currentSegments.forEach((segment) => {
    best = Math.min(
      best,
      Math.hypot(point.x - segment.x1, point.y - segment.y1),
      Math.hypot(point.x - segment.x2, point.y - segment.y2)
    );
  });
  return best;
}

function planBounds(segments) {
  return segments.reduce(
    (bounds, segment) => ({
      minX: Math.min(bounds.minX, segment.x1, segment.x2),
      maxX: Math.max(bounds.maxX, segment.x1, segment.x2),
      minY: Math.min(bounds.minY, segment.y1, segment.y2),
      maxY: Math.max(bounds.maxY, segment.y1, segment.y2),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );
}

function proximityPenalty(distance, radius) {
  if (!Number.isFinite(distance) || distance >= radius) return 0;
  return 1 - distance / radius;
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function nearestSegmentIndex(point, maxDistance) {
  let best = -1;
  let bestDistance = Infinity;
  currentSegments.forEach((segment, index) => {
    const distance = pointToSegmentDistance(point, segment);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return bestDistance <= maxDistance ? best : -1;
}

function eraseSegmentPortion(index, startPoint, endPoint) {
  const segment = currentSegments[index];
  if (!segment) return false;
  const t1 = segmentT(segment, startPoint);
  const t2 = segmentT(segment, endPoint);
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) return false;

  let a = Math.max(0, Math.min(t1, t2));
  let b = Math.min(1, Math.max(t1, t2));
  if (Math.abs(b - a) < 0.035) {
    pushHistory();
    currentSegments.splice(index, 1);
    return true;
  }

  const pad = 0.01;
  a = Math.max(0, a - pad);
  b = Math.min(1, b + pad);

  const pieces = [];
  if (a > 0.02) pieces.push(segmentSlice(segment, 0, a));
  if (b < 0.98) pieces.push(segmentSlice(segment, b, 1));
  pushHistory();
  currentSegments.splice(index, 1, ...pieces);
  selectedIndex = -1;
  return true;
}

function segmentT(segment, point) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const len2 = dx * dx + dy * dy;
  if (!len2) return 0;
  return Math.max(0, Math.min(1, ((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / len2));
}

function segmentSlice(segment, a, b) {
  return {
    x1: segment.x1 + (segment.x2 - segment.x1) * a,
    y1: segment.y1 + (segment.y2 - segment.y1) * a,
    x2: segment.x1 + (segment.x2 - segment.x1) * b,
    y2: segment.y1 + (segment.y2 - segment.y1) * b,
  };
}

function pointToSegmentDistance(point, segment) {
  const ax = segment.x1;
  const ay = segment.y1;
  const bx = segment.x2;
  const by = segment.y2;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(point.x - ax, point.y - ay);
  const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / len2));
  return Math.hypot(point.x - (ax + t * dx), point.y - (ay + t * dy));
}

// Punto del segmento más cercano al clic (para pegar la abertura al muro).
function segmentLength(segment) {
  return Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
}

function endpointDistance(segment, point) {
  return Math.min(
    Math.hypot(point.x - segment.x1, point.y - segment.y1),
    Math.hypot(point.x - segment.x2, point.y - segment.y2)
  );
}

function projectOnSegment(point, segment) {
  const ax = segment.x1;
  const ay = segment.y1;
  const dx = segment.x2 - ax;
  const dy = segment.y2 - ay;
  const len2 = dx * dx + dy * dy;
  if (!len2) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / len2));
  return { x: ax + t * dx, y: ay + t * dy };
}

function wallsToSegments(walls) {
  return walls
    .map((wall) => {
      if (Number.isFinite(wall.x1) && Number.isFinite(wall.y1) && Number.isFinite(wall.x2) && Number.isFinite(wall.y2)) {
        return {
          x1: wall.x1,
          y1: wall.y1,
          x2: wall.x2,
          y2: wall.y2,
        };
      }

      const box = wall.bbox;
      if (!box) return null;

      const x = Number(box.x || 0);
      const y = Number(box.y || 0);
      const width = Number(box.width || 0);
      const height = Number(box.height || 0);

      if (width >= height) {
        return { x1: x - width / 2, y1: y, x2: x + width / 2, y2: y };
      }
      return { x1: x, y1: y - height / 2, x2: x, y2: y + height / 2 };
    })
    .filter(Boolean);
}

function renderMaterials(data, wallCount, localWallCount = 0) {
  els.stats.innerHTML = `
    <div class="metric"><span>Muros 3D OpenCV</span><b>${localWallCount || wallCount}</b></div>
    <div class="metric"><span>Muros Roboflow</span><b>${(data.muros || []).length}</b></div>
    <div class="metric"><span>Perimetro</span><b>${fmt(data.perimetro_total_m)} m</b></div>
    <div class="metric"><span>Area de muros</span><b>${fmt(data.area_total_m2)} m2</b></div>
    <div class="metric"><span>Bloques</span><b>${data.bloques_estimados || 0}</b></div>
    <div class="metric"><span>Sacos cemento</span><b>${data.sacos_cemento_estimados || 0}</b></div>
  `;

  const measuredWalls = (data.muros || []).filter((wall) => wall.medida_asociada);
  els.tips.innerHTML = measuredWalls.length
    ? measuredWalls
        .slice(0, 12)
        .map((wall) => `<li>${wall.id || "muro"}: ${wall.medida_asociada}</li>`)
        .join("")
    : "<li>El backend no asocio cotas a los muros.</li>";
}

function fmt(value) {
  return Number(value || 0).toLocaleString("es", {
    maximumFractionDigits: 2,
  });
}
