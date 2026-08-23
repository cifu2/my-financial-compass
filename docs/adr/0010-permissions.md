# ADR-0010: Sistema de permisos por rol (HU-0.10)

- **Estado:** Aceptado (2026-08-22)
- **Decisor:** Founding Engineer
- **Contexto:** MYF-19/21 aportó el modelo multiusuario
  (Group/GroupMember con roles `admin`/`member`/`readonly`) y el servicio de
  gestión de miembros; MYF-24/25/27 añadieron datos de grupo (inversiones
  compartidas, recurrentes compartidas, presupuestos de grupo). Hacía falta
  **una única matriz de permisos** que decida qué puede hacer cada rol en cada
  grupo y que la UI y los servicios consulten de forma consistente.

## Decisión

Centralizar el modelo de permisos en `features/groups/permissions.ts` y que
toda lectura de "¿puede el actor hacer X en el grupo Y?" pase por él.

### Matriz (HU-0.10)

| Acción | Admin | Miembro | Solo lectura |
|--------|-------|---------|-------------|
| Ver datos del grupo | sí | sí | sí |
| Crear/editar transacciones | sí | sí | no |
| Editar registros de otros miembros | sí | no (solo propios) | no |
| Gestionar presupuestos del grupo | sí | configurable | no |
| Gestionar inversiones del grupo | sí | configurable | no |
| Invitar/expulsar/cambiar roles | sí | no | no |
| Borrar el grupo | sí | no | no |

### Implementación

- **Capacidades declarativas** (`permissions.ts`): `ROLE_CAPABILITIES` +
  `can(role, capability, settings?)`. `budget.manage` e `investment.manage`
  son **configurables por grupo**: un admin puede revocarlas a los miembros
  vía `Group.settings.membersCanManageBudgets|Investments`
  (`GroupSettings`, por defecto `true`).
- **Checks orientados a la propiedad** (`canEditData` / `canDeleteData`):
  el admin edita/borra cualquier fila; el miembro solo las suyas
  (`ownerId`), y `readonly` nunca. Rows sin Owner (legacy) se tratan como del
  actor.
- **Acceso resuelto síncrono** (`features/groups/access.ts` →
  `groupAccessFor`): expone `canView/canEdit/canManageBudgets/
  canManageInvestments/canManageMembers/canDeleteGroup` y los checks de
  record `canEditRecord`/`canDeleteRecord` para ese usuario+grupo concreto,
  leyendo el snapshot persistido (mismo patrón que `investmentGroupContext`).
- **UI que oculta/muestra** (`PermissionNotice` + páginas):
  - Presupuestos: contexto de grupo sin `budget.manage` → oculta el formulario
    y las acciones de editar/eliminar, y muestra un aviso `role="alert"` claro
    (solo lectura, o miembros sin permiso configurado).
  - Inversiones: ámbito de grupo sin `investment.manage` → oculta el form del
    activo; el botón de eliminar se rige por propiedad
    (`canDeleteRecord(createdBy)`).
  - Recurrentes: `RecurringList` acepta `canManage` por fila; las de grupo
    se gestionan solo mientras el actor conserva `data.edit` del grupo.
  - La capa del servicio (`groupService`, `recurrenceService.generationGuard`)
    ya aplicaba contratos; ésta es la consolidación visible.

## Consecuencias

- Una única fuente de verdad para la matriz; añadir una capacidad = tocar un
  enumerado + `ROLE_CAPABILITIES`, los consumidores la reciben.
- `Group.settings` es opcional y `groupStore` lo parsea estrictamente (los
  campos no booleanos se descartan; ausencia = `DEFAULT_GROUP_SETTINGS`).
- El cambio de permiso de un miembro (p. ej. revocado a `readonly`) se refleja
  en la UI inmediatamente porque la resolución lee el snapshot en cada render.
- Tests: matriz completa, ownership, settings, persistencia y gating de UI.

## Archivos

- `features/groups/permissions.ts` + `permissions.test.ts`
- `features/groups/access.ts` + `access.test.ts`
- `features/groups/types`, `groupStore` (parse de `Group.settings`)
- `features/groups/components/PermissionNotice.tsx`
- Páginas: Budgets, Investments, Recurring (+ tests)