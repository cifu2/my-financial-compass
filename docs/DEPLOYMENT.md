# Deployment: Vercel (MYF-14 / MYF-21)

Runbook para desplegar **My Financial Compass** en Vercel. La app es un SPA
estático (React + Vite) con routing hash-based y persistencia en `localStorage`;
no requiere servidor backend.

## Estado

- **🟢 DESPLEGADO en producción (2026-08-23)** —
  https://my-financial-compass-eight.vercel.app sirve `main` HEAD (`130f32b`):
  incluye autenticación (MYF-20), grupos y balances (bundle `index-HeC1Qe36.js`).
  (alias production, proyecto `prj_srkaWNp8lTPVizoiQGzZxWxE74rr` bajo team de
  `cifuwork-2872`).
- **Preview con `main` (referencia del deploy)**:
  https://my-financial-compass-rcwuomo0d-manuel-s-projects-577c9a99.vercel.app
- App accesible (HTTP 200), HTTPS activo (`CN=*.vercel.app`) y título correcto:
  `My Financial Compass | Finanzas personales`.
- Repo GitHub público: https://github.com/cifu2/my-financial-compass (rama `main`).
- `VERCEL_TOKEN` añadido como secret de GitHub Actions (`VERCEL_TOKEN`).
- **Pendiente (CI en push)**: falta subir el workflow de Actions porque el
  `GH_TOKEN` actual no tiene scope `workflow`; ver sección [CI por push](#ci-por-push-en-push-a-main).

## Requisitos previos

1. Cuenta de **Vercel** (tier Hobby).
2. Credenciales como **Paperclip secrets** del agente `Founding Engineer`:
   - `VERCEL_TOKEN` (token de `vercel.com/account/tokens`).
   - `GH_TOKEN` con scope **`workflow`** para poder subir el archivo de Actions
     (el token aportado inicialmente solo tiene `repo,user`).
3. El repo local `my-financial-compass` (este checkout) apunta a `main`.

## Despliegue production (hecho)

```bash
npm i -g vercel
export VERCEL_TOKEN=...            # desde el secret de Paperclip (nunca en el repo)
cd my-financial-compass
vercel link --yes --token "$VERCEL_TOKEN"
vercel deploy --prod --prod --token "$VERCEL_TOKEN"
```

Vercel aplicó el preset de Vite (`npm run build` → `dist/`) según `vercel.json`.
Build en producción: OK en ~15s (iad1).

## CI / build auto en push a `main`

### Opción A — GitHub Actions (GIT integration vía workflow; preparada)

El workflow está listo en `deploy/workflows/deploy-vercel.yml` (referencia)
y el secreto `VERCEL_TOKEN` ya está en el repo. Condiciones para activarlo:

1. El `GH_TOKEN` debe incluir el scope **`workflow`** (GitHub bloquea la subida
   de `.github/workflows/*` sin ese scope).
2. Copiar el workflow a `.github/workflows/deploy-vercel.yml`, hacer commit y push
   a `main`. A partir de ahí, **cada push a `main` genera un deploy de producción**
   vía `vercel build` → `vercel deploy --prebuilt --prod`.

### Opción B — Vercel Git integration (nativa)

Requiere autorización OAuth de la cuenta GitHub **cifu2** en el panel de Vercel
(import del repo en el navegador del propietario). No se puede completar vía
CLI/API con el token actual ("You need admin or write access").

## Verificación de producción

```bash
curl -sI https://my-financial-compass-eight.vercel.app | head -1     # 200
curl -sI https://my-financial-compass-eight.vercel.app/feedback.html  # 200
echo | openssl s_client -connect my-financial-compass-eight.vercel.app:443 -server
             -servername my-financial-compass-eight.vercel.app 2>/dev/null
    | openssl x509 -noout -subject -dates                    # CN=*.vercel.app
```

Criterios de aceptación del ticket:

- [x] App accesible en URL pública (→ https://my-financial-compass-eight.vercel.app)
- [ ] Build auto en cada push a `main` (bloqueado por scope `workflow` aprovisionar)
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