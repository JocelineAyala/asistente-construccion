# Plano3D Backend

Backend Express para analizar planos de construccion desde una imagen.

## Instalar

```bash
npm install
```

## Configurar

Duplica `.env.example` como `.env` y completa tus credenciales:

```bash
copy .env.example .env
```

Variables requeridas:

- `FAL_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ROBOFLOW_API_KEY`
- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`

## Ejecutar

```bash
npm run dev
```

Servidor por defecto:

```text
http://localhost:3001
```

## Endpoint

`POST /analizar-plano`

Enviar `multipart/form-data` con el campo:

```text
foto=<imagen del plano>
```

Ejemplo:

```bash
curl -X POST http://localhost:3001/analizar-plano ^
  -F "foto=@C:\ruta\plano.jpg"
```

Respuesta:

```json
{
  "muros": [],
  "perimetro_total_m": 0,
  "area_total_m2": 0,
  "bloques_estimados": 0,
  "sacos_cemento_estimados": 0,
  "imagen_procesada_url": "https://..."
}
```
