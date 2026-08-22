# ADR 0002 — Dashboard y Patrimonio Neto (Módulo 5)

- **Estado:** Aceptado
- **Fecha:** 2026-08-22
- **Asignado por:** Founding Engineer [MYF-10]

## Contexto

El dashboard debe consolidar cinco widgets (resumen mensual, desglose de
gastos, transacciones recientes, estado de presupuestos y patrimonio neto),
un histórico mensual exportable y el cálculo de patrimonio neto con
conversión multidivisa. Las transacciones, presupuestos e inversiones ya
viven en `AppState` (Context) con servicios puros en cada feature.

## Decisión

1. **Servicio puro de dashboard** (`features/dashboard/services/dashboard.ts`)
   sin dependencias de React: `monthTotals`, `topExpenseCategories`,
   `percentageChange`, `recentTransactions`, `netWorth`, `netWorthHistory`.
   Todo el cómputo es inmutable y unit-testeados; los componentes solo
   renderizan.

2. **Servicio de divisas** (`services/currency.ts`): tabla base-EUR con un
   único punto de carga `getRates()` y `RATES_AS_OF`. La conversión pivota
   por EUR (`amount / rate[from] * rate[to]`) para soportar cualquier par.
   El snapshot actual es estático y **no** incluye claves de API; para
   producción se sustituye el cuerpo de `getRates()` por un fetch diario
   cacheado, sin cambiar los call sites.

3. **Patrimonio = líquido + valor actual de inversiones**, ambos en divisa
   primaria (EUR). El líquido es la suma de transacciones (saldo del libro);
   el valor de inversión usa `currentValue ?? investedAmount` convertido. Las
   inversiones con divisa sin tipo de cambio se **excluyen** del total, se
   cuentan (`unconvertedCount`) y se señalan en la UI.

4. **Widgets presentacionales** uno por panel (`SummaryCards`,
   `ExpenseBreakdown`, `RecentTransactions`, `BudgetSnapshot`,
   `NetWorthPanel`, `MonthlyHistoryView`). Barras con CSS puro
   (`Breakdown-fill`, `BudgetProgressBar`) y texto legible (WCAG AA): las
   barras son decorativas (`role=presentation`) y los valores se leen como
   texto.

5. **Exportación CSV**: generado en memoria (Blob) con BOM UTF-8 y separador
   local (`;` para es-ES, `,` para en). Impresión mediante el diálogo nativo
   del navegador con estilos `@media print` que ocultan navegación.

6. **Datos de demostración explícitos** (`features/dashboard/data/demo.ts`):
   un botón "Cargar datos de demostración" en el estado vacío reemplaza el
   store. No se siembran fixtures por defecto para no interferir con los
   flujos reales ni los tests.

## Consecuencias

- Dashboard, histórico y patrimonio comparten el mismo servicio, sin duplicar
  lógica de sumas.
- El snapshot de tipos de cambio es una aproximación fija hasta integrar un
  proveedor de tasas diarias; la UI muestra `ratesAsOf` para transparencia.
- Assets WIP del Módulo 2 en el mismo working tree; los cambios de Módulo 5
  conviven sin tocar ficheros de otros módulos.