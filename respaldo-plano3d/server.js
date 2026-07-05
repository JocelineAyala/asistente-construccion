import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const PORT = process.env.PORT || 3001;
const STANDARD_WALL_HEIGHT_M = 2.5;
const WALL_QUOTE_DISTANCE_THRESHOLD = 450;

const REQUIRED_ENV = [
  "FAL_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "ROBOFLOW_API_KEY",
  "CF_ACCOUNT_ID",
  "CF_API_TOKEN",
];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "plano3d-backend" });
});

app.post("/analizar-plano", upload.single("foto"), async (req, res) => {
  try {
    validateEnv();
    if (!req.file) {
      return res.status(400).json({
        error: "Falta la imagen. Envia multipart/form-data con el campo 'foto'.",
      });
    }

    console.log("[/analizar-plano] Inicio", {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      bytes: req.file.size,
    });

    const falResult = await upscaleWithFalOptional(req.file.buffer, req.file.mimetype);
    const cloudinaryResult = await uploadAndTransformWithCloudinary(falResult.imageUrl);
    const processedBuffer = await downloadBuffer(cloudinaryResult.transformedUrl, "Descargar imagen procesada");
    const processedBase64 = processedBuffer.toString("base64");

    const wallsResult = await detectWallsWithRoboflowOptional(processedBase64);
    const ocrQuotes = await extractQuotesWithCloudflare(processedBuffer);

    const imageSize = {
      width: cloudinaryResult.width || 1000,
      height: cloudinaryResult.height || 1000,
    };
    const walls = combineWallsAndQuotes(wallsResult, ocrQuotes, imageSize);
    const materials = calculateMaterials(walls);

    const response = {
      muros: walls,
      perimetro_total_m: materials.perimetro_total_m,
      area_total_m2: materials.area_total_m2,
      bloques_estimados: materials.bloques_estimados,
      sacos_cemento_estimados: materials.sacos_cemento_estimados,
      imagen_procesada_url: cloudinaryResult.transformedUrl,
      imagen_width: cloudinaryResult.width,
      imagen_height: cloudinaryResult.height,
      fal_error: falResult.error || null,
      roboflow_error: wallsResult.roboflow_error || null,
    };

    console.log("[/analizar-plano] Fin", {
      muros: walls.length,
      perimetro_total_m: response.perimetro_total_m,
    });
    res.json(response);
  } catch (error) {
    console.error("[/analizar-plano] Error", error);
    res.status(error.status || 500).json({
      error: error.message || "Error inesperado",
      paso: error.step || "desconocido",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Plano3D escuchando en http://localhost:${PORT}`);
});

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new StepError(
      "configuracion",
      `Faltan variables de entorno: ${missing.join(", ")}`,
      500
    );
  }
}

async function upscaleWithFal(imageBuffer, mimeType) {
  const step = "PASO 1 - Upscale con fal.ai";
  console.log(`[${step}] Inicio`);
  try {
    const imageBase64 = imageBuffer.toString("base64");
    const response = await fetchJson("https://fal.run/fal-ai/esrgan", {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
        scale: 2,
      }),
    }, step);

    const imageUrl = pickFalImageUrl(response);
    if (!imageUrl) {
      throw new StepError(step, "fal.ai no devolvio una URL de imagen procesada.");
    }

    console.log(`[${step}] Fin`, { imageUrl });
    return imageUrl;
  } catch (error) {
    throw wrapStepError(step, error);
  }
}

async function upscaleWithFalOptional(imageBuffer, mimeType) {
  try {
    const imageUrl = await upscaleWithFal(imageBuffer, mimeType);
    return { imageUrl, error: null };
  } catch (error) {
    console.warn("[PASO 1 - fal.ai auxiliar] Fallo, se continua con imagen original", error.message);
    return {
      imageUrl: bufferToDataUri(imageBuffer, mimeType || "image/jpeg"),
      error: error.message || "fal.ai fallo",
    };
  }
}

async function uploadAndTransformWithCloudinary(imageUrl) {
  const step = "PASO 2 - Cloudinary transformaciones";
  console.log(`[${step}] Inicio`);
  try {
    const uploadResult = await cloudinary.uploader.upload(imageUrl, {
      folder: "plano3d",
      resource_type: "image",
    });

    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      secure: true,
      resource_type: "image",
      format: "png",
      transformation: [
        { effect: "grayscale" },
        { effect: "contrast:50" },
        { effect: "blackwhite:40" },
      ],
    });

    console.log(`[${step}] Fin`, {
      publicId: uploadResult.public_id,
      transformedUrl,
    });

    return {
      transformedUrl,
      width: uploadResult.width,
      height: uploadResult.height,
    };
  } catch (error) {
    throw wrapStepError(step, error);
  }
}

