import { getFalConfig, isFalConfigured } from '../../config/floorPlanApis';

async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('No se pudo descargar la imagen upscaled.');
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo convertir la imagen upscaled.'));
    reader.readAsDataURL(blob);
  });
}

export async function upscaleSketchWithFal(dataUrl: string): Promise<string> {
  if (!isFalConfigured()) {
    return dataUrl;
  }

  const { apiKey, endpoint } = getFalConfig();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: dataUrl,
      scale: 2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`fal.ai respondió ${response.status}: ${errorText.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    image?: { url?: string };
    output?: { url?: string };
  };

  const outputUrl = payload.image?.url || payload.output?.url;
  if (!outputUrl) {
    throw new Error('fal.ai no devolvió URL de imagen.');
  }

  return urlToDataUrl(outputUrl);
}
