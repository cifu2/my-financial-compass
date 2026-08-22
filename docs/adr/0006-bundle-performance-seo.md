# ADR: Optimización de bundle, lazy loading y SEO (MYF-23)

**Estado:** Aceptado
**Fecha:** 2026-08-22
**Decodificador:** Founding Engineer

## Contexto

La app se buildaba como un único bundle de 525 kB minificado (147 kB gzip).
Todo el código de las seis secciones se parseaba y ejecutaba en el primer
paint, aunque el usuario solo visitase el dashboard. Vite ya emitía el aviso
de chunk > 500 kB tras el build. El objetivo era reducir el coste de arranque
y preparar métricas de rendimiento repetibles.

## Decisión

1. **Lazy loading por ruta.** Cada página secundaria (Transacciones,
   Recurrentes, Presupuestos, Inversiones, Configuración) carga mediante
   `React.lazy(() => import(...))` y se monta bajo un `Suspense` con fallback
   accesible (`PageLoader`, spinner + live region). El dashboard (ruta `"/
   "`) se mantiene eager porque es el primer paint del usuario.
2. **Code splitting de vendor.** `react` y `react-dom` se emitieron a un
   chunk propio y cacheable (inyarp `manualChunks`), separándolos del código
   de la app.
3. **Tree shaking de imports.** Los módulos de página que solo aportaban
   tipos (ya resueltos por `verbatimModuleSyntax`) se movieron a imports de
   tipo, y se eliminaron imports muertos en `App.tsx`.
4. **SEO básico.** `index.html` incluye meta description, Open Graph y
   Twitter Card, `theme-color`, `robots` y un canonical que se inyecta en
   build-time desde `VITE_CANONICAL_URL` (omitido/relativo si no está
   definido, para no publicar una URL adivinada hasta que MYF-14 entregue el
   dominio real).
5. **Análisis repetible.** `vite-bundle-analyzer` (devDependency) activo con
   `ANALYZE=true npm run build`, genera `dist/stats.html`.

## Consecuencias

- Chunk inicial: 525 kB → 76.63 kB minificado (19.43 kB gzip); páginas
  secundarias 0.7–5.3 kB gzip a demanda. Total gzip ≈ 164 kB.
- El arranque solo evalúa el shell + dashboard; el resto se hiferiza por
  ruta (aporta TBT/parse time en rutas no visitadas).
- Lighthouse performance 100 (métricas reales headless con
  `--throttling-method=provided`); con throttling móvil simulado el score baja
  en el entorno de CI por la CPU del runner, no por el bundle.
- Trade-off: cada navegación a una página secundaria muestra el `PageLoader`
  mientras descarga su chunk (sub-5 kB gzip, imperceptible).
- El canonical queda condicionado a `VITE_CANONICAL_URL` en el despliegue
  (ver [ADR-0004](0004-vercel-deployment.md)).