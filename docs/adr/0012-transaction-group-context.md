# ADR-0012: Transacciones con contexto de grupo (HU-0.6)

## Estado

Aceptado — implementado en MYF-22.

## Contexto

Antes de MYF-22, el modelo de transacción ya llevaba `groupId` (nullable) y
`userId` (propietario) desde la fundación multiusuario (MYF-19), pero **la
página de transacciones ignoraba ambos**: el formulario siempre creaba filas
personales y el listado mostraba **todo** el libro mayor sin ningún filtro por
contexto. El dashboard sí tenía contexto (ADR-0011) y los recurrentes pactaron
una regla propia (ADR-0009), pero la transacción — la entidad central — seguía
sin contexto.

La HU-0.6 exige que al crear/editar un ingreso o gasto el usuario elija si es
personal o de un grupo concreto, que se proponga por defecto el contexto
activo, que quede registrado quién lo creó y que el listado filtre por ámbito.

## Decisión

1. **Selector de contexto en el listado**: la página de transacciones ofrece un
   filtro de contexto (Personal / cada grupo del usuario / Todas) en el
   encabezado del listado, mostrado únicamente cuando el usuario pertenece a al
   menos un grupo. El listado deriva de una sola lista filtrada
   (`visibleTransactions`) con reglas explícitas: `personal` excluye filas con
   `groupId`; un grupo solo muestra sus filas (igual que la regla `ruleInContext`
   de recurrings); `all` muestra todo.
- **Selector de grupo en el formulario**: el cliente puede elegir "Personal"
   (vacío) o uno de sus grupos con permiso de edición (`data.edit`, ADR-0010).
   Por defecto se propone el contexto activo del listado (**HU-0.6: "Por
   defecto se propone el contexto activo"**): si el listado está filtrando un
   grupo, las nuevas transacciones nacen en ese grupo.
- **Editar y reasignar**: cada fila gestionable obtiene un botón "Editar" que
   carga la transacción en el formulario; al guardar se usa
   `AppState.updateTransaction(id, patch)` (nuevo) para cambiar cualquier campo,
   incluido `groupId` → la fila se reasigna de contexto sin perder su
   historial.
- **Quién lo añadió**: `addTransaction` ya estampa `userId` con el usuario de
   sesión; el listado resuelve y muestra "Añadido por {nombre}" para filas
   creadas por otro miembro (helper síncrono `transactionCreatorFor()` que
   lee las snapshots de auth/grupos, patrón del ADR-0010).
- **Permisos**: las filas de grupo solo son editables/eliminables mientras el
   actor mantiene `data.edit` y ownership en el grupo (reutiliza
   `groupAccessFor().canEditRecord`); las personales siempre son gestionables.

### Alternativas consideradas

1. **Solo `groupId` en el formulario sin filtro de listado**. Descartado: la
   HU-0.6 exige que el listado respete el ámbito de contexto, no solo el alta.
2. **Reutilizar el contexto global persistido (`budgetGroupId`)**. Descartado:
   acoplaría transacciones al módulo de presupuestos y el select list de la
   HU-0 es local por usuario (igual que en recurringes y dashboard).
3. **Regla de contexto "group" con agregación de miembros** (como el
   `transactionsInContext` del dashboard). Descartado para el listado de
   transacciones: aquí el ámbito es la propiedad física de la fila (`groupId`),
   no la agregación de gasto; la vista "Todo" ya cubre la consolidación.

## Consecuencias

- Las transacciones personales se comportan igual que antes cuando el usuario
  no pertenece a ningún grupo (filtro y selector ocultos).
- Nuevas claves i18n: `transaction.contextLabel`, `transaction.contextPersonal`,
  `transaction.contextAll`, `transaction.addedBy`, `transaction.grouped`,
  `toast.transactionUpdated`.
- Nuevo `AppState.updateTransaction` reutilizable por futuros módulos.
- Nuevo servicio síncrono `features/transactions/services/transactionGroupContext.ts`
  + css `features/transactions/transactions.css`.