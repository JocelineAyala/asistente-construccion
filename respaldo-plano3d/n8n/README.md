# Flujo n8n — Preprocesado de plano con fal.ai

Workflow importable que limpia la imagen del plano antes de detectar paredes.

## Flujo
```
Webhook → Preparar (data-URI) → fal.ai Upscale (ESRGAN) → Descargar imagen → Responder
```

## Cómo importarlo
1. En n8n: **Workflows → ⋯ (arriba a la derecha) → Import from File**.
2. Elige `preprocesado-fal.workflow.json`.
3. Se crean los 5 nodos ya conectados.

## Lo ÚNICO que falta (cuando tengas acceso a fal)
El nodo **"fal.ai Upscale (ESRGAN)"** necesita la credencial:
1. Abre ese nodo → *Credential for Header Auth* → **Create New**.
2. Rellena:
   - **Name:** `Authorization`
   - **Value:** `Key TU_FAL_API_KEY`  ← tu llave de fal.ai/dashboard/keys
3. Guarda y selecciónala en el nodo.

**Nada más.** Todo lo demás (CORS, conversión a base64, descarga, respuesta binaria) ya está configurado.

## Para usarlo
1. Activa el workflow (toggle **Active**).
2. Copia la **Production URL** del webhook: `…/webhook/blueprint-upload`.
3. Pégala en la app (campo "Webhook n8n") y usa el botón **"✨ Mejorar imagen (n8n)"**.

## Si aún NO tienes fal
Puedes probar el resto borrando temporalmente el nodo de fal y conectando
**Preparar → Descargar** no aplica (no hay URL). En ese caso, mejor usa la app
directo (sin webhook) hasta tener la key. El flujo está pensado para fal.
