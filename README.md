# My Financial Compass

Aplicación web de finanzas personales responsive y accesible (WCAG 2.1 AA) con
cinco módulos:

1. **Transacciones** – Registro y categorización manual de ingresos y gastos.
2. **Recurrentes** — Automatización de transacciones periódicas con frecuencias configurables.
3. **Presupuestos** — Límites mensuales por categoría con barras de progreso.
4. **Inversiones y multidivisa** — Cartera de inversiones con conversión de divisas.
5. **Dashboard** — Resumen mensual, desglose de gastos, transacciones recientes y patrimonio neto.

## Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 8
- **Linting:** ESLint (typescript-eslint + react-hooks)
- **Testing:** Vitest + Testing Library + jsdom
- **Routing:** SPA con hash (`#/…`), sin librería externa

## Requisitos previos (para producción)

> Los comentarios en el código y los nombres de archivo se escriben en inglés,
> mientras que la interfaz de usuario es i18n (es/en). Ver [docs/i18n.md](../docs/i18n.md) si fuera a existir.

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
│   ├── FormField.tsx      # Inputs con label visible y error
│   ├── MainNav.tsx        # Navegación principal (todas las pantallas)
│   ├── Page.tsx           # Scaffolding de sección con heading
│   └── UndoToast.tsx      # Toast de "Deshacer" tras eliminar
├── features/              # Los cinco módulos (uno por carpeta)
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
│       ├── components/    # Widgets: KPIs, desglose, recientes, patrimonio, histórico
│       ├── services/      # Cálculos mensuales, patrimonio y conversión de divisas
│       ├── data/          # Dataset de demostración (opt-in)
│       └── types/
├── hooks/
│   └── useUndo.ts         # Historial de undo (con OC template)
├── lib/
│   ├── dates.ts           # Parseo/formato de fechas DD/MM/AAAA (es)
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
├── App.tsx                # Shell: header, nav, breadcrumb, rutas
├── index.css              # Tokens y estilos base
└── router.ts              # Enrutador hash-based
```

## Convenciones

- Todos los números aceptan decimales (mínimo 2).
- Las fechas se muestran en formato local (`DD/MM/AAAA` en español).
- Toda acción destructiva pasa por `ConfirmDialog` y ofrece `UndoToast` (5–10 s).
- Todos los formularios son navegables por teclado, con labels visibles.

## Decisiones arquitectónicas

Ver [`docs/adr/`](docs/adr/).