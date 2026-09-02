# Estado del Proyecto - My Financial Compass

## ✅ Fix de regresión date-driven + verificación (2026-09-02, ~00:52 UTC)

- **Bug corregido**: la invitación seed de `grp-hogar` para Lucía (`seed-token-hogar-lucia`) tenía `expiresAt` hardcodeado a `2026-09-01T08:00:00.000Z`; al cruzar esa fecha, `acceptInvitation` devolvía `invitation-not-pending` y el test `accepting a pending invitation creates a membership with the invited role` fallaba (1/372). Fix en `src/features/groups/data/seeds.ts`: `expiresAt` → `2099-12-31T23:59:59.000Z` (la invitación seed debe permanecer `pending`). Ningún test depende del valor exacto.
- **Suite completa en verde**: **372/372 tests** (42 archivos), `npm run build` y `npm run lint` sin errores.
- **Producción verificada**: https://my-financial-compass-eight.vercel.app responde HTTP 200 con título correcto.
- **Token re-medido**: `GET /user` → HTTP 200 (login `cifu2`), scopes **`repo, user`** (sigue **sin `workflow`**); probe `PUT .github/workflows/_probe_check.yaml` → **HTTP 404**. [MYF-30](/MYF/issues/MYF-30) continúa bloqueado por el giro del `GH_TOKEN` (decisión del CEO/board en [MYF-31](/MYF/issues/MYF-31)/[MYF-32](/MYF/issues/MYF-32)/[MYF-33](/MYF/issues/MYF-33)).

## ✅ Re-verificación (2026-09-01, ~14:25 UTC)

- **Sin cambios de código** desde la re-verificación de las 08:10 UTC de hoy; `main` sigue limpio y sincronizado con `origin/main`.
- **Token re-medido de nuevo**: `GET /user` → HTTP 200 (login `cifu2`), scopes **`repo, user`** (sigue **sin `workflow`**); no existe `.github/workflows/` en `main`. [MYF-30](/MYF/issues/MYF-30) continúa bloqueado por [MYF-31](/MYF/issues/MYF-31) (aún `in_review`, confirmación al board pendiente): el CEO/board debe rotar el `GH_TOKEN` a un PAT con scope `workflow` (Opción A) o conceder write access a Vercel (Opción B, [MYF-33](/MYF/issues/MYF-33)).
- **Ruta de cierre intacta**: la rama local `ci/vercel-workflow` conserva `.github/workflows/deploy-vercel.yml` y `deploy/workflows/deploy-vercel.workflow.yml` sigue en `main`; incorporación a `main` + push (con aprobación del CEO) cierra el issue en un heartbeat.

## ✅ Re-verificación (2026-09-01, ~08:10 UTC)

- **Sin cambios de código** desde la re-verificación de las 07:10 UTC de hoy; `main` sigue limpio y sincronizado con `origin/main` (0/0 ahead/behind).
- **Token re-medido de nuevo**: `GET /user` → HTTP  ​200 (login `cifu2`), scopes **`repo, user`** (sigue **sin `workflow`**); sigue sin existir `.github/workflows/` en `main`. [MYF-30](/MYF/issues/MYF-30) continúa bloqueado: el CEO/board no ha rotado aún el `GH_TOKEN` a un PAT con scope `workflow`, ni ha concedido write access de Vercel (confirmaciones pendientes en [MYF-31](/MYF/issues/MYF-31)/[MYF-32](/MYF/issues/MYF-32)/[MYF-33](/MYF/issues/MYF-33)).
- **Ruta de cierre intacta**: `ci/vercel-workflow` conserva `.github/workflows/deploy-vercel.yml` (con `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`) y `deploy/workflows/deploy-vercel.workflow.yml` sigue en `main`; la incorporación a `main` + push (con aprobación del CEO) cierra el issue en un heartbeat.

## ✅ Re-verificación(2026-09-01, ~07:10 UTC)

- **Sin cambios de código** desde la re-verificación de las 01:10 UTC de hoy; `main` sigue limpio y sincronizado con `origin/main`.
- **Token re-medido de nuevo**: `GET /user` → HTTP  ​200 (login `cifu2`), scopes **`repo, user`** (sigue **sin `workflow`**); probe `PUT .github/workflows/_probe_check.yaml` → **HTTP  ​404**. [MYF-30](/MYF/issues/MYF-30) continúa bloqueado: el CEO/board no ha rotado aún el `GH_TOKEN` a un PAT con scope `workflow`, ni ha concedido write access de Vercel (confirmaciones pendientes en [MYF-31](/MYF/issues/MYF-31)/[MYF-32](/MYF/issues/MYF-32)/[MYF-33](/MYF/issues/MYF-33)).
- **Ruta de cierre intacta**: `ci/vercel-workflow` conserva `.github/workflows/deploy-vercel.yml` y `deploy/workflows/deploy-vercel.workflow.yml` sigue en `main`; la incorporación a `main` + push (con aprobación del CEO) cierra el issue en un heartbeat.

