# ADR-0010: Inversiones compartidas con propiedad proporcional (HU-0.9)

- **Estado:** Aceptado (2026-08-22)
- **Decisor:** Founding Engineer
- **Contexto:** HU-0.9 permite registrar **activos de grupo**: una inversión
  puede ser personal (100 % de un usuario) o compartida dentro de un grupo,
  donde cada miembro posee un porcentaje explícito. En la **vista personal**
  solo debe aparecer la parte proporcional que le corresponde al usuario; en la
  vista de grupo se muestra el patrimonio completo con su desglose por miembro.
  La conversión de divisa usa la moneda del grupo en contexto de grupo y la
  moneda personal en la vista personal.

## Decisión

- **Modelo de datos** (`features/investments/types`):
  - `Investment.groupId?: string` — null/ausente = inversión personal;
    con valor = activo de grupo (referencia a `groups`, ADR-0008).
  - `Investment.createdBy?: string` — usuario que la creó (auditoría y
    propiedad de activos personales).
  - `InvestmentOwnership { investmentId, userId, percentage }` — filas de
    propiedad por miembro. Para activos de grupo los porcentajes **suman 100**
    (se valida en el servicio, nunca en el UI).
- **Persistencia**: `PersistedState` añade `investmentOwnerships` y `Investment`
  los campos nuevos; todos opcionales y backward-compatible con el snapshot
  `v1` (los activos legacy sin `createdBy` pertenecen a cualquier usuario
  autenticado).
- **Servicio de cartera** (`features/investments/services/portfolio.ts`) —
  lógica pura sobre la que se montan vista y patrimonio:
  - `ownershipPercentage` — 100 para personales, fila del usuario para grupos.
  - `holdingsForContext` — filtra/valora según un `PortfolioContext`
    (`personal` con `userId` o `group` con `groupId`): el contexto personal
    valora cada activo al `percentage/100` del usuario; el de grupo al 100 %.
  - `isFullOwnership` — valida que la suma sea 100 (tolerancia 0.001).
- **Patrimonio neto por contexto** (`dashboard.service.contextNetWorth*`):
  calcula líquido + cartera del contexto activo. El dashboard usa el contexto
  de `store.budgetGroupId` (compartido con presupuestos, ADR-0009): si no hay
  grupo activo, computa la vista personal proporcional.
- **Vista** (`InvestmentsPage`): selector de ámbito (Personal + grupos del
  usuario), editor de % de propiedad al crear una inversión de grupo con
  validación "suma 100" y mensajes de error locales, y lista que muestra el
  importe proporcional en la vista personal y el completo con desglose en la
  vista de grupo.

## Alternativas consideradas

- **Valor "full" siempre visible**: rechazado — viola HU-0.9 ("en vista
  personal, solo la parte proporcional") y filtra mal la privacidad.
- **Encaje del desglose en el propio Investment**: se separa a
  `InvestmentOwnership` (tabla de relación 1:N) para que la migración a SQL
  sea directa, igual que `GroupMember` en ADR-0008.

## Consecuencias

- La vista personal ya no sobre-valora los activos compartidos (antes se
  sumaban al 100 %, ahora al % del usuario).
- Los activos de grupo creados requiren +1 insight selectivo por miembro.
- Backend futuro reaprovecha el contrato `InvestmentOwnership` como
  `investment_ownerships` sin tocar la UI.

## Migración SQL futura

```sql
CREATE TABLE investment_ownerships (
  investment_id TEXT NOT NULL REFERENCES investments(id),
  user_id        TEXT NOT NULL REFERENCES users(id),
  percentage     REAL NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  PRIMARY KEY (investment_id, user_id),
  CONSTRAINT sum_100 CHECK (
    ABS((SELECT SUM(percentage) FROM investment_ownerships) - 100) < 0.001
  )
);
CREATE INDEX investment_ownerships_group ON investment_ownerships(user_id);
```