async function detectWallsWithRoboflow(imageBase64) {
  const step = "PASO 3 - Deteccion de muros con Roboflow";
  console.log(`[${step}] Inicio`);
  try {
    const url = `https://serverless.roboflow.com/floor-plan-walls/5?api_key=${process.env.ROBOFLOW_API_KEY}`;
    const attempts = [
      {
        name: "json-image-object",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: {
              type: "base64",
              value: imageBase64,
            },
          }),
        },
      },
      {
        name: "json-image-string",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageBase64 }),
        },
      },
      {
        name: "raw-base64",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: imageBase64,
        },
      },
    ];

    let result = null;
    const errors = [];
    for (const attempt of attempts) {
      try {
        console.log(`[${step}] Probando formato ${attempt.name}`);
        result = await fetchJson(url, attempt.options, step);
        console.log(`[${step}] Formato aceptado: ${attempt.name}`);
        break;
      } catch (error) {
        errors.push(`${attempt.name}: ${error.message}`);
      }
    }

    if (!result) {
      throw new StepError(step, errors.join(" | "), 400);
    }

    console.log(`[${step}] Fin`, {
      predictions: Array.isArray(result.predictions) ? result.predictions.length : 0,
    });
    return result;
  } catch (error) {
    throw wrapStepError(step, error);
  }
}

async function detectWallsWithRoboflowOptional(imageBase64) {
  try {
    return await detectWallsWithRoboflow(imageBase64);
  } catch (error) {
    console.warn("[PASO 3 - Roboflow auxiliar] Fallo, se continua con OpenCV local", error.message);
    return {
      predictions: [],
      roboflow_error: error.message || "Roboflow fallo",
    };
  }
}