## ✅ Re-verificación (2026-09-01, ~01:10 UTC)

- **Sin cambios de código** desde la re-verificación de las 22:50 UTC de ayer`; `main` sigue limpio y sincronizado con `origin/main`.
- **Token re-medido de nuevo**: `GET /user` → HTTP 200 (login `cifu2`), scopes **`repo, user`** (sigue **sin `workflow`**). [MYF-30](/MYF/issues/MYF-30) continúa bloqueado: el CEO/board no ha rotado aún el `GH_TOKEN` a un PAT con scope `workflow`, ni ha concedido write access de Vercel (confirmaciones pendientes en [MYF-31](/MYF/issues/MYF-31)/[MYF-32](/MYF/issues/MYF-32)/[MYF-33](/MYF/issues/MYF-33)).
- **Ruta de cierre intacta**: `ci/vercel-workflow` conserva `.github/workflows/deploy-vercel.yml` y `deploy/workflows/deploy-vercel.workflow.yml` sigue en `main`; la incorporación a `main` + push (con aprobación del CEO) cierra el issue en un heartbeat.

## ✅ Re-verificación (2026-08-31, ~22:50 UTC)

- **Sin cambios de código** desde la verificación 20:15 UTC de hoy; `main` sigue limpio y sincronizado con `origin/main` (build + lint + suite 372/372 en verde según esa pasada).
- **Token re-medido de nuevo**: `GET /user` → HTTP 200, scopes **`repo, user`** (sigue **sin `workflow`**); `PUT .github/workflows/deploy-vercel.yml` de prueba → **HTTP 404**. [MYF-30](/MYF/issues/MYF-30) sigue gated por el `GH_TOKEN`.
- **Ruta de cierre en un heartbeat verificada como intacta**: la rama local `ci/vercel-workflow` conserva `.github/workflows/deploy-vercel.yml` (con `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`), y `deploy/workflows/deploy-vercel.workflow.yml` sigue en `main`. Cuando el CEO rote el token a un PAT con scope `workflow`+`repo` (o conceda write access a Vercel), el workflow se incorpora a `main` y se cierra MYF-30 en un solo heartbeat, con push a `main` (gated por aprobación del CEO, ver [DEPLOYMENT.md](DEPLOYMENT.md)).
- **Desbloqueo**: sigue en manos del CEO/board — confirmación pendiente en [MYF-33](/MYF/issues/MYF-33) (Opción A: rotar `gh_token` con scope `workflow`; Opción B: write access de Vercel).

## ✅ Verificación continua (2026-08-31, ~20:15 UTC)

- **`main` en verde**: `npm run build` (typecheck + vite build) y `npm run lint` sin errores; suite completa **372/372 tests** pasando (42 archivos).
- **`main` sincronizada con `origin/main`** (0/0 ahead/behind).
- **Token re-medido de nuevo hoy**: `GET /user` → HTTP 200, scopes **`repo, user`** (sigue **sin `workflow`**); escritura de control bajo `.github/workflows/_probe-workflow.yaml` → **HTTP 404**, escritura no-workflow bajo `.github/_probe.txt` → **HTTP 201**. [MYF-30](/MYF/issues/MYF-30) sigue bloqueado por el giro del `GH_TOKEN` a un PAT con scope `workflow` (o write access Vercel vía [MYF-33](/MYF/issues/MYF-33)); decisión pendiente del CEO/board.
- Tooling estable desde el fix 2026-08-31 (~15:00 UTC); sin cambios de código en este heartbeat, solo re-verificación y actualización de este documento.

## ✅ Fix verificado subido a `origin/main` (2026-08-31, ~15:00 UTC)

- **`main` en verde**: build + lint sin errores y suite completa **372/372** en verde.
- **Fix i18n/CSV/dark-mode público en `origin/main`**: el commit `90cbe5d` (re-corrupción de la clave i18n `budgetRemoved`, consolidación de parseo de fechas en `lib/dates.ts`, localización de strings incrustados, exportación CSV y dark mode) ya está **pusheado** a `origin/main` vía cherry-pick en `main` local.
- **Historial dividido para no bloquear el código verificado**: el único commit que requiere scope `workflow` (`.github/workflows/deploy-vercel.yml`) se ha preservado en la rama local **`ci/vercel-workflow`** (apunta a `f18c4ae`, que incluye el workflow + todos los docs de verificación). `main` local queda con el fix y los docs; **`git push origin main` ya no está gated** por el token para los commits de código.
- **MYF-30 sigue bloqueado por token**: cuando el `GH_TOKEN` tenga scope `workflow`, hay que volver a incorporar `.github/workflows/deploy-vercel.yml` desde `ci/vercel-workflow` (o `deploy/workflows/deploy-vercel.workflow.yml`) a `main` y hacer push — **siempre con aprobación previa del CEO** (ver gate de despliegue en [DEPLOYMENT.md](DEPLOYMENT.md)).

## ✅ Verificación continua (2026-08-30)

- **`main` en verde**: build + lint sin errores y suite completa en verde (sincronizada con `origin/main`).
- **CI por push (MYF-30) sigue bloqueado y apertura al token**: re-medido hoy contra la API de GitHub el `GH_TOKEN` activo — **ya no devuelve 401** (la premisa de [MYF-34](/MYF/issues/MYF-34) quedó obsoleta): `GET /user` → **HTTP 200**, scopes **`repo, user`** (todavía **sin `workflow`**); escritura de control bajo `.github/workflows/_probe.yaml` → **HTTP 404** (`.github/workflows/` no existe en `main`).
- **Desbloqueo pendiente del CEO/board**: rotar `gh_token` por un PAT con scope `workflow`, o dar write access a Vercel (vía alternativa verificada en [MYF-33](/MYF/issues/MYF-33)). Confirmaciones al board en [MYF-32](/MYF/issues/MYF-32) y [MYF-33](/MYF/issues/MYF-33) pendientes desde 2026-08-25/26. El workflow de referencia sigue listo en `deploy/workflows/deploy-vercel.workflow.yml`; copia en `.github/workflows/` + push a `main` cierran el issue en un heartbeat.
- No se despliega a producción sin aprobación del CEO;; ver [DEPLOYMENT.md](DEPLOYMENT.md).

## ✅ Verificación continua (2026-08-26)

- **`main` en verde**: `npm run build` (typecheck + vite build) y `npm run lint` sin errores; suite completa **372/372 tests** pasando.
- **`main` sincronizada con `origin/main`** (0/0 ahead/behind).
- **CI por push (MYF-30) sigue bloqueado por token**: el `GH_TOKEN` activo sigue con scopes `repo, user` (sin `workflow`); verificado de nuevo hoy contra la API de GitHub. El workflow de referencia está listo en `deploy/workflows/deploy-vercel.workflow.yml`; falta el token con scope `workflow` ([MYF-30](/MYF/issues/MYF-30), bloqueado por [MYF-31](/MYF/issues/MYF-31)).
- No se despliega a producción sin aprobación del CEO; la URL actual sirve `main`@`130f32b` (ver [DEPLOYMENT.md](DEPLOYMENT.md)).

## ✅ Coherencia de fechas "hoy" UTC/local (ADR-0014, COMPLETADO)

- **Definición única de "hoy"**: `todayIso()` (fecha local) como fuente de
  verdad. Los formularios (transacción, recurrente, liquidación) ya no usan
  `formatDate(new Date(), locale)` (formateo UTC), que devolvía *ayer* como
  "hoy" en zonas UTC+2/UTC+1 entre las 00:00 y las 02:00.
- **Validadores coherentes**: `notInFuture`, `notBeforeToday` e `isFutureOnly`
  comparan el ISO de la fecha parseada contra `todayIso()` (sin aritmética UTC
  con `Date.setUTCHours`). Una fecha legítimamente "hoy" nunca se rechaza.
- **Tests alineados**: helpers de fecha en `RecurringPage.test` y
  `TransactionsPage.test` generan el ISO local en lugar del formato UTC,
  eliminando la flakiness en la franja nocturna. Suite **367/367**.
- [ADR-0014](docs/adr/0014-today-utc-local.md)

## Resumen Ejecutivo

El proyecto está operativo con **build limpio, tests pasando, lint sin errores**. Todos los módulos previstos están implementados (transacciones, recurrentes, presupuestos, inversiones, dashboard) **más el sistema de autenticación de usuarios** (HU-0.1), el **modelo multiusuario con grupos** (HU-0.4/0.8/0.9, MYF-19..27) y el **sistema de permisos por rol** (HU-0.10, MYF-28), con persistencia, loading states y error boundary global.

## ✅ Actividad del grupo y borrado con doble confirmación (HU-0.11/HU-0.12, MYF-29 COMPLETADO)

- **Auditoría `GroupActivity`** (`groupId`, `userId`, `action`, `details`, `timestamp`) persistida en el snapshot de grupos (retrocompatible, `version:1`), append-only con límite por grupo y orden cronológico descendente.
- **Registro automático** en cada acción relevante: transacciones de grupo (alta/borrado), reparto, liquidaciones, inversiones, presupuestos, recurrentes, alta/baja de miembros, roles, invitaciones y operaciones del grupo.
- **Pantalla de actividad** `/grupos/:id/actividad` con filtros por miembro y tipo de acción, frases i18n ("Luis añadió Supermercado 82,00 €", "Ana liquidó 45,00 € a José"); enlazada desde Balances y desde Configuración → Grupos.
- **Borrado con doble confirmación**: diálogo en dos pasos (archivar vs. eliminar + aviso a los miembros; luego teclear el nombre del grupo). `archiveGroup` conserva datos y actividad (`archivedAt`), `restoreGroup` lo reactiva; `deleteGroup` permite a un admin borrar un grupo con miembros y el fronted purga los datos financieros del grupo (`removeGroupData`).
- **Tests**: servicio de actividad, mensajes i18n, pantalla de actividad con filtros y panel de grupos con doble confirmación → suite total **367** en verde.
- [ADR-0013](docs/adr/0013-group-activity-deletion.md)

## ✅ División de gastos y balances de deudas (HU-0.7, MYF-27 COMPLETADO)

- **Modelo**: `features/splits` — `ExpenseSplit` (transactionId, groupId, paidBy, method, shares[]) y `Settlement` (groupId, from, to, amount, date) persistidos en el snapshot financiero; `DebtBalance` es una vista derivada (nunca se almacena) para no quedar obsoleta al borrar gastos o liquidar.
- **Reparto**: `computeSplit` (puro, en céntimos exactos) soporta **partes iguales, porcentajes, importes fijos y ponderaciones** con validación de que la suma cuadre con el total antes de guardar (`percentages-sum`, `amounts-sum`, …).
- **Balances**: algoritmo de neteo per-member → simplificación "deudor mayor paga acreedor mayor" → filas tipo "Ana debe 45 € a Luis".
- **UI**: selector de contexto + "Compartir este gasto" + `SplitEditor` en el formulario de transacciones; nueva ruta `/balances` con deudas pendientes, resumen por miembro, registro de liquidaciones e histórico (borrado con confirmación + undo).
- **Tests**: 38 nuevos (splitCalculator, balances/settlements, storageService round-trip, flujo transacción-compartida y pantalla de balances) → suite total **351+**.
- [ADR-0012](docs/adr/0012-splits-balances.md)

## ✅ Permisos por rol (HU-0.10, MYF-28 COMPLETADO)

- **Matriz declarativa** en `features/groups/permissions.ts`: `ROLE_CAPABILITIES` + `can(role, capability)` cubre "ver datos", "crear/editar", "invitar/expulsar/cambiar roles" y "borrar grupo" exactamente como la HU.
- **Ownership-aware**: `canEditData`/`canDeleteData` — el admin edita/borra cualquier fila del grupo; el **miembro solo las suyas** (`transaction.userId`, `investment.createdBy`); `readonly` nunca muta.
- **Configurable por grupo**: `Group.settings.membersCanManageBudgets|Investments` revocan a los miembros la gestión de presupuestos/inversiones (parseo estricto en `groupStore`, guardado vía `groupService.updateGroup` admin-only).
- **Acceso resuelto**: `features/groups/access.ts` (`groupAccessFor`) expone `canView/canEdit/canManageBudgets/canManageInvestments/canManageMembers/canDeleteGroup` y los checks por registro para el usuario+grupo activo.
- **UI que oculta/muestra**: `PermissionNotice` accesible (`role="alert"`) + gating en Presupuestos (form/acciones ocultos sin `budget.manage`), Inversiones (`investment.manage` + propiedad en eliminar) y Recurrentes (`canManage` por fila en `RecurringList`).
- **Tests**: matriz completa, ownership, settings, persistencia y gating de UI (suite total estable). [ADR-0010](docs/adr/0010-permissions.md)

## ✅ Autenticación de usuarios (MYF-20 COMPLETADO)

- **Registro con email y contraseña** (validación de email, contraseña segura ≥8 con letras y números), **login** y **cierre de sesión**
- **Recuperación de contraseña**: flujo de dos pasos (email → código de 6 dígitos). En modo demo el código se muestra en pantalla (no hay servidor de email todavía)
- **Perfil editable**: nombre, avatar (paleta de colores) y **moneda principal**
- **Borrado de cuenta** con confirmación explícita (escribir el email) + modal; borra datos financieros y sesión
- **Guard de sesión**: pantallas `#/login`, `#/register`, `#/forgot-password` fuera de la navegación principal; un visitante anónimo no ve la app
- **Arquitectura migrable**: `features/auth/services/authService.ts` con API async tipo REST local sobre `localStorage`; usar un backend real solo reimplementa ese módulo
- **Contraseñas**: digest con sal (simulado, NO criptográfico — ver ADR-0007)
- **Tests**: 54 nuevos/ajustados (password, service, contexto, flujos de app e integración) → suite total **243**
- [ADR-0007](docs/adr/0007-auth.md)

