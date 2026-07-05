export function getActiveOpenAiKey(): string | undefined {
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  const isEnvKeyConfigured = envKey && envKey !== 'tu_api_key_aqui';

  if (isEnvKeyConfigured) {
    return envKey;
  }

  const localKey = localStorage.getItem('buildassist:openai-api-key')?.trim();
  return localKey || undefined;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getActiveOpenAiKey());
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  return dataUrl.split(',')[1];
}

export function getImageDimensions(
  source: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => reject(new Error('No se pudo leer las dimensiones de la imagen.'));
    image.src = source;
  });
}
