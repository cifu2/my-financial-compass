# ADR-0011: Dashboard multi-contexto (HU-0.5)

## Estado

Aceptado — implementado en MYF-26.

## Contexto

El dashboard heredó del módulo de presupuestos un único "contexto activo"
(`store.budgetGroupId`, HU-0.8) que solo controlaba el snapshot de presupuestos
y el patrimonio neto. El resto de widgets (KPIs del mes, desglose de gastos,
transacciones recientes, histórico) siempre mostraban **todo** el libro mayor,
sin respetar ningún contexto. Con la fundación multiusuario (MYF-19/24/25), los
datos llevan `userId` y `groupId`, así que el dashboard podía y debía ponerlos
en contexto.

## Decisión

El dashboard tiene **su propio selector de contexto** (`DashboardContext` en
`features/dashboard/services/dashboardContext.ts`) que ofrece **tres ámbitos**:

- **`personal`** (por defecto): solo las transacciones del usuario legítimo
  (`userId` ausente = legacy/own) y nunca filas selladas con un grupo.
- **`group`**: agrega el libro compartido del grupo (`groupId` igual) **más** el
  gasto de cualquier miembro del grupo (filas propiedad con permiso). Regla
  idéntica a la del calculador de presupuestos `isInScope` para que KPI y
  presupuesto cuenten lo mismo.
- **`all` (Todo)**: vista consolidada de todo el libro con **etiquetas de
  origen** (personal / cada grupo) en transacciones recientes y en el desglose
  de gastos por categoría.

Todos los widgets derivan de una única lista filtrada
(`transactionsInContext`): KPIs, comparativa vs mes anterior, desglose de
gastos, reciente, snapshot de presupuestos, patrimonio neto e histórico. El
patrimonio neto valora las inversiones según el contexto (personal → la parte
proporcional; grupo → al total; `all` → inventario completo a valor total en
`PortfolioContext.kind = 'all'`).

### Alternativas consideradas

1. **Seguir usando solo `budgetGroupId`** como fuente de verdad. Se descartó:
   el dashboard tendría que estar acoplado al módulo de presupuestos y no
   podría ofrecer la vista "Todo", que la HU-0.5 exige explícitamente.
2. **Contexto global persistido**. Se descartó: el selector del módulo de
   recurrentes usa estado local y aquí la persistencia añade migración de
   esquema sin valor; al cambiar el miembro activo el selector se queda
   keyed por usuario.
3. **Regla estricta por `groupId` en "group"**. Se descartó como regla única:
   rompería la coherenza con los presupuestos de grupo (que ya cuentan el gasto
   de los miembros). Se matiza excluyendo filas selladas con **otro** grupo
   para evitar dobles cuentas en "Todo".

## Consecuencias

- Todo el dashboard responde a una sola fuente de contexto; los widgets nunca
  divergen entre sí.
- La vista "Todo" etiqueta el origen de cada fila (personal / nombre de grupo),
  y el desglose de grupos muestra chips por miembro.
- El contexto es local de la sesión de vista (no persistido), igual que el de
  Recurrentes.
- Nuevas claves i18n `dash.contextLabel`, `dash.contextPersonal`,
  `dash.contextAll`, `dash.origin`, `dash.originPersonal`, `dash.shareLabel`.