## Estado por Módulo

### ✅ Módulo 1: Transacciones y Categorías (COMPLETADO)
- **TransactionsPage**: CRUD completo con validación, confirmación de eliminación, undo (5-10s)
- **Categories**: CategoryManager con crear/editar/eliminar/desactivar, predefined categories, CategoryPicker con búsqueda
- **Validación**: Concepto obligatorio, importe > 0, fecha no futura, categoría obligatoria

### ✅ Módulo 2: Transacciones Recurrentes (COMPLETADO - MYF-9)
- **RecurringForm**: panel de configuración con selector de frecuencia (semanal, quincenal, mensual, bimensual, trimestral, semestral, anual), fecha de inicio obligatoria, fecha de fin opcional, selector de día de ejecución para frecuencias mensuales y vista previa en vivo de la próxima ejecución
- **Automación**: motor de fechas puro (`recurrenceEngine`) + materialización idempotente de transacciones debidas en `AppStateProvider`
- **Gestión**: editar configuración (todas las futuras, con confirmación si ya hay transacciones generadas), editar una sola ejecución (override), pausar/reanudar, eliminar con confirmación y undo
- **UpcomingList**: próximas ejecuciones con overrides marcadas
- **Tests**: 32 (engine + servicios + página)

### ✅ Módulo 3: Presupuestos (COMPLETADO)
- **BudgetsPage**: CRUD completo con validación y barras de progreso
- **BudgetCalculator**: cálculo automático de gasto acumulado por categoría

