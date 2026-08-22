# My Financial Compass

Aplicación web de finanzas personales responsive y accesible (WCAG 2.1 AA) con
cinco módulos:

1. **Transacciones** – Registro y categorización manual de ingresos y gastos.
2. **Recurrentes** — Automatización de transacciones periódicas con frecuencias configurables.
3. **Presupuestos** — Límites mensuales por categoría con barras de progreso.
4. **Inversiones y multidivisa** — Cartera de inversiones con conversión de divisas.
5. **Dashboard** — Resumen mensual, desglose de gastos, transacciones recientes y patrimonio neto.

> **Beta testers**: ¿eres de los primeros usuarios de prueba? Consulta la
> [guía de uso](./docs/beta/GUIA_DE_USO.md), las
> [pautas de feedback](./docs/beta/FEEDBACK_GUIDELINES.md) y la
> [lista de control de features](./docs/beta/FEATURES_CHECKLIST.md). El
> formulario de feedback está disponible en `public/feedback.html`
> (enlazado desde **Configuración → Enviar feedback**).

## Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 8
- **Linting:** ESLint (typescript-eslint + react-hooks)
- **Testing:** Vitest + Testing Library + jsdom
- **Routing:** SPA con hash (`#/…`), sin librería externa
- **Auth:** sesión local con `localStorage`, backend simulado migrable (ADR-0007)

> Al arrancar pide **Iniciar sesión / Crear cuenta**: la app es privada y los
> datos solo se muestran con sesión iniciada. Los datos financieros viven en
> el dispositivo y se borran con la cuenta.

## Convenciones de código

> El código y los nombres de archivo se escriben en inglés; la interfaz de
> usuario es i18n (es/en) mediante `src/lib/i18n.ts`.

## Puesta en marcha

```bash
npm install
npm run dev         # http://localhost:3000
```

## Scripts

| Script           | Descripción                                          |
| ---------------- | ---------------------------------------------------- |
| `npm run dev`    | Dev server con HMR en `http://localhost:3000`        |
| `npm run build`  | Typecheck (`tsc -b`) + build de producción (`vite build`) |
| `npm run lint`   | ESLint sobre `src/`                                  |
| `npm run lint:fix` | ESLint con autoarreglo                            |
| `npm run test`   | Vitest en modo watch                                  |
| `npm run test:run` | Ejecuta la suite de tests una vez                  |
| `npm run preview`| Sirve el build de producción en `http://localhost:3000` |

## Estructura de carpetas

```
src/
├── components/            # Componentes de UI transversales
│   ├── Breadcrumb.tsx     # Indicador de sección actual
│   ├── ConfirmDialog.tsx  # Diálogo de confirmación destructiva
│   ├── DashboardSkeleton.tsx # Esqueleto de carga del dashboard
│   ├── ErrorBoundary.tsx  # Error boundary global
│   ├── ErrorScreen.tsx    # Pantalla de error amigable + recuperación
│   ├── FormField.tsx      # Inputs con label visible y error
│   ├── LoadingSpinner.tsx # Spinner accesible
│   ├── MainNav.tsx        # Navegación principal (todas las pantallas)
│   ├── Page.tsx           # Scaffolding de sección con heading
│   ├── Skeleton.tsx       # Placeholders de carga
│   └── UndoToast.tsx      # Toast de "Deshacer" tras eliminar
├── features/              # Los cinco módulos (uno por carpeta)
│   ├── auth/              # Cuentas, sesión y perfil (MYF-20)
│   │   ├── components/    # Login, registro, recuperación, perfil, header
│   │   ├── services/      # authService (REST local) + password + store
│   │   ├── state/         # AuthContext (sesión + moneda principal)
│   │   └── types/
│   ├── transactions/      # Módulo 1
│   │   └── types/
│   ├── recurring/         # Módulo 2
│   │   └── types/
│   ├── budgeting/         # Módulo 3
│   │   ├── components/
│   │   ├── services/      # Cálculos de presupuesto (unit-testeados)
│   │   └── types/
│   ├── investments/       # Módulo 4
│   │   └── types/
│   └── dashboard/         # Módulo 5
│       ├── components/    # Widgets: KPIs, desglose, recientes, patrimonio, histórico, selector de contexto
│       ├── services/      # Cálculos mensuales, patrimonio, conversión de divisas y contexto (HU-0.5)
│       ├── data/          # Dataset de demostración (opt-in)
│       └── types/
├── hooks/
│   └── useUndo.ts         # Historial de undo (con OC template)
├── lib/
│   ├── dates.ts           # Parseo/formato de fechas DD/MM/AAAA (es)
│   ├── errorReporting.ts  # Captura/logging de errores (gancho Sentry)
│   ├── i18n.ts            # Traducciones es/en
│   └── validation.ts      # Validadores client-side (tests)
├── pages/                 # Rutas de nivel superior
│   ├── DashboardPage.tsx
│   ├── TransactionsPage.tsx
│   ├── RecurringPage.tsx
│   ├── BudgetsPage.tsx
│   ├── InvestmentsPage.tsx
│   └── SettingsPage.tsx
├── state/
│   └── AppState.tsx       # Contexto global (store + locale)
├── test/
│   └── setup.ts           # Configuración de jsdom + jest-dom
├── App.tsx                # Shell: header, nav, breadcrumb, rutas + error boundary
├── index.css              # Tokens y estilos base
└── router.ts              # Enrutador hash-based
```

## Convenciones

- Todos los números aceptan decimales (mínimo 2).
- Las fechas se muestran en formato local (`DD/MM/AAAA` en español).
- Toda acción destructiva pasa por `ConfirmDialog` y ofrece `UndoToast` (5–10 s).
- Todos los formularios son navegables por teclado, con labels visibles.
- Los errores se capturan globalmente (`ErrorBoundary` + `errorReporting`) y la
  app ofrece recuperación (reintentar / reiniciar); los detalles se copian y
  reportan sin exponer datos personales.

## Decisiones arquitectónicas

Ver [`docs/adr/`](docs/adr/).