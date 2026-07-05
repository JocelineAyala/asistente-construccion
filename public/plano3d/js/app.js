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
  rotateDoorBtn: document.getElementById("rotateDoorBtn"),
  flipDoorHingeBtn: document.getElementById("flipDoorHingeBtn"),
  doorClearanceBtn: document.getElementById("doorClearanceBtn"),
  winW: document.getElementById("winW"),
  winWVal: document.getElementById("winWVal"),
  winH: document.getElementById("winH"),
  winHVal: document.getElementById("winHVal"),
  sill: document.getElementById("sill"),
  sillVal: document.getElementById("sillVal"),
  doorW: document.getElementById("doorW"),
  doorWVal: document.getElementById("doorWVal"),
  acTool: document.getElementById("acTool"),
  acManualTool: document.getElementById("acManualTool"),
  acHint: document.getElementById("acHint"),
  acEfficiencyVal: document.getElementById("acEfficiencyVal"),
  acEfficiencyFill: document.getElementById("acEfficiencyFill"),
  roofToggleBtn: document.getElementById("roofToggleBtn"),
  homeAnalysisSummary: document.getElementById("homeAnalysisSummary"),
  northButtons: [...document.querySelectorAll("[data-north]")],
  windButtons: [...document.querySelectorAll("[data-wind-from]")],
  comfortLayerButtons: [...document.querySelectorAll("[data-comfort-layer]")],
  controlGroups: [...document.querySelectorAll(".control-group")],
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
let acMode = "best";
let roofVisible = true;
let northDirection = "N";
let windFromDirection = "E";
let homeAnalysis = null;
let comfortLayer = "both";
let windAnimationFrame = null;
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
  homeAnalysis = null;
  builder.setACSuggestion(null);
  editHistory = [];
  lastAnalysisData = null;
  resetEditorOverlay();
  updateEditorButtons();
  els.analyzeBtn.disabled = false;
  els.status.textContent = "Imagen lista. Pulsa Analizar plano.";
  els.stats.innerHTML = "";
  els.tips.innerHTML = "";
  updateHomeAnalysis();
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
    updateHomeAnalysis();
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
els.rotateDoorBtn?.addEventListener("click", rotateLastDoor);
els.flipDoorHingeBtn?.addEventListener("click", flipLastDoorHinge);
els.doorClearanceBtn?.addEventListener("click", toggleLastDoorClearance);
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
  acMode = "best";
  setEditMode("select");
  acSuggestion = calculateACSuggestion();
  applyACSuggestion("best");
});

els.acManualTool?.addEventListener("click", () => {
  acMode = "manual";
  setEditMode("ac");
  if (els.acHint) {
    els.acHint.textContent = "Colocar A/C: haz clic sobre un muro. La eficiencia se calcula con puertas y ventanas como barreras.";
  }
});

els.roofToggleBtn?.addEventListener("click", () => {
  roofVisible = !roofVisible;
  builder.setRoofVisible(roofVisible);
  els.roofToggleBtn.textContent = roofVisible ? "Quitar techo" : "Poner techo";
});

els.northButtons.forEach((button) => {
  button.addEventListener("click", () => {
    northDirection = button.dataset.north || "N";
    els.northButtons.forEach((item) => item.classList.toggle("active", item === button));
    updateHomeAnalysis();
    redrawPlan();
  });
});

els.windButtons.forEach((button) => {
  button.addEventListener("click", () => {
    windFromDirection = button.dataset.windFrom || "E";
    els.windButtons.forEach((item) => item.classList.toggle("active", item === button));
    updateHomeAnalysis();
    redrawPlan();
  });
});

els.comfortLayerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    comfortLayer = button.dataset.comfortLayer || "sun";
    els.comfortLayerButtons.forEach((item) => item.classList.toggle("active", item === button));
    syncComfortOverlay3D();
    updateWindAnimation();
    redrawPlan();
  });
});

els.controlGroups.forEach((group) => {
  group.addEventListener("toggle", () => {
    if (!group.open) return;
    els.controlGroups.forEach((other) => {
      if (other !== group) other.open = false;
    });
  });
});

// Sincroniza aberturas + config con el 3D y reconstruye.
function applyOpenings() {
  builder.setOpenings(currentOpenings, openingCfg);
  builder.highlightSegment(selectedIndex);
  updateHomeAnalysis();
  updateEditorButtons();
}