### ✅ Presupuestos compartidos por grupo (HU-0.8, MYF-23)
- **Modelo**: `Budget.groupId` (nullable) distingue presupuestos **personales** (`null`) de los **de grupo**; persistencia en `storageService` con tolerancia a datos previos
- **Contexto**: `AppState.budgetGroupId` (personal o grupo activo) + `BudgetContextSelector`; presupuestos y snapshot del dashboard se filtran automáticamente al cambiar de contexto
- **Consumo agregado**: en contexto de grupo el cálculo suma el gasto de **todos los miembros**; las transacciones llevan `userId` (propietario) y `groupId` (ledger compartido)
- **Desglose por miembro**: `BudgetRow.memberSpend` + vista expandible "Desglose por miembro" en `BudgetDashboard` (`budgetScope.ts` resuelve miembros y nombres)
- **Tests**: 8 nuevos en `budgetCalculator.group.test.ts` (agregación por miembro, filtrado por contexto, breakdown)

### ✅ Módulo 4: Inversiones (COMPLETADO)
- **InvestmentsPage**: CRUD completo con validación y tipos de activo

### ✅ Módulo 5: Dashboard y Patrimonio Neto (COMPLETADO, MYF-10)
- **DashboardPage**: resumen mensual, desglose de gastos, transacciones recientes, estado de presupuestos, patrimonio neto con conversión de divisas, historial mensual y datos de demostración

