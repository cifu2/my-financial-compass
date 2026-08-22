# ADR-0002: Módulo de transacciones recurrentes (Módulo 2)

- **Estado:** Aceptado (2026-08-22)
- **Decisor:** Founder Engineer (Módulo 2 – MYF-9)
- **Contexto:** El Módulo 2 debe permitir registrar transacciones que se repiten
  con frecuencias configurables (semanal, quincenal, mensual, bimensual,
  trimestral, semestral, anual), automatizar su alta en el libro mayor en las
  fechas programadas, y gestionarlas (editar una ejecución o todas las
  futuras, pausar, eliminar). La aplicación no tiene backend: el estado vive en
  memoria en React (ver ADR-0001).

## Decisión

- **Motor de fechas propio y puro** (`features/recurring/services/recurrenceEngine.ts`):
  cálculo de ocurrencias ISO a partir de `startDate`, `endDate`, `frequency` y
  `executionDay`. Soportado por tests unitarios (25).
- **Automatización idempotente**: un efecto en `AppStateProvider` materializa
  las transacciones "debidas" (`<= hoy`) cada vez que cambia la lista de
  recurrentes, deduplicando por `(recurringId, fecha publicada)`. Los
  recurrencias pausadas no generan nada.
- **Transacciones generadas** se insertan en el `store.transactions` normal,
  marcadas `isRecurring` / `recurringId`, por lo que alimentan presupuestos y
  futuros paneles sin duplicar lógica.
- **Modelo** `RecurringTransaction` con `template` anidado
  (concepto/importe/tipo/categoría) + calendario + `isActive` + `exceptions`
  (override de una sola ejecución).
- **Gestión**: editar abarca "todas las futuras" (con `ConfirmDialog` cuando
  ya hay transacciones generadas), o "solo esta ejecución" (override en
  `exceptions`, sin confirmación por ser puntual). Pausar/reanudar es un
  toggle; eliminar pasa por confirmación y ofrece undo (5–10 s).

## Alternativas consideradas

- **Librerías de recurrencia (rrule, date-fns recurrence):** potentes pero
  añaden dependencias; la especificación de frecuencias es fija y se resuelve
  en ~150 líneas testeadas.
- **Generación en servidor/CRON:** no existe backend en el MVP (ADR-0001);
  la automatización es client-side al montar y al cambiar el calendario.
- **Estado central en reducer único:** se mantuvo el patrón Context existente;
  la materialización vive en un effect de `AppStateProvider`.

## Consecuencias

- Requisito cumple: panel de configuración con selector de frecuencia, fechas
  de inicio/fin, selector de día de ejecución y vista previa en vivo; lista de
  próximas ejecuciones; automatización de transacciones; gestión completa.
- Frecuencias por días (semanal/quincenal) no usan día de ejecución; los días
  29–31 se encogen al último día del mes (31 → 30, etc.); el día "0" significa
  último día del mes.
- La persistencia futura (localStorage/API) respetará este modelo: basta con
  serializar `recurrings` y re-materializar lo pendiente.