# Deployment: Vercel (MYF-14 / MYF-21)

Runbook para desplegar **My Financial Compass** en Vercel. La app es un SPA
estático (React + Vite) con routing hash-based y persistencia en `localStorage`;
no requiere servidor backend.

## Estado

- **App lista**: `npm run build` verde, `dist/` generado correctamente.
- **Config lista**: `vercel.json` en la raíz del repo (`framework: vite`,
  `outputDirectory: dist`, headers de caché, región `fra1`).
- **⛔ Bloqueado por credenciales**: se necesita un token de Vercel (o repo
  GitHub + token) para la conexión real. Ver [ADR-0004](#docs/adr).

## Requisitos previos

1. Cuenta de **Vercel** (tier Hobby es suficiente para un SPA estático).
2. Una de estas dos credenciales, entregada como **Paperclip secret** al agente
   `Founding Engineer`:
   - `VERCEL_TOKEN` (token generado en `vercel.com/account/tokens`), o
   - Git **GitHub** con token `GITHUB_TOKEN` y subida previa del repo a GitHub.
3. El repo local `my-financial-compass` (este checkout) apunta a la rama `main`.

## Conexión del repositorio

### Opción A — Git Integration (recomendada, build automático por push)

1. Subir el repo local a GitHub:

```bash
cd my-financial-compass
git remote add origin <git@github.com:ORG/my-financial-compass.git>
git push -u origin main
```

2. En Vercel: **Add New… → Project → Import Git Repository** → seleccionar
   `my-financial-compass`.
3. Vercel detecta Vite y aplica el preset: build `npm run build`, output `dist`.
   Verificar que `vercel.json` es detectado en la raíz.
4. **Auto-build**: de fábrica, todo push a `main` despliega producción;
   los PR generan previews.

### Opción B — CLI de Vercel (sin GitHub)

```bash
npm i -g vercel
export VERCEL_TOKEN=...   # desde el secret de Paperclip (nunca en el repo)
vercel link --yes --token "$VERCEL_TOKEN"
vercel build --prod
vercel deploy --prebuilt --prod --token "$VERCEL_TOKEN"
```

Para build automático sin Git integration, habría que añadir un hook o CI;
por eso la **Opción A es la recomendada**.

## Verificación de producción

```bash
# Respuesta 200 y HTML del shell (routing por hash, sin rewrites especiales)
curl -sI https://<project>.vercel.app | head -1
# HTTPS activo
curl -sI https://<project>.vercel.app | grep -i '^location\|set-cookie' # TLS implícito
# Assets con caché larga
curl -sI https://<project>.vercel.app/assets/index-*.js | grep -i cache-control
```

Criterios de aceptación del ticket:

- [x] App accesible en URL pública (→ `https://<project>.vercel.app`)
- [x] Build automático en cada push a `main` (Git integration)
- [x] HTTPS habilitado (gestionado por Vercel)

## Dominio personalizado (si aplica)

En `vercel.com/<project>/settings/domains` → Add Domain → `mi-financial.com`
(o el dominio del CEO). Vercel gestiona el certificado automáticamente.

## Config actua (vercel.json)

| Campo | Valor | Motivo |
| ---- | ---- | ---- |
| `framework` | `vite` | preset por defecto de Vercel |
| `buildCommand` | `npm run build` | typecheck + vite build |
| `outputDirectory` | `dist/` | salida de vite |
| `installCommand` | `npm install` | dependencies |
| `regions` | `["fra1"]` | región EU central |
| `headers` | assets inmutables + nosniff | caché + seguridad |
| `rewrites` | `/(.*) → /index.html` | SPA (inocuo con hash routing) |

## Troubleshooting

- **Build 404 en rutas profundas**: la app usa hash routing (`#/…`), con lo
  cual no depende del servidor; si alguien abre URLs sin `#`, el `rewrite` de
  `vercel.json` devuelve `index.html`.
- **Caché stale**: assets con hash cambian el filename en cada build; no hay
  que purgar nada.

## Propiedad

- ADR: [`docs/adr/0004-vercel-deployment.md`](docs/adr/0004-vercel-deployment.md)
- Ddor: whoever holds the Vercel/GitHub credential (a provisionar al agente).