## ✅ Inversiones compartidas con propiedad proporcional (MYF-24 COMPLETADO)

- **Modelo de datos** (HU-0.9): `Investment.groupId?` (null = personal),
  `createdBy?` y entidad `InvestmentOwnership` (investmentId, userId,
  percentage) para registrar el % de propiedad por miembro del grupo.
  Persistidos en el snapshot `v1` de forma backward-compatible.
- **Servicio de cartera por contexto** (`features/investments/services/portfolio.ts`):
  `ownershipPercentage` (100 % para personales), `holdingsForContext` (la vista
  personal valora cada inversión de grupo al % del usuario; la vista de grupo
  al total) y validación `isFullOwnership` (suma = 100).
- **Selector de ámbito** en la página de inversiones: Personal + grupos del
  usuario. Al crear una inversión de grupo se muestra un editor de % por
  miembro con validación "suma 100" y mensajes de error accesibles.
- **Patrimonio neto por contexto** (`contextNetWorth`/`contextNetWorthItems`):
  el dashboard computa la vista personal proporcional (o la del grupo si hay
  contexto de grupo activo compartido con presupuestos).
- **Tests**: 11 nuevos del portfolio (filtros/sharing, validación), 5 de la
  página (selector, creación personal y de grupo, rechazos de suma), 4 de
  netWorth por contexto y 1 de integración (activo compartido en el panel de
  patrimonio). Suite total: **286 tests**.
