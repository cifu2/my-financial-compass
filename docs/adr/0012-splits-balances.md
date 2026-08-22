# ADR-0012: División de gastos y balances de deudas entre miembros

- Estado: Aceptado
- Fecha: 2026-08-22
- Alcance: HU-0.7 / MYF-27

## Contexto

Los grupos del modelo multiusuario (ADR-0008) permiten registrar transacciones
compartidas (`Transaction.groupId`), pero no había forma de marcar *cómo* se
reparte un gasto entre los miembros ni de saber quién debe a quién. Sin ese
dato, cada miembro ve la transacción completa y las reglas de un boletín no
tienen base.

HU-0.7 define: modos de reparto (partes iguales, porcentajes, importes fijos,
ponderaciones), validación de que el reparto cuadre con el total, cálculo
automático de quien paga y quien debe, balance de deudas por miembro y
registro de liquidaciones con histórico.

## Decisión

Crear un módulo `features/splits` con tres conceptos y una separación clara
entre datos persistidos y vistas derivadas:

### Modelos persistidos

1. **`ExpenseSplit`** (1 × transacción compartida): `transactionId`, `groupId`,
   `paidBy` (quién adelantó el dinero), `method` y `shares[]` (participante +
   importe). Se guarda junto con la transacción; al borrar la transacción se
   borra su reparto; al restaurarla (undo) se restaura.

2. **`Settlement`** (histórico append-only): `groupId`, `fromUserId`,
   `toUserId`, `amount`, `date`, `createdAt`. Registra un pago entre dos
   miembros. Nunca se edita; solo se añade (el borrado con confirmación + undo
   cubre errores del usuario).

Ambos persisten en el mismo snapshot financiero (`storageService`) como
arrays nuevos (`expenseSplits`, `settlements`), retrocompatibles: un snapshot
antiguo los inicializa a `[]`. El esquema sigue siendo `version: 1` porque la
adición es cara-relieve (añade campos, no los renombra).

### Vistas derivadas (no se persisten)

- **`DebtBalance`**: filas `(groupId, debtorId, creditorId, amount)` que
  representan las deudas simplificadas ("Ana debe 45 € a Luis"). Se calculan
  a petición, nunca se almacenan, evitando que queden obsoletas al borrar
  un gasto o registrar una liquidación.
- **`web balances`**: algoritmo de neteo per-member en céntimos exactos:

  1. Por cada gasto, cada participante adeuda su share; el pagador recibe
     `total - sharePayer` (su propia parte se autoanula).
  2. Se aplican los `Settlement`s: alguien que paga a otro reduce esa deuda.
  3. Se simplifica la red en un conjunto bi-directional sin ciclos (deudor
     mayor paga al acreedor mayor, repetidamente hasta cero), lo que minimiza
     el número de "debe a" visibles.

### Cálculo del reparto

`computeSplit` es una función pura (sin UI ni estado). Todo el aritmética se
hace en céntimos para que la suma de los `shares` sea **exactamente** el total
del gasto (criterio de HU-0.7). Los céntimos sobrantes se asignan
cíclicamente a los participantes. Modos soportados:

- `equal`: idéntico para todos, el resto de céntimos se reparte.
- `percentages`: cada miembro da un %; deben sumar 100 (tolerancia 0.01).
- `amounts`: cada miembro da un importe fijo; la suma debe cuadrar con el total.
- `weights`: cada miembro da un peso; la parte = total × peso / Σpesos.

Cada modo devuelve un código de error machine-readable (`percentages-sum`,
`amounts-sum`, …) que la UI traduce con `lib/i18n`.

### UI

- **Formulario de transacción**: selector de contexto (personal/grupo) con
  check "Compartir este gasto"; al activarse aparece `SplitEditor` (pagador,
  método, campos por miembro) con previsualización en vivo y el aviso de
  "suma debe cuadrar" justo donde el usuario lo espera. Guardar se bloquea
  mientras el reparto no cuadre.
- **`/balances`** (nueva ruta): per grupo muestra "X debe Y € a Z", resumen
  por miembro (positivo/negativo), formulario de liquidación (de → a, importe,
  fecha, nota) e histórico de liquidaciones con borrado + undo.

## Consecuencias

- +1 slice on `Storage`: `expenseSplits`, `settlements`.
- Las transacciones de grupo existentes sin reparto siguen visibles (no es
  obligatorio compartir).
- Los datos derivados (`DebtBalance`) nunca vencen; cualquier cambio en
  gastos o liquidaciones los recalcula.
- El motor se pondrá migrar a un backend real sin tocar la UI: al igual que
  el resto de features, la décima se apoya en `storageService` y stores
  síncronos.