function rotateLastDoor() {
  const index = findLastDoorIndex();
  if (index < 0) return;
  pushHistory();
  const door = currentOpenings[index];
  door.swing = (door.swing || 1) * -1;
  builder.setOpenings(currentOpenings, openingCfg);
  redrawPlan();
  updateEditorButtons();
}

function flipLastDoorHinge() {
  const index = findLastDoorIndex();
  if (index < 0) return;
  pushHistory();
  const door = currentOpenings[index];
  door.hinge = door.hinge === "end" ? "start" : "end";
  builder.setOpenings(currentOpenings, openingCfg);
  redrawPlan();
  updateEditorButtons();
}

function toggleLastDoorClearance() {
  const index = findLastDoorIndex();
  if (index < 0) return;
  pushHistory();
  const door = currentOpenings[index];
  const current = door.sideOffset || 0;
  door.sideOffset = current > 0 ? -0.18 : current < 0 ? 0 : 0.18;
  door.clearance = 0.08;
  builder.setOpenings(currentOpenings, openingCfg);
  redrawPlan();
  updateEditorButtons();
}

function applyACSuggestion(mode = "best") {
  builder.setACSuggestion(acSuggestion?.best || null);
  redrawPlan();
  updateACEfficiency(acSuggestion?.best || null);
  if (!els.acHint) return;
  if (!acSuggestion?.best) {
    els.acHint.textContent = "No hay muros suficientes para sugerir aire acondicionado.";
    return;
  }
  els.acHint.textContent = explainACSuggestion(acSuggestion.best, mode);
}

function updateACEfficiency(best) {
  const value = best ? Math.round(best.efficiency ?? best.coverage ?? 0) : 0;
  if (els.acEfficiencyVal) els.acEfficiencyVal.textContent = `${value}%`;
  if (els.acEfficiencyFill) {
    els.acEfficiencyFill.style.width = `${Math.max(0, Math.min(100, value))}%`;
    els.acEfficiencyFill.dataset.level = value >= 75 ? "high" : value >= 50 ? "medium" : "low";
  }
}

function explainACSuggestion(best, mode) {
  const prefix = mode === "manual" ? "Ubicación manual" : "Mejor posición";
  const blocked = best.blockedByOpenings || 0;
  const reason = [
    `eficiencia ${Math.round(best.efficiency)}%`,
    `cobertura ${Math.round(best.coverage)}%`,
    `${Math.round(best.avgDistance)} px promedio de flujo`,
  ];
  if (blocked) reason.push(`${blocked} rayos chocan con puertas/ventanas`);
  return `${prefix}: ${reason.join(", ")}. Se elige por mejor cobertura, menos choques tempranos y menor fuga por aberturas.`;
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
  } else if (editMode === "ac") {
    const target = resolveACTarget(point, hitTolerance(6));
    if (target) {
      acSuggestion = calculateManualACSuggestion(target);
      applyACSuggestion("manual");
    }
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
    ac: els.acManualTool,
  };
  Object.values(toolByMode).forEach((button) => button.classList.remove("active"));
  toolByMode[mode]?.classList.add("active");
  els.planCanvas.style.cursor =
    mode === "add" || mode === "ac" ? "crosshair" : mode === "select" ? "default" : "pointer";
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
  if (els.rotateDoorBtn) els.rotateDoorBtn.disabled = findLastDoorIndex() < 0;
  if (els.flipDoorHingeBtn) els.flipDoorHingeBtn.disabled = findLastDoorIndex() < 0;
  if (els.doorClearanceBtn) {
    const index = findLastDoorIndex();
    els.doorClearanceBtn.disabled = index < 0;
    if (index >= 0) {
      const offset = currentOpenings[index].sideOffset || 0;
      els.doorClearanceBtn.textContent = offset > 0 ? "Mover izquierda" : offset < 0 ? "Centrar puerta" : "Mover derecha";
    }
  }
}

