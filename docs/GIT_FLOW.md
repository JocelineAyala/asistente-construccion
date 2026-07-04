# Git Flow y reglas de deploy

Esta guia define un flujo simple para trabajar features, preparar releases y desplegar la app sin mezclar cambios incompletos con produccion.

## Ramas principales

- `main`: representa produccion. Solo debe recibir codigo probado y listo para deploy.
- `develop`: integra el trabajo que ya fue revisado, pero aun no necesariamente esta desplegado a produccion.

## Ramas de trabajo

- `feature/nombre-corto`: para nuevas funcionalidades o cambios normales.
- `fix/nombre-corto`: para correcciones que no son urgentes de produccion.
- `release/version`: para preparar una version antes de pasarla a `main`.
- `hotfix/nombre-corto`: para corregir un problema urgente que ya esta en produccion.

## Flujo para una feature

1. Actualizar `develop`.

```bash
git checkout develop
git pull origin develop
```

2. Crear una rama nueva.

```bash
git checkout -b feature/modelo-3d-cuarto
```

3. Trabajar cambios y hacer commits pequenos.

```bash
git add .
git commit -m "Agrega modelo 3D para cuarto"
```

4. Validar antes de abrir PR.

```bash
npm.cmd run typecheck
npm.cmd run build
```

5. Subir la rama.

```bash
git push origin feature/modelo-3d-cuarto
```

6. Abrir Pull Request hacia `develop`.

## Flujo para deploy

1. Crear rama de release desde `develop`.

```bash
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0
```

2. Validar la release.

```bash
npm.cmd run typecheck
npm.cmd run build
```

3. Corregir detalles finales si aparecen.

4. Hacer Pull Request de `release/v0.1.0` hacia `main`.

5. Despues de aprobar y mezclar en `main`, crear tag.

```bash
git checkout main
git pull origin main
git tag v0.1.0
git push origin v0.1.0
```

6. Mezclar tambien la release de vuelta a `develop`.

```bash
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

## Flujo para hotfix

Usar solo cuando produccion tiene un error urgente.

```bash
git checkout main
git pull origin main
git checkout -b hotfix/corrige-error-login
```

Despues de corregir:

```bash
npm.cmd run typecheck
npm.cmd run build
git add .
git commit -m "Corrige error en login"
git push origin hotfix/corrige-error-login
```

Abrir Pull Request hacia `main`. Despues de mezclar, pasar el cambio tambien a `develop`.

```bash
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

## Reglas antes de mezclar

- No mezclar directo a `main`.
- No subir cambios sin correr `npm.cmd run typecheck`.
- No hacer deploy si `npm.cmd run build` falla.
- Las features entran primero a `develop`.
- `main` debe poder desplegarse en cualquier momento.
- Cada Pull Request debe explicar que cambio hizo y como fue probado.
- Evitar ramas gigantes: una feature debe resolver una cosa concreta.

## Nombres recomendados

```text
feature/modelo-3d-cuarto
feature/guardar-proyecto-local
fix/estilos-mobile-consulta
release/v0.1.0
hotfix/error-ruta-login
```

## Mensajes de commit recomendados

Usar mensajes cortos en presente:

```text
Agrega modelo 3D del cuarto
Guarda proyecto en localStorage
Corrige estilos de opciones de consulta
Actualiza flujo de nueva consulta
```

## Deploy recomendado para este proyecto

Como esta app es React + Vite sin backend, el deploy debe usar el resultado de:

```bash
npm.cmd run build
```

La carpeta generada es:

```text
dist/
```

Esa carpeta es la que se publica en servicios como Netlify, Vercel, GitHub Pages o un hosting estatico.
