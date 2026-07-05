function readEnv(key: string): string | undefined {
  const value = import.meta.env[key]?.trim();
  return value || undefined;
}

export function isFalConfigured(): boolean {
  return Boolean(readEnv('VITE_FAL_API_KEY'));
}

export function getFalConfig() {
  return {
    apiKey: readEnv('VITE_FAL_API_KEY')!,
    endpoint: readEnv('VITE_FAL_ENDPOINT') || 'https://fal.run/fal-ai/esrgan',
  };
}

/** Servicios activos en el flujo de planos: fal.ai + trazado local (+ OpenAI aparte). */
export function getConfiguredPipelineLabels(): string[] {
  const labels = ['trazado local'];
  if (isFalConfigured()) labels.unshift('fal.ai');
  return labels;
}
