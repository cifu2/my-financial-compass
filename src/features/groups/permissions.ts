import type { GroupRole } from './types'
import { roleAtLeast } from './types'

/**
 * Group-level capability model backing the future permissions system (MYF-27).
 *
 * Capabilities express *what* a role may do inside a group, independent of
 * *which* group data is affected. The UI gates buttons/actions through
 * {@link can}, and the service layer already enforces the same rules on every
 * mutation — so the UI check is a convenience, never a security boundary.
 *
 * When MYF-27 lands, this map becomes the deliverable/reference permission
 * set; additional scopes (e.g. category-level editing) extend the enum and
 * this table without changing the storage contract.
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

/**
 * Capabilities granted per role. The map is intentionally declarative:
 * promote a capability and every consumer (service + UI) picks it up.
 */
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
  ],
  member: ['group.view', 'member.view', 'data.view', 'data.edit'],
  readonly: ['group.view', 'member.view', 'data.view'],
}

/** Whether `role` may perform `capability`. */
export function can(role: GroupRole, capability: GroupCapability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability)
}

/** Whether `role` has at least the same level as `minRole`. */
export function meetsRole(role: GroupRole, minRole: GroupRole): boolean {
  return roleAtLeast(role, minRole)
}