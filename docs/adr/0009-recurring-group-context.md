# ADR-0009: Contexto de grupo en transacciones recurrentes (HU-0.8)

- **Estado:** Aceptado (2026-08-22)
- **Decisor:** Founding Engineer
- **Contexto:** HU-0.8 habilita gastos recurrentes **compartidos**: una regla puede
  ser personal o pertenecer a un grupo, y las transacciones que genera deben
  registrarse en el contexto del grupo. MYF-19 aportó el modelo de datos
  multiusuario (Group/GroupMember con roles) y MYF-20 la autenticación y el
  contrato `UserProfile`; este ADR decide cómo el módulo de recurrentes se
  acopla a ese modelo sin romper el contrato local-first (ADR-0003).

## Decisión

- **`RecurringTransaction.groupId?: string`** (null/ausente = regla personal;
  con valor = regla de grupo) y **`createdBy?: string`** (usuario que la creó,
  ancla de permisos en la generación).
- **La materialización estampa el contexto**: `materializeDue` propaga el
  `groupId` de la regla a cada transacción generada (campo `groupId` en el
  ledger) — "al generarse, se asignan al contexto del grupo".
- **Guard de permisos en generación**: `ruleCanGenerate`/`generationGuardFor`
  en `recurrenceService`. Una regla de grupo solo materializa mientras su
  creador sigue siendo miembro con capacidad `data.edit` (admin/member).
  El `AppStateProvider.syncDue` construye el guard con la sesión + snapshot de
  grupos, como haría un backend.
- **Listado filtrable por contexto**: `RecurringContext` (`all`, `personal`,
  `group`), `ruleInContext` y `recurringsInContext`; la página ofrece un
  selector de contexto y el formulario permite elegir Personal vs. uno de los
  grupos del usuario con permiso `data.edit`.
- La regla se limpia pero nunca borra el campo: `storageService` parsea
  `groupId`/`createdBy` como opcionales, de modo que los snapshots heredados
  siguen leyéndose (esquema `v1` intacto).

## Alternativas

- **guard de permisos en el componente de página**: rechazado; sería una
  verificación de UI y no un límite en el engine de materialización.
- **Numerar group contexts por rol en la regla misma**: el rol puede cambiar;
  el snapshot de `groupStore` es la fuente de verdad de identifi/role.
- **Añadir una columna `context` al ledger en vez de `groupId`**: `groupId`
  es la FK natural y mantiene el modelo relacional de ADR-008.

## Consecuencias

- Reglas completamente: personales (sin grupo) y compartidas (con grupo) coexisten.
- La generación respeta los permisos: readonly/revocado detiene la materialización.
- El ledger queda etiquetado por contexto, habilitando dashboards por contexto
  futuros (trabajo de HU-0.9).
- Tests: casos nuevos en `recurrenceService.test.ts` (stamp + filtro +
  permisos), `storageService.test.ts` (round-trip) y `RecurringPage.test.tsx`
  (creación y filtrado por grupo).