async function extractQuotesWithCloudflare(imageBuffer) {
  const step = "PASO 4 - OCR de cotas con Cloudflare Workers AI";
  console.log(`[${step}] Inicio`);

  const prompt =
    "Lista todas las medidas/cotas numericas que veas en este plano de construccion (ej. 3.50m), junto con su posicion aproximada (arriba/abajo/izquierda/derecha/centro). Devuelve SOLO un JSON array de objetos con los campos: valor, posicion.";

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}` +
    "/ai/run/@cf/meta/llama-3.2-11b-vision-instruct";

  try {
    let result;
    try {
      result = await runCloudflareVision(endpoint, {
        prompt,
        image: Array.from(imageBuffer),
      }, step);
    } catch (arrayBytesError) {
      console.log(`[${step}] Formato array de bytes fallo, probando base64`, arrayBytesError.message);
      result = await runCloudflareVision(endpoint, {
        prompt,
        image: imageBuffer.toString("base64"),
      }, step);
    }

    const text = extractCloudflareText(result);
    const quotes = parseJsonArrayFromText(text);
    console.log(`[${step}] Fin`, { cotas: quotes.length });
    return quotes;
  } catch (error) {
    throw wrapStepError(step, error);
  }
}

async function runCloudflareVision(endpoint, body, step) {
  try {
    return await fetchJson(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }, step);
  } catch (error) {
    const message = String(error.message || "");
    if (error.status === 403 && message.includes("Model Agreement")) {
      console.log(`[${step}] Aceptando licencia del modelo con prompt 'agree'`);
      await fetchJson(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "agree" }),
      }, `${step} - aceptar licencia`);

      console.log(`[${step}] Licencia aceptada, reintentando OCR`);
      return await fetchJson(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }, step);
    }
    throw error;
  }
}

function combineWallsAndQuotes(roboflowResult, quotes, imageSize) {
  const step = "PASO 5 - Combinar muros + cotas";
  console.log(`[${step}] Inicio`);

  const normalizedWalls = normalizeRoboflowWalls(roboflowResult);
  const positionedQuotes = quotes
    .map((quote) => ({
      ...quote,
      center: approximateQuoteCenter(quote.posicion, imageSize),
    }))
    .filter((quote) => quote.valor && quote.center);

  const walls = normalizedWalls.map((wall) => {
    let best = null;
    let bestDistance = Infinity;

    for (const quote of positionedQuotes) {
      const distance = euclideanDistance(wall.center, quote.center);
      if (distance < bestDistance) {
        best = quote;
        bestDistance = distance;
      }
    }

    const cotaCercana = best && bestDistance <= WALL_QUOTE_DISTANCE_THRESHOLD;
    return {
      ...wall,
      medida_asociada: cotaCercana ? best.valor : null,
      posicion_cota: cotaCercana ? best.posicion : null,
      distancia_cota_px: cotaCercana ? Number(bestDistance.toFixed(2)) : null,
    };
  });

  console.log(`[${step}] Fin`, { muros: walls.length, cotas: positionedQuotes.length });
  return walls;
}

function calculateMaterials(walls) {
  const step = "PASO 6 - Calcular materiales";
  console.log(`[${step}] Inicio`);

  const perimetroTotal = walls.reduce((sum, wall) => {
    const value = parseMeasureToMeters(wall.medida_asociada);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  const areaTotal = perimetroTotal * STANDARD_WALL_HEIGHT_M;

  const materials = {
    perimetro_total_m: round2(perimetroTotal),
    area_total_m2: round2(areaTotal),
    bloques_estimados: Math.ceil(areaTotal / 0.09),
    sacos_cemento_estimados: Math.ceil(areaTotal / 12),
  };

  console.log(`[${step}] Fin`, materials);
  return materials;
}

async function fetchJson(url, options, step) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new StepError(
      step,
      `${step} fallo con HTTP ${response.status}: ${text.slice(0, 500)}`,
      response.status
    );
  }

  return data;
}

async function downloadBuffer(url, step) {
  console.log(`[${step}] Inicio`);
  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new StepError(
      step,
      `${step} fallo con HTTP ${response.status}: ${detail.slice(0, 300)}`,
      response.status
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  console.log(`[${step}] Fin`, { bytes: arrayBuffer.byteLength });
  return Buffer.from(arrayBuffer);
}

function pickFalImageUrl(response) {
  return (
    response?.image?.url ||
    response?.url ||
    response?.data?.url ||
    response?.output?.url ||
    response?.images?.[0]?.url ||
    null
  );
}

function bufferToDataUri(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function normalizeRoboflowWalls(result) {
  const predictions = Array.isArray(result?.predictions) ? result.predictions : [];
  return predictions.map((prediction, index) => {
    const x = Number(prediction.x || 0);
    const y = Number(prediction.y || 0);
    const width = Number(prediction.width || prediction.w || 0);
    const height = Number(prediction.height || prediction.h || 0);
    const segment = prediction.points?.length
      ? segmentFromPoints(prediction.points)
      : segmentFromBox(x, y, width, height);

    return {
      id: prediction.id || `muro_${index + 1}`,
      clase: prediction.class || prediction.label || "wall",
      confianza: prediction.confidence ?? null,
      bbox: { x, y, width, height },
      center: { x, y },
      ...segment,
    };
  });
}

function segmentFromBox(x, y, width, height) {
  if (width >= height) {
    return {
      x1: x - width / 2,
      y1: y,
      x2: x + width / 2,
      y2: y,
    };
  }

  return {
    x1: x,
    y1: y - height / 2,
    x2: x,
    y2: y + height / 2,
  };
}

function segmentFromPoints(points) {
  const normalized = points
    .map((point) => ({
      x: Number(point.x),
      y: Number(point.y),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (normalized.length < 2) return {};

  let bestPair = [normalized[0], normalized[1]];
  let bestDistance = 0;
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const distance = euclideanDistance(normalized[i], normalized[j]);
      if (distance > bestDistance) {
        bestDistance = distance;
        bestPair = [normalized[i], normalized[j]];
      }
    }
  }

  return {
    x1: bestPair[0].x,
    y1: bestPair[0].y,
    x2: bestPair[1].x,
    y2: bestPair[1].y,
  };
}

function approximateQuoteCenter(position = "", imageSize) {
  const normalized = String(position).toLowerCase();
  const center = { x: imageSize.width / 2, y: imageSize.height / 2 };

  if (normalized.includes("izquierda")) center.x = imageSize.width * 0.15;
  if (normalized.includes("derecha")) center.x = imageSize.width * 0.85;
  if (normalized.includes("arriba")) center.y = imageSize.height * 0.15;
  if (normalized.includes("abajo")) center.y = imageSize.height * 0.85;
  if (normalized.includes("centro")) {
    center.x = imageSize.width / 2;
    center.y = imageSize.height / 2;
  }

  return center;
}

function extractCloudflareText(result) {
  return (
    result?.result?.response ||
    result?.result?.text ||
    result?.response ||
    result?.text ||
    JSON.stringify(result)
  );
}

function parseJsonArrayFromText(text) {
  const trimmed = String(text || "").trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

function parseMeasureToMeters(value) {
  if (!value) return null;
  const match = String(value).match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  return Number(match[1].replace(",", "."));
}

function euclideanDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function wrapStepError(step, error) {
  if (error instanceof StepError) return error;
  return new StepError(step, `${step} fallo: ${error.message || error}`, error.status || 500);
}

class StepError extends Error {
  constructor(step, message, status = 500) {
    super(message);
    this.name = "StepError";
    this.step = step;
    this.status = status;
  }
}