- [ADR-0010](docs/adr/0010-group-investments.md)

## 🔄 Semana 1: Persistencia (EN CURSO)

### ✅ Persistencia con localStorage (MYF-11 COMPLETADO)
- **storageService** (`src/lib/storageService.ts`): serialización/deserialización segura con versión de esquema, parseo estricto que descarta registros corruptos, manejo de cuota llena (`StorageError`/`isQuotaError`)
- **Persiste**: transacciones, categorías, inversiones, presupuestos, recurrentes y locale
- **Integración con AppState**: hidratación al arranque + guardado automático en cada cambio; `storageError` para señalar fallos de escritura
- **Hidratación defensiva**: `loadPersistedState()` nunca lanza; con datos corruptos la app arranca con el estado por defecto
- **Tests**: 10 unitarios (parseo, round-trip, cuota llena, corrupción) + 2 de integración (refresh/rehydratación)

## Infraestructura

| Componente | Estado |
|------------|--------|
| React + Vite + TypeScript | ✅ Funcional |
| ESLint | ✅ Sin errores |
| Vitest + Testing Library | ✅ 172 tests (22 de integración) |
| Navegación hash-based | ✅ Funcional |
| State Management (Context) | ✅ Funcional |
| Formularios con validación | ✅ Funcional |
| ConfirmDialog + UndoToast | ✅ Funcional |
| i18n (ES/EN) | ✅ Funcional |
| Persistencia localStorage | ✅ Funcional (MYF-11) |
| Loading states + skeletons | ✅ Funcional (MYF-13) |
| Error boundary global + logging | ✅ Funcional (MYF-18, ADR-0005) |
| Lazy loading por ruta + code splitting | ✅ Funcional (MYF-23) |
| SEO meta tags | ✅ Funcional (MYF-23) |
| Build producción (`npm run build`) | ✅ Verificado (dist/ correcto) |
| Config Vercel (`vercel.json`) | ✅ Preparado (MYF-14) |
| Despliegue Vercel | ⛔ Bloqueado: falta token Vercel / repo GitHub |

## ✅ Resiliencia y recuperación de errores (MYF-18 COMPLETADO)

- **ErrorBoundary global** envuelve todo el contenido: un fallo de render/ciclo
  de vida en cualquier página muestra pantalla de error amigable en vez de
  romper la app.
- **Pantalla de recuperación**: `role="alert"`, mensaje claro, ID del error,
  opciones **Reintentar** (remonta el subárbol), **Reiniciar la aplicación**
  (reload) y **Copiar informe del error** (clipboard con feedback).
- **`src/lib/errorReporting.ts`**: punto único de captura (`reportError`),
  log acotado en memoria, suscriptores (`onError`) — gancho preparado para
  Sentry — y handlers globales (`window.onerror` + `unhandledrejection`).
- **Tests**: 17 nuevos (`ErrorBoundary.test.tsx`, `ErrorScreen.test.tsx`).
- [ADR-0005](docs/adr/0005-error-boundary.md)

## ✅ Semana 4: Despliegue (MYF-14)

