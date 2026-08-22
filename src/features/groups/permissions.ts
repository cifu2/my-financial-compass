import type { GroupRole } from './types'
import { roleAtLeast } from './types'

/**
 * Group-level capability model (HU-0.10, MYF-28).
 *
 * Capabilities express *what* a role may do inside a group, independent of
 * *which* group data is affected. The UI gates buttons/actions through
 * {@link can} and the ownership-aware helpers below; the service layer
 * (`groupService`, `recurrenceService`) enforces the same rules on every
 * mutation — so the UI check is a convenience, never a security boundary.
 *
 * ### Matrix (each row maps to a capability)
 *
 * | Acción                              | Admin  | Miembro                  | Solo lectura |
 * |-------------------------------------|--------|--------------------------|-------------|
 * | Ver datos del grupo                 | group.view                       |  |  |
 * | Crear/editar transacciones          | data.edit                        | readonly no |
 * | Editar registros de otros miembros  | admin: sí · miembro: solo propios | no         |
 * | Gestionar presupuestos del grupo    | budget.manage               | configurable | no |
 * | Gestionar inversiones del grupo     | investment.manage           | configurable | no |
 * | Invitar/expulsar/cambiar roles      | member.* admin only         |
 * | Borrar el grupo                     | group.delete (admin only)   |
 *
 * `budget.manage` and `investment.manage` are **configurable** for members:
 * an admin may revoke them per group via {@link GroupSettings}. When a group
 * has no settings stored, the capability falls back to the role default.
 */

export type GroupCapability =
  | 'group.view'
  | 'group.edit'
  | 'group.delete'
  | 'member.view'
  | 'member.add'
  | 'member.remove'
  | 'member.role'
  | 'member.invite'
  | 'data.view'
  | 'data.edit'
  | 'budget.manage'
  | 'investment.manage'

/** Base capabilities granted per role (before per-group settings). */
export const ROLE_CAPABILITIES: Readonly<Record<GroupRole, readonly GroupCapability[]>> = {
  admin: [
    'group.view',
    'group.edit',
    'group.delete',
    'member.view',
    'member.add',
    'member.remove',
    'member.role',
    'member.invite',
    'data.view',
    'data.edit',
    'budget.manage',
    'investment.manage',
  ],
  member: [
    'group.view',
    'member.view',
    'data.view',
    'data.edit',
    'budget.manage',
    'investment.manage',
  ],
  readonly: ['group.view', 'member.view', 'data.view'],
}

/**
 * Per-group settings that make `budget.manage` / `investment.manage`
 * configurable for members. Absent fields keep the role default (member may
 * manage). Only admins may change these (see `groupService.updateGroup`).
 */
export interface GroupSettings {
  /** Whether members (non-admins) may manage the group's shared budgets. */
  membersCanManageBudgets?: boolean
  /** Whether members (non-admins) may manage the group's shared investments. */
  membersCanManageInvestments?: boolean
}

/** Defaults applied when a group has no explicit settings. */
export const DEFAULT_GROUP_SETTINGS: Readonly<Required<GroupSettings>> = {
  membersCanManageBudgets: true,
  membersCanManageInvestments: true,
}

/** `true` when the group grants `capability` to `role` factoring its settings. */
export function can(role: GroupRole, capability: GroupCapability, settings?: GroupSettings): boolean {
  if (!ROLE_CAPABILITIES[role].includes(capability)) return false
  if (capability === 'budget.manage' && role === 'member') {
    return settings?.membersCanManageBudgets ?? DEFAULT_GROUP_SETTINGS.membersCanManageBudgets
  }
  if (capability === 'investment.manage' && role === 'member') {
    return settings?.membersCanManageInvestments ?? DEFAULT_GROUP_SETTINGS.membersCanManageInvestments
  }
  return true
}

/** Whether `role` has at least the same level as `minRole`. */
export function meetsRole(role: GroupRole, minRole: GroupRole): boolean {
  return roleAtLeast(role, minRole)
}

/**
 * Ownership check for member-editable records (transactions, etc.).
 *
 * - `admin` edits any record.
 * - `member` edits **only their own** records (`ownerId === actorId`).
 * - `readonly` never edits records.
 *
 * `ownerId` is the account that created the record (transaction.userId /
 * investment.createdBy). A missing/absent owner is treated as the actor's own
 * (legacy or personal rows) so personal data remains freely editable.
 */
export function canEditData(
  role: GroupRole,
  actorId: string,
  ownerId: string | undefined,
  settings?: GroupSettings,
): boolean {
  if (!can(role, 'data.edit', settings)) return false
  if (role === 'admin') return true
  return ownerId === undefined || ownerId === actorId
}

/**
 * Shortcut for records that are shared by the whole group (budgets and group
 * investments): the row has no per-member owner, so management is gated by the
 * configurable `budget.manage` / `investment.manage` capabilities.
 */
export function canManageGroupBudgets(role: GroupRole, settings?: GroupSettings): boolean {
  return can(role, 'budget.manage', settings)
}

export function canManageGroupInvestments(role: GroupRole, settings?: GroupSettings): boolean {
  return can(role, 'investment.manage', settings)
}

/** Whether the user can delete a record, mirroring the edit ownership rules. */
export function canDeleteData(
  role: GroupRole,
  actorId: string,
  ownerId: string | undefined,
  settings?: GroupSettings,
): boolean {
  if (!can(role, 'data.edit', settings)) return false
  if (role === 'admin') return true
  return ownerId === undefined || ownerId === actorId
}

/** The permission to which a denied action maps, for user-facing messages. */
export type PermissionDenial =
  | { kind: 'data-edit' }
  | { kind: 'manage-budgets' }
  | { kind: 'manage-investments' }

/** i18n key base describing why an action is not allowed for a role. */
export function permissionDenialKind(kind: PermissionDenial['kind']): string {
  switch (kind) {
    case 'data-edit':
      return 'permission.dataEdit'
    case 'manage-budgets':
      return 'permission.manageBudgets'
    case 'manage-investments':
      return 'permission.manageInvestments'
  }
}