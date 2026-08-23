# ADR-0014: "Hoy" canónico y coherencia de fechas UTC/local

- Estado: Aceptado
- Fecha: 2026-08-23
- Alcance: Transversal (formularios, validación, recurrentes)

## Contexto

Los formularios con fecha por defecto ("hoy") usaban
`formatDate(new Date(), locale)`, que formatea el instante actual **en UTC**
(`Intl.DateTimeFormat` con `timeZone: 'UTC'`). En husos UTC+2/UTC+1
(España, CEST/CET) eso significa que **entre las 00:00 y las 02:00** el "hoy"
mostrado por el formulario correspondía al día *anterior*.

Mientras tanto, la recuperación y la materialización de recurrentes definen
"hoy" con `todayIso()` (fecha **local**). Los validadores de fecha
(`notInFuture`, `notBeforeToday`) y `isFutureOnly` usaban a su vez
aritmética UTC con `new Date()` + `setUTCHours(0,…)`.

Es decir: tres definiciones de "hoy" distintas según la franja horaria.

## Consecuencia

1. Un gasto registrado a medianoche en hora europea se rellenaba con la fecha
   de *ayer* y, tras corregir el usuario a hoy, el validador lo rechazaba como
   "fecha futura" (pues para la validación todavía era ayer en UTC).
2. La prueba `RecurringPage` fallaba de forma determinista en esa franja
   (el motor materializaba con `todayIso()` local, pero el helper del test
   generaba la fecha de hoy con el formateador UTC).

## Decisión

Definir **un único "hoy" canónico**: la fecha local del dispositivo,
expresada como ISO `yyyy-MM-dd` por `todayIso()`.

- **Formularios** (transacción, recurrente, liquidación): la fecha por defecto
  es `formatDate(todayIso(), locale)`, no `formatDate(new Date(), locale)`.
- **Validadores**: `notInFuture`, `notBeforeToday` e `isFutureOnly` convierten
  la entrada `DD/MM/YYYY` a ISO (`parseDate` + `toIsoDate`) y la comparan
  léxicamente contra `todayIso()`. Sin aritmética de `Date` con UTC.
- **Semántica**: una fecha "hoy" siempre se acepta; "mañana" se rechaza; la
  fecha local introducida se mantiene estable en cualquier huso y franja.

## Alternativas descartadas

- **Forzar todo a UTC**: simplificaría la comparación pero *no* corresponde a
  la intención del producto (una compra de medianoche en Madrid es de hoy,
  no de ayer).
- **Guardar instantes con TZ**: fuera de alcance; el modelo de fechas del MVP
  es calendárico (`yyyy-MM-dd`), no instantáneo.

## Consecuencias

- Las fechas por defecto y los validadores comparten una sola fuente de
  verdad (`todayIso`), retrocompatible con los snapshots existentes.
- Los tests de fechas se alinean con la nueva semántica (ya no dependen de la
  franja horaria en la que se ejecuta la suite).
- La suite completa permanece en **367 tests**, con `build` y `lint`
  sin errores.