# ADR: Error boundary global y logging de errores (MYF-18)

**Estado:** Aceptado
**Fecha:** 2026-08-22
**Decodificador:** Founding Engineer

## Contexto

La app es una SPA (React + Vite, hash routing) donde un fallo de render o de
un método de ciclo de vida en cualquier página dejaría la pantalla en blanco y
rompería la app por completo, sin opción de recuperación ni rastro del error.
No había transporte de errores (ni Sentry ni endpoint propio). El objetivo es
que ningún error rompa la app entera y que el usuario pueda recuperarse, con
un punto único de integración para logging futuro.

## Decisión

Introducir una tubería de captura de errores centralizada y un error boundary
que la consume:

- **`src/lib/errorReporting.ts`** — punto único de entrada (`reportError`).
  Normaliza cualquier valor lanzado (`Error`, string, objeto, `null`) a un
  `CapturedError` estable (id, name, message, stack, componentStack,
  occurredAt), mantiene un log en memoria acotado (20), notifica suscriptores
  (`onError`) y hoy lo registra en consola. Es el gancho donde se conectaría
  Sentry en el futuro.
- **`src/components/ErrorBoundary.tsx`** — clase React que envuelve todo el
  contenido de la app (`<AppShell/>`). Captura errores de render, ciclo de
  vida y constructores de cualquier página/módulo, los reporta por la tubería
  y sustituye el árbol por una pantalla de error amigable.
- **`src/components/ErrorScreen.tsx`** — pantalla accesible
  (`role="alert"` + `aria-live="assertive"`) con mensaje claro, ID del error,
  y tres acciones: **Reintentar** (desmonta y remonta el subárbol afectado),
  **Reiniciar la aplicación** (`window.location.reload()`), y **Copiar informe
  del error** (clipboard, con feedback "Informe copiado").
- **Globales no-React** — `installGlobalErrorHandlers()` en `main.tsx` escucha
  `window.onerror` y `unhandledrejection` y los envía a la misma tubería para
  que también se registren (no rompen la UI).
- **i18n** — textos es/en añadidos a `src/lib/i18n.ts`; las cadenas del
  fallback se construyen con el `locale` activo del estado para mantener
  consistencia lingüística incluso tras un fallo.

## Alternativas consideradas

- **react-error-boundary (librería externa)**: aporta lo mismo pero añade una
  dependencia; para un único boundary con la app bajo nuestro control, una
  clase propia de ~80 líneas es suficiente y evita deuda de terceros.
- **Sentry desde el día 1**: requiere DSN/credenciales y setup en runtime;
  fuera del alcance MVP. La API (`onError`/`reportError`) está diseñada para
  enchufarlo si el CEO lo aprueba.
- **Sin boundary, solo console**: no cumple el criterio de que el usuario
  pueda recuperarse.

## Consecuencias

- Los errores de render de cualquier página ya no rompen la app: se muestra la
  pantalla de recuperación y se puede reintentar/reiniciar.
- El log queda centralizado y listo para Sentry.
- 17 tests nuevos en `ErrorBoundary.test.tsx` y `ErrorScreen.test.tsx`
  (fallback, retry, copy, reporting, global handlers).
- Deuda a futuro: integrar Sentry con la credencial aportada por el CEO.