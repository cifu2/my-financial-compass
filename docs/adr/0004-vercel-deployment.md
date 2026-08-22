# ADR-0004: Despliegue en Vercel (MYF-14 / MYF-21)

- **Estado:** Aceptado (decisión de plataforma) — Conexión pendiente de credenciales
- **Fecha:** 2026-08-22
- **Decisor:** Founding Engineer
- **Contexto:** El objetivo del proyecto a 30 días es "App desplegada y lista
  para primeros usuarios de prueba" (MYF-21). La app es un SPA estático
  (React + Vite) con routing hash-based y persistencia en localStorage: no
  necesita servidor backend, por lo que encaja perfectamente en hosting
  estático.

## Decisión

Desplegar en **Vercel** con integración de Git en el branch `main`:

- **Conector Git**: importación del repositorio (`my-financial-compass`) vía
  Vercel Git Integration (GitHub) o `vercel link` + `vercel --prod` con el CLI.
- **Build automático**: cada push a `main` dispara un production deploy.
  Previews para pull requests quedan activadas para MYF-22 (staging).
- **Build**: preset `vite` de Vercel; `buildCommand: npm run build`
  (`tsc -b && vite build`), `outputDirectory: dist`, `installCommand: npm install`.
- **HTTPS**: TLS gestionado por Vercel por defecto; sin configuración extra.
- **Dominio**: se usa el subdominio `*.vercel.app` (sin dominio personalizado
  por ahora; si el CEO aporta un dominio propio, se añade como alias).
- **Config explícita**: `vercel.json` pincha framework, regiones (`fra1`) y
  cabeceras de caché para los assets hasheados.
- **Estado**: la app entera es estática; no se necesita runtime de Vercel
  Functions v0, por lo que no hay coste de cómputo.

## Alternativas consideradas

- **Railway / Fly.io**: overkill por tener runtime/costo constante; el SPA
  estático no lo necesita.
- **Netlify**: equivalente funcional; el equipo ya está alineado con Vercel
  (tooling, previews y dashboard).
- **Paperclip page host (S3/CloudFront)**: disponible para páginas estáticas,
  pero no da Git-integration ni preview-per-PR, criterios de aceptación de
  MYF-21 y MYF-22.

## Requisitos no satisfechos (bloqueador)

La conexión real exige una credencial de despliegue que no existe en el entorno
de ejecución:

- **Token de acceso de Vercel** (`vercel` CLI/API), **o**
- **Repositorio remoto GitHub + token** para la Git integration.

Hasta que el equipo/cEO provea el token como secret de Paperclip al agente
Founding Engineer, el despliegue no puede completarse. El resto (build, config,
doc, runbook) está terminado y verificado.

## Consecuencias

- La URL pública final será `https://<project>.vercel.app` con HTTPS activo.
- Cada push a `main` regenera el build de producción automáticamente.
- Proceso reproducible para MYF-22 (staging): mismo proyecto, rama y entorno.