### ✅ Preparación Vercel
- `vercel.json`: preset vite, `outputDirectory: dist`, headers de caché, región `fra1`
- `npm run build` verificado (typecheck + vite build correctos)
- [ADR-0004](docs/adr/0004-vercel-deployment.md) + [runbook `docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

### ✅ Tests de integración módulo a módulo (MYF-14)
- **`src/test/ModuleIntegration.test.tsx`**: 5 tests end-to-end que cruzan módulos
  conduciendo la UI real (`<App />` completo: router hash + `AppStateProvider` +
  boot skeleton) con queries de Testing Library:
  1. Transacción → dashboard (recientes + KPI de gastos) → snapshot de presupuesto
  2. Recurrente → generación automática de la ocurrencia → ledger de transacciones → dashboard
  3. Inversión → panel de patrimonio neto
  4. Presupuesto creado por UI → gasto por transacciones → barras de progreso
  5. Ingreso → resumen mensual + patrimonio neto
- Suite completa: **172 tests** (`npm run test:run`), `tsc -b` y `eslint` limpios.

### ⛔ Bloqueador
- No existe token de Vercel ni repo GitHub con token en el entorno.
- Acción de desbloqueo: CEO/board debe aportar `VERCEL_TOKEN` (o GitHub repo +
  token) como Paperclip secret al agente Founding Engineer.

## ✅ Semana 4: Optimización de bundle y performance (MYF-23 COMPLETADO)

### Análisis de bundle
- **Baseline**: 525 kB JS minificado (147 kB gzip) en un único chunk.
- **Herramienta**: `vite-bundle-analyzer` (devDependency). Con
  `ANALYZE=true npm run build` se genera `dist/stats.html` (treemap interactivo).

### Optimizaciones aplicadas
- **Lazy loading por ruta**: cada página secundaria es un chunk propio
  (`React.lazy` + `Suspense` con fallback accesible `PageLoader`). El dashboard
  se mantiene eager para preservar el primer paint.
- **Code splitting de vendor**: `react`/`react-dom` en chunk propio cacheable.
- **Tree shaking**: imports optimizados en `App.tsx` (módulos de estado/UI que
  solo aportaban tipos movidos a imports de tipo).
- **SEO básico**: meta description, OG/Twitter tags, theme-color, robots,
  canonical URL build-time (`VITE_CANONICAL_URL`).

### Resultados (build de producción)
- Chunk inicial (entrada + dashboard): **76.63 kB (19.43 kB gzip)** frente a
  525 kB originales.
- Páginas secundarias: 0.7–5.3 kB gzip cada una, cargadas a demanda.
- Total gzip emitido: **~164 kB** (< 500 kB criterio de aceptación).
- Lighthouse **performance: 100** (throttling `provided`, entorno headless);
  con throttling móvil simulado el score baja por CPU de sandbox, no por
  bundle (TBT desciende a 0 ms sin throttling).
- [ADR-0006](docs/adr/0006-bundle-performance-seo.md)

| Criterio | Estado |
|----------|--------|
| Bundle < 500 kB gzip | ✅ ~164 kB total |
| Lazy loading páginas principales | ✅ 5 de 6 páginas en chunks a demanda |
| Lighthouse > 90 | ✅ 100 (provided) |

## ✅ Documentación para beta testers (MYF-24 COMPLETADO)

- **Guía rápida de uso**: [`docs/beta/GUIA_DE_USO.md`](beta/GUIA_DE_USO.md) —
  10 minutos para empezar, qué hay en cada pantalla, validación, confirmación
  y undo, privacidad.
- **Pautas de feedback**: [`docs/beta/FEEDBACK_GUIDELINES.md`](beta/FEEDBACK_GUIDELINES.md) —
   prioridades, qué incluir en un reporte y plantilla de campos.
- **Lista de control de features**: [`docs/beta/FEATURES_CHECKLIST.md`](beta/FEATURES_CHECKLIST.md) —
   checklist por módulo + transversal para testers.
- **Formulario de feedback `public/feedback.html`**: página estática
  autocontenida y accesible (WCAG: labels visibles, navegable por teclado,
  mensajes de error). Valida campos, construye el informe estructurado, lo
  guarda en localStorage y permite copiarlo o enviarlo por correo. Enlazado
  desde **Configuración → Enviar feedback** (i18n es/en). Sin backend: los
  datos nunca salen del dispositivo salvo el reporte explícito.
- [Index de docs](beta/README.md) + sección "Beta testers" en `README.md`.
- **Tests**: `SettingsPage.test.tsx` cubre el enlace de feedback en ambos
  idiomas. Suite: **174 tests**.

## ✅ Contexte de grupo en recurrentes (MYF-25 COMPLETADO)

- **HU-0.8 recurrente falsificado**: reglas recurrentes **personales** o de **grupo**
  (`RecurringTransaction.groupId` nullable + `createdBy`), compatibles con el modelo
  multiusuario de ADR-0008).
- **Materialización con contexto**: `materializeDue` propaga el `groupId` de la
  regla a cada transacción generada (el ledger queda etiquetado por grupo).
- **Permisos en generación**: `ruleCanGenerate`/`generationGuardFor` respeta los
  permisos del miembro que creó la regla; una regla de grupo solo materializa
  mientras su creador conserva `data.edit` (admin/member) en el grupo.
- **Listado filtrable por contexto**: `RecurringContext` (all/personal/group) +
  `recurringsInContext`; selector de contexto en `RecurringPage` y campo de
  contexto en `RecurringForm` (solo grupos con permiso).
- **Persistence**: `storageService` parsela `groupId`/`createdBy` (opcionales,
  retrocompatibles con snapshots v1.
- **Tests**: casos nuevos en `recurrenceService.test.ts`, `storageService.test.ts`
  y `RecurringPage.test.tsx` (grupos).
- [ADR-0009](docs/adr/0009-recurring-group-context.md)

## 📋 Contexte de grupos en budgets/inversiones (HU-0.9) — EN CURSO (otro run)

Ver cambios intermedios en `features/budgeting` e `features/investments`
(grupos compartidos y ownership). A UNIR en el lanzamiento del contexto común.

## ✅ Dashboard multi-contexto (MYF-26 COMPLETADO)

- **Selector de contexto propio** (`DashboardContextSelector`): **Personal**,
  **Todo** (vista consolidada) y cada grupo del miembro. Se muestra solo cuando
  el usuario pertenece a al menos un grupo; por defecto Personal.
- **Servicio `dashboardContext.ts`**: `DashboardContext` (personal/all/group) +
  `transactionsInContext` con la misma regla de ámbito que el calculador de
  presupuestos (`isInScope`) para que KPI y presupuesto cuenten lo mismo:
  personal → solo filas propias; group → ledger del grupo + gasto de cualquier
  miembro (nunca filas de otro grupo); all → todo el libro.
- **Todos los widgets en contexto**: KPIs del mes, comparativa vs anterior,
  desglose de gastos, transacciones recientes, snapshot de presupuestos,
  patrimonio neto e histórico filtran por el contexto activo y se actualizan al
  cambiar.
- **Etiquetas de origen en "Todo"**: columna "Origen" en transacciones recientes
  (Personal / nombre de grupo) y desglose de gastos por categoría con chips
  etiquetados.
- **Desglose por miembro en grupo**: cada categoría del desglose muestra chips
  `miembro · importe` (agregación de todos los miembros).
- **Patrimonio neto por contexto**: personal → parte proporcional del usuario;
  grupo → activos del grupo al total; "Todo" → inventario completo a valor total
  (`PortfolioContext.kind = 'all'`).
- **Decisión**: contexto local de la vista (no persistido), igual que Recurrentes;
  el dashboard ya no depende de `store.budgetGroupId`. Ver
  [ADR-0011](docs/adr/0011-dashboard-context.md)
- **Tests**: 10 nuevos/ajustados (dashboardContext, expenseBreakdown con shares,
  holdingsForContext 'all', página multi-contexto). Suite: **+28 tests** respecto
  al lanzamiento anterior en los ficheros del dashboard.

## ✅ Transacciones con contexto de grupo (HU-0.6, MYF-22 COMPLETADO)

- **Selector de contexto en el listado**: filtro **Personal / cada grupo /
  Todas** en el encabezado de la página de transacciones, visible solo cuando
  el usuario pertenece a al menos un grupo por defecto Personal. El listado
  deriva de `visibleTransactions` con reglas explícitas (personal ↔ sin grupo;
  grupo ↔ `groupId` igual; `all` ↔ todo el libro).
- **Selector de grupo en el formulario**: al crear/editar un ingreso o gasto se
  elige **Personal** o uno de los grupos del usuario con permiso de edición
  (`data.edit`). **Por defecto se propone el contexto activo** del listado
  ("por defecto se propone el contexto activo").
- **Editar y reasignar**: cada fila gestionable ahora tiene **Editar**, cargando
  la transacción en el formulario; al guardar se usa el nuevo
  `AppState.updateTransaction(id, patch)` — se puede reasignar la transacción a
  otro contexto (personal/grupo) sin perder historial.
- **Quién lo añadió**: las filas de otro miembro muestran "Añadido por {nombre}"
  (helper síncrono `transactionCreatorFor()`). La propiedad `userId` ya estampa
  quién la creó.
- **Permisos**: las filas de grupo respetan el ownership-permiso
  (`groupAccessFor().canEditRecord`, HU-0.10): el admin edita/borra cualquier
  fila, el miembro solo las suyas, `readonly` ninguna. Las personales son
  siempre gestionables.
- **Independencia del contexto**: se reutiliza el patrón del dashboard/recurrentes
  (contexto local de la vista, no persistido, keyed por usuario). Sin grupos, la
  página se comporta idénticamente a antes. Ver
  [ADR-0012](docs/adr/0012-transaction-group-context.md)
- **Tests**: 5 nuevos de página (filtro por contexto, origen de grupo, "Añadido
  por", alta de transacción de grupo y reasignación) + fix de un warning TS
  pre-existente (`GROUP_STORAGE_KEY` sin usar). Suite completa: **331 tests**.

## Próximos Pasos Recomendados

1. **Sentry**: integrar transporte en `errorReporting.ts` cuando el CEO aporte credencial

## Comando Útil

```bash
cd /opt/paperclip-ai/my-financial-compass
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Build de producción
npm run test:run     # Ejecutar tests
npm run lint         # Verificar lint
```