function findLastDoorIndex() {
  for (let i = currentOpenings.length - 1; i >= 0; i--) {
    if (currentOpenings[i].type === "door") return i;
  }
  return -1;
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
  updateHomeAnalysis();
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
      if (o.type === "door") drawDoorSwing2D(ctx, o);
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

  try {
    drawHomeAnalysisOverlay(ctx);
  } catch (err) {
    console.warn("No se pudo dibujar el overlay de analisis del hogar.", err);
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
    ctx.strokeStyle = ray.hitDoor
      ? "rgba(251, 146, 60, 0.48)"
      : ray.hitOpening
        ? "rgba(96, 165, 250, 0.42)"
        : "rgba(56, 189, 248, 0.32)";
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

function drawDoorSwing2D(ctx, door) {
  const dx = door.x2 - door.x1;
  const dy = door.y2 - door.y1;
  const width = Math.hypot(dx, dy);
  if (width < 6) return;
  const hingeAtEnd = door.hinge === "end";
  const hx = hingeAtEnd ? door.x2 : door.x1;
  const hy = hingeAtEnd ? door.y2 : door.y1;
  const base = hingeAtEnd ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
  const swing = door.swing || 1;
  const start = base;
  const end = base + swing * Math.PI / 2;
  ctx.save();
  ctx.strokeStyle = "rgba(181, 121, 63, 0.65)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(hx, hy, width, Math.min(start, end), Math.max(start, end), swing < 0);
  ctx.stroke();
  ctx.restore();
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
    return type === "door"
      ? [{ x: p.x, y: p.y, type, swing: 1, hinge: "start", clearance: 0.08, sideOffset: 0 }]
      : [{ x: p.x, y: p.y, type }];
  }

  const pair = alignedWallPairPoints(a, b, firstTarget.point, secondTarget.point);
  if (type === "window" || type === "door") {
    const opening = {
      type,
      span: true,
      x1: pair.a.x,
      y1: pair.a.y,
      x2: pair.b.x,
      y2: pair.b.y,
    };
    if (type === "door") {
      opening.swing = 1;
      opening.hinge = "start";
      opening.clearance = 0.08;
      opening.sideOffset = 0;
    }
    return [opening];
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

function calculateManualACSuggestion(target) {
  if (!target || currentSegments.length < 2) return { best: null, alternatives: [] };
  const bounds = planBounds(currentSegments);
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const maxRay = Math.max(120, Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.75);
  const candidate = buildACCandidateFromTarget(target, center);
  if (!candidate) return { best: null, alternatives: [] };
  return { best: scoreACCandidate(candidate, bounds, center, maxRay), alternatives: [] };
}

function resolveACTarget(point, maxDistance) {
  const index = nearestSegmentIndex(point, maxDistance);
  if (index < 0) return null;
  return { index, point: projectOnSegment(point, currentSegments[index]) };
}

function buildACCandidateFromTarget(target, center) {
  const segment = currentSegments[target.index];
  if (!segment) return null;
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const len = Math.hypot(dx, dy);
  if (len < 40) return null;
  const lenSafe = Math.max(1, len);
  const normals = [
    { x: -dy / lenSafe, y: dx / lenSafe },
    { x: dy / lenSafe, y: -dx / lenSafe },
  ];
  const toCenter = { x: center.x - target.point.x, y: center.y - target.point.y };
  const normal = dot(normals[0], toCenter) >= dot(normals[1], toCenter) ? normals[0] : normals[1];
  return {
    x: target.point.x,
    y: target.point.y,
    wallIndex: target.index,
    angle: Math.atan2(normal.y, normal.x),
    wallLength: len,
    manual: true,
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
  let blockedByOpenings = 0;

  for (let i = 0; i < rayCount; i++) {
    const offset = -spread / 2 + (spread * i) / (rayCount - 1);
    const angle = candidate.angle + offset;
    const ray = traceACRay(candidate, angle, maxRay);
    rays.push(ray);
    totalDistance += ray.distance;
    if (ray.distance < maxRay * 0.28) earlyHits++;
    if (ray.hitDoor) doorHits++;
    if (ray.hitOpening) blockedByOpenings++;

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
  const exteriorDoorPenalty = nearestOpeningDistance(candidate, "door", { exteriorOnly: true });
  const centerAlignment = Math.max(0, Math.cos(candidate.angle - Math.atan2(center.y - candidate.y, center.x - candidate.x)));
  const cornerPenalty = nearestCornerDistance(candidate);

  const score =
    coverage * 1.0 +
    (avgDistance / maxRay) * 40 +
    centerAlignment * 18 -
    earlyHits * 3.5 -
    doorHits * 9 -
    blockedByOpenings * 5 -
    proximityPenalty(doorPenalty, 55) * 10 -
    proximityPenalty(exteriorDoorPenalty, 90) * 24 -
    proximityPenalty(windowPenalty, 70) * 14 -
    proximityPenalty(cornerPenalty, 45) * 10;

  const efficiency = Math.max(0, Math.min(100, score));

  return {
    ...candidate,
    rays,
    score,
    efficiency,
    coverage,
    avgDistance,
    blockedByOpenings,
  };
}

function traceACRay(origin, angle, maxRay) {
  const end = {
    x: origin.x + Math.cos(angle) * maxRay,
    y: origin.y + Math.sin(angle) * maxRay,
  };
  let bestT = 1;
  let hitOpening = null;
  currentSegments.forEach((segment) => {
    const hit = segmentIntersection(origin, end, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 });
    if (hit && hit.t > 0.025 && hit.t < bestT) bestT = hit.t;
  });
  openingBlockingSegments().forEach((blocker) => {
    const hit = segmentIntersection(origin, end, { x: blocker.x1, y: blocker.y1 }, { x: blocker.x2, y: blocker.y2 });
    if (hit && hit.t > 0.025 && hit.t < bestT) {
      bestT = hit.t;
      hitOpening = blocker.type;
    }
  });

  const distance = maxRay * bestT;
  const x2 = origin.x + Math.cos(angle) * distance;
  const y2 = origin.y + Math.sin(angle) * distance;
  return {
    x2,
    y2,
    distance,
    hitDoor: hitOpening === "door",
    hitOpening,
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

function openingBlockingSegments() {
  const bounds = planBounds(currentSegments);
  const blockers = [];
  currentOpenings.forEach((opening) => {
    const isExterior = isExteriorOpening(opening, bounds);
    if (opening.type === "door" && !isExterior) return;

    if (opening.span) {
      blockers.push({
        x1: opening.x1,
        y1: opening.y1,
        x2: opening.x2,
        y2: opening.y2,
        type: opening.type,
        isExterior,
      });
      return;
    }

    const wallIndex = nearestSegmentIndex(opening, 24);
    const wall = currentSegments[wallIndex];
    if (!wall) return;
    const p = projectOnSegment(opening, wall);
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;
    const half = opening.type === "door" ? 26 : 36;
    blockers.push({
      x1: p.x - ux * half,
      y1: p.y - uy * half,
      x2: p.x + ux * half,
      y2: p.y + uy * half,
      type: opening.type,
      isExterior,
    });
  });
  return blockers;
}

function isExteriorOpening(opening, bounds = planBounds(currentSegments)) {
  if (!opening || !bounds || !Number.isFinite(bounds.minX)) return false;
  if (opening.type === "window") return true;

  const span = openingSpanPoints(opening);
  const center = openingCenter(opening);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const edgeTol = Math.max(26, Math.min(width, height) * 0.07);
  const close = (p) => ({
    left: Math.abs(p.x - bounds.minX) <= edgeTol,
    right: Math.abs(p.x - bounds.maxX) <= edgeTol,
    top: Math.abs(p.y - bounds.minY) <= edgeTol,
    bottom: Math.abs(p.y - bounds.maxY) <= edgeTol,
  });
  const c = close(center);
  if (c.left || c.right || c.top || c.bottom) return true;

  if (span.length < 2) return false;
  const a = close(span[0]);
  const b = close(span[1]);
  return (
    (a.left && b.left) ||
    (a.right && b.right) ||
    (a.top && b.top) ||
    (a.bottom && b.bottom)
  );
}

function openingSpanPoints(opening) {
  if (opening.span) {
    return [
      { x: opening.x1, y: opening.y1 },
      { x: opening.x2, y: opening.y2 },
    ];
  }
  return [{ x: opening.x, y: opening.y }];
}

function openingCenter(opening) {
  if (opening.span) {
    return { x: (opening.x1 + opening.x2) / 2, y: (opening.y1 + opening.y2) / 2 };
  }
  return { x: opening.x, y: opening.y };
}

function isNearOpening(point, distance) {
  return currentOpenings.some((opening) => openingDistance(point, opening) < distance);
}

function nearestOpeningDistance(point, type, options = {}) {
  let best = Infinity;
  const bounds = options.exteriorOnly ? planBounds(currentSegments) : null;
  currentOpenings.forEach((opening) => {
    if (opening.type !== type) return;
    if (options.exteriorOnly && !isExteriorOpening(opening, bounds)) return;
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

function updateHomeAnalysis() {
  if (!els.homeAnalysisSummary) return;
  homeAnalysis = analyzeHomeComfort();
  els.homeAnalysisSummary.innerHTML = renderHomeAnalysisSummary(homeAnalysis);
  syncComfortOverlay3D();
  updateWindAnimation();
}

function syncComfortOverlay3D() {
  const showWind = comfortLayer === "wind" || comfortLayer === "both";
  if (!builder.setWindOverlay) return;
  if (!showWind || !homeAnalysis?.ready) {
    builder.setWindOverlay({ visible: false, pairs: [], bounds: null });
    return;
  }
  builder.setWindOverlay({
    visible: true,
    bounds: homeAnalysis.bounds,
    wind: homeAnalysis.wind,
    pairs: homeAnalysis.ventilationPairs.map((pair) => ({
      fallback: !!pair.fallback,
      heatRisk: !!pair.heatRisk,
      a: { point: { x: pair.a.point.x, y: pair.a.point.y } },
      b: { point: { x: pair.b.point.x, y: pair.b.point.y } },
    })),
  });
}

function analyzeHomeComfort() {
  if (!currentSegments.length) {
    return { ready: false, message: "Analiza o dibuja muros para activar el analisis del hogar." };
  }

  const bounds = planBounds(currentSegments);
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const windows = currentOpenings
    .filter((opening) => opening.type === "window")
    .map((opening, index) => analyzeWindow(opening, index, center));
  const wind = analyzeWindWindows(windows);
  const ventilationPairs = findVentilationPairs(windows, wind);
  const insulation = analyzeInsulation(bounds);

  return {
    ready: true,
    bounds,
    center,
    windows,
    wind,
    ventilationPairs,
    insulation,
  };
}

function renderHomeAnalysisSummary(analysis) {
  if (!analysis?.ready) return analysis?.message || "Analiza el plano para ver recomendaciones.";

  const sunCounts = analysis.windows.reduce((acc, item) => {
    acc[item.sunKey] = (acc[item.sunKey] || 0) + 1;
    return acc;
  }, {});
  const sunText = analysis.windows.length
    ? `${analysis.windows.length} ventanas: ${sunCounts.soft || 0} frescas, ${sunCounts.morning || 0} de manana, ${sunCounts.hot || 0} calientes.`
    : "Agrega ventanas para estimar sol por fachada.";
  const ventilationText = analysis.ventilationPairs.length
    ? `${analysis.ventilationPairs.length} recorridos de viento aprovechables. Entrada: ${analysis.wind.inlet.length}, salida: ${analysis.wind.outlet.length}.`
    : analysis.wind.heatRisk
      ? `Riesgo de calor: el viento viene desde ${windLabel(windFromDirection)} y faltan ventanas de entrada/salida alineadas.`
      : `Hay ventanas hacia el viento, pero falta una salida opuesta clara para cruzar aire.`;
  const meters = analysis.insulation.exteriorLengthPx / Math.max(1, currentImageSize.width || els.planCanvas.width || 1000) * 12;
  const insulationText = `${analysis.insulation.exterior.length} muros exteriores aprox. (${fmt(meters)} m de referencia visual), ${analysis.insulation.interior.length} interiores.`;

  return `
    <div class="analysis-card"><b>Asoleamiento</b>${sunText}</div>
    <div class="analysis-card ${analysis.wind.heatRisk ? "warn" : ""}"><b>Ventilacion cruzada</b>${ventilationText}</div>
    <div class="analysis-card"><b>Aislamiento</b>${insulationText}<br>Exteriores: prioriza termico. Interiores: prioriza acustico.</div>
  `;
}

function analyzeWindow(opening, index, center) {
  const wall = opening.span
    ? { x1: opening.x1, y1: opening.y1, x2: opening.x2, y2: opening.y2 }
    : currentSegments[nearestSegmentIndex(opening, hitTolerance(12))] || currentSegments[nearestSegmentIndex(opening, Infinity)];
  const point = openingCenter(opening);
  const dir = wall
    ? normalize2({ x: wall.x2 - wall.x1, y: wall.y2 - wall.y1 })
    : { x: 1, y: 0 };
  let normal = { x: -dir.y, y: dir.x };
  const away = normalize2({ x: point.x - center.x, y: point.y - center.y });
  if (dot(normal, away) < 0) normal = { x: -normal.x, y: -normal.y };
  const orientation = vectorToCompass(normal);
  const sun = sunInfoForOrientation(orientation);
  return {
    index,
    opening,
    point,
    normal,
    orientation,
    sunKey: sun.key,
    sunLabel: sun.label,
    color: sun.color,
  };
}

function vectorToCompass(vector) {
  const dirs = compassVectors();
  let best = "N";
  let bestDot = -Infinity;
  Object.entries(dirs).forEach(([name, dir]) => {
    const score = dot(vector, dir);
    if (score > bestDot) {
      bestDot = score;
      best = name;
    }
  });
  return best;
}

function compassVectors() {
  const base = {
    N: { x: 0, y: -1 },
    E: { x: 1, y: 0 },
    S: { x: 0, y: 1 },
    W: { x: -1, y: 0 },
  };
  const order = ["N", "E", "S", "W"];
  const shift = order.indexOf(northDirection);
  const rotated = {};
  order.forEach((label, index) => {
    rotated[label] = base[order[(index + shift + 4) % 4]];
  });
  return rotated;
}

function sunInfoForOrientation(orientation) {
  if (orientation === "E") return { key: "morning", label: "sol de manana", color: "#f59e0b" };
  if (orientation === "S") return { key: "hot", label: "sol fuerte gran parte del dia", color: "#fb923c" };
  if (orientation === "W") return { key: "hot", label: "calor de tarde", color: "#ef4444" };
  return { key: "soft", label: "luz fresca / poca carga termica", color: "#38bdf8" };
}

function analyzeWindWindows(windows) {
  const windVector = windVectorFromSelection();
  const inlet = [];
  const outlet = [];
  windows.forEach((item) => {
    const exposure = dot(item.normal, windVector);
    if (exposure < -0.35) inlet.push({ ...item, exposure });
    if (exposure > 0.35) outlet.push({ ...item, exposure });
  });
  return {
    from: windFromDirection,
    vector: windVector,
    inlet,
    outlet,
    heatRisk: windows.length > 0 && (!inlet.length || !outlet.length),
  };
}

function windVectorFromSelection() {
  const dirs = compassVectors();
  const from = dirs[windFromDirection] || dirs.E;
  return normalize2({ x: -from.x, y: -from.y });
}

function windLabel(value) {
  return value === "W" ? "O" : value;
}

function findVentilationPairs(windows, wind) {
  const pairs = [];
  const starts = wind?.inlet?.length ? wind.inlet : windows;
  const ends = wind?.outlet?.length ? wind.outlet : windows;
  for (let i = 0; i < starts.length; i++) {
    for (let j = 0; j < ends.length; j++) {
      const a = starts[i];
      const b = ends[j];
      if (a.index === b.index) continue;
      if (dot(a.normal, b.normal) > -0.25) continue;
      if (Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) < 60) continue;
      const blocked = currentSegments.some((segment) => {
        if (pointToSegmentDistance(a.point, segment) < 10 || pointToSegmentDistance(b.point, segment) < 10) return false;
        return segmentIntersection(a.point, b.point, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 });
      });
      if (!blocked) pairs.push({ a, b });
    }
  }
  return pairs.slice(0, 6);
}

function analyzeInsulation(bounds) {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const edgeTol = Math.max(24, Math.min(width, height) * 0.08);
  const exterior = [];
  const interior = [];
  currentSegments.forEach((segment, index) => {
    const mid = { x: (segment.x1 + segment.x2) / 2, y: (segment.y1 + segment.y2) / 2 };
    const nearEdge =
      Math.abs(mid.x - bounds.minX) < edgeTol ||
      Math.abs(mid.x - bounds.maxX) < edgeTol ||
      Math.abs(mid.y - bounds.minY) < edgeTol ||
      Math.abs(mid.y - bounds.maxY) < edgeTol;
    (nearEdge ? exterior : interior).push({ ...segment, index });
  });
  return {
    exterior,
    interior,
    exteriorLengthPx: exterior.reduce((sum, segment) => sum + segmentLength(segment), 0),
  };
}

function drawHomeAnalysisOverlay(ctx) {
  if (!homeAnalysis?.ready) return;
  const showSun = comfortLayer === "sun" || comfortLayer === "both";
  const showWind = comfortLayer === "wind" || comfortLayer === "both";
  if (showSun) drawNorthArrow(ctx, homeAnalysis.bounds);

  if (showSun) {
    homeAnalysis.windows.forEach((item) => {
      ctx.save();
      ctx.fillStyle = item.color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.point.x, item.point.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#102027";
      ctx.font = "700 10px sans-serif";
      ctx.fillText(item.orientation, item.point.x + 12, item.point.y - 10);
      ctx.restore();
    });
  }

  if (showWind) drawWindOverlay(ctx, homeAnalysis.ventilationPairs, homeAnalysis.bounds, homeAnalysis.wind);
}

function drawWindOverlay(ctx, pairs, bounds, wind) {
  const phase = (performance.now() / 90) % 18;
  const visiblePairs = pairs.length ? pairs : fallbackWindPairs(bounds, wind);
  visiblePairs.forEach((pair) => {
    const ax = pair.a.point.x;
    const ay = pair.a.point.y;
    const bx = pair.b.point.x;
    const by = pair.b.point.y;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.save();
    ctx.strokeStyle = pair.heatRisk ? "rgba(249, 115, 22, 0.48)" : pair.fallback ? "rgba(14, 165, 233, 0.34)" : "rgba(14, 165, 233, 0.68)";
    ctx.lineWidth = pair.fallback ? 2.2 : 3.2;
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -phase;
    for (let i = -1; i <= 1; i++) {
      const offset = i * 10;
      ctx.beginPath();
      ctx.moveTo(ax + nx * offset, ay + ny * offset);
      const cx = (ax + bx) / 2 + nx * (offset + 18);
      const cy = (ay + by) / 2 + ny * (offset + 18);
      ctx.quadraticCurveTo(cx, cy, bx + nx * offset, by + ny * offset);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    drawWindArrowHead(ctx, bx, by, Math.atan2(dy, dx), pair.heatRisk);
    ctx.restore();
  });
}

function fallbackWindPairs(bounds, wind) {
  if (!bounds || !Number.isFinite(bounds.minX)) return [];
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const dir = wind?.vector || { x: 1, y: 0 };
  const perp = { x: -dir.y, y: dir.x };
  const distance = Math.max(width, height) * 0.35;
  return [0.32, 0.5, 0.68].map((ratio) => ({
    fallback: true,
    heatRisk: !!wind?.heatRisk,
    a: { point: { x: center.x - dir.x * distance + perp.x * (ratio - 0.5) * height * 0.42, y: center.y - dir.y * distance + perp.y * (ratio - 0.5) * height * 0.42 } },
    b: { point: { x: center.x + dir.x * distance + perp.x * (ratio - 0.5) * height * 0.42, y: center.y + dir.y * distance + perp.y * (ratio - 0.5) * height * 0.42 } },
  }));
}

function drawWindArrowHead(ctx, x, y, angle, heatRisk = false) {
  const size = 9;
  ctx.fillStyle = heatRisk ? "rgba(249, 115, 22, 0.72)" : "rgba(14, 165, 233, 0.72)";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(angle - 0.45) * size, y - Math.sin(angle - 0.45) * size);
  ctx.lineTo(x - Math.cos(angle + 0.45) * size, y - Math.sin(angle + 0.45) * size);
  ctx.closePath();
  ctx.fill();
}

function updateWindAnimation() {
  const shouldAnimate = comfortLayer === "wind" || comfortLayer === "both";
  if (!shouldAnimate) {
    if (windAnimationFrame) cancelAnimationFrame(windAnimationFrame);
    windAnimationFrame = null;
    return;
  }
  if (windAnimationFrame) return;
  const tick = () => {
    if (comfortLayer !== "wind" && comfortLayer !== "both") {
      windAnimationFrame = null;
      return;
    }
    redrawPlan();
    windAnimationFrame = requestAnimationFrame(tick);
  };
  windAnimationFrame = requestAnimationFrame(tick);
}

function drawNorthArrow(ctx, bounds) {
  const dirs = compassVectors();
  const n = dirs.N;
  const x = bounds.minX + 34;
  const y = bounds.minY + 42;
  ctx.save();
  ctx.strokeStyle = "#ef4444";
  ctx.fillStyle = "#ef4444";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + n.x * 32, y + n.y * 32);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + n.x * 32, y + n.y * 32, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "900 16px sans-serif";
  ctx.fillText("N", x + n.x * 40 - 5, y + n.y * 40 + 5);
  ctx.restore();
}

function normalize2(vector) {
  const len = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / len, y: vector.y / len };
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
