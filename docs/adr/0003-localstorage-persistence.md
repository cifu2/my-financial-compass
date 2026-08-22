# ADR: Persistencia con localStorage (MYF-11)

**Estado:** Aceptado
**Fecha:** 2026-08-22
**Decodificador:** Founding Engineer

## Contexto

El MVP de My Financial Compass estructura todo su estado en React Context
(`AppStateProvider`). Los datos (transacciones, categorías, recurrentes,
presupuestos, inversiones, locale) viven únicamente en memoria: cualquier
refresh o cierre del navegador lo borra todo. Para el objetivo de 30 días
(primeros usuarios de prueba) se necesita que los datos sobrevivan sin
infraestructura backend.

## Decisión

Persistir el estado completo en `localStorage` con un snapshot versionado
y un único `storageService`:

- **Un solo key**: `my-financial-compass:v1` con `version: 1` dentro del
  payload. El bump de versión invalida snapshot es incompatibles (parseo -> null
  -> estado por defecto).
- **Serialización segura**: `parsePersistedState()` valida y descarta
  registros individuales corruptos en lugar de fallar todo el payload.
  `loadPersistedState()` nunca lanza.
- **Guardado reactivo**: un `useEffect` en `AppStateProvider` persiste en
  cada cambio de store/locale. Los errores de escritura (cuota llena) se
  reportan vía `storageError`, sin romper la UI.
- **Hidratación al arranque**: el provider inicializa cada slice desde el
  snapshot persistido; con snapshot ausente/corrupto usa los valores por
  defecto actuales (categorías predefinidas, colecciones vacías).
- **Tests**: los tests existentes inyectan `initialStore` para ser
  deterministas; `loadState`/`saveState` se cubren con tests unitarios.

## Alternativas consideradas

- **IndexedDB**: más adecuado para datasets grandes, pero API asíncrona y
  más costosa de probar; `localStorage` basta para el tamaño esperado.
- **Backend/API**: fuera de alcance para el MVP (sin infraestructura aún).
- **Per-entity keys**: más granular, pero sin ventaja real para nuestro
  volumen; un snapshot atómico es más simple y evita estados a medio escribir.

## Consecuencias

- Los datos sobreviven a refrescos del navegador (criterio de aceptación).
- La app arranca sana con `localStorage` vacío o corrupto.
- 10 tests unitarios nuevos + 2 de integración; suite completa en verde (141).
- Pendiente para MYF-12/MYF-13: feedback visual de guardado y manejo de
  errores de storage en la UI (exportar / resetear).