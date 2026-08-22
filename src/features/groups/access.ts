import type { Group, GroupRole, GroupSnapshot } from './types'
import { loadGroupSnapshot } from './services/groupStore'
import type { GroupSettings } from './permissions'
import {
  can,
  canDeleteData,
  canEditData,
  canManageGroupBudgets,
  canManageGroupInvestments,
} from './permissions'

/**
 * Synchronous, defensive access model for the *current* user in a group
 * (HU-0.10). Pages read this resolved view to decide what to render and which
 * actions to expose, mirroring the persisted group snapshot just like the
 * async services do.
 *
 * The service layer remains the source of truth; this accessor only answers
 * "what may the signed-in actor do here?" without performing mutations.
 */

export interface GroupAccess {
  /** The actor's role in the group, or `null` when they are not a member. */
  role: GroupRole | null
  isMember: boolean
  isAdmin: boolean
  /** Whether the actor may view the group's shared data at all. */
  canView: boolean
  /** Whether the actor may create/edit the group's shared data rows. */
  canEdit: boolean
  /** Whether the actor may manage the group's shared budgets. */
  canManageBudgets: boolean
  /** Whether the actor may manage the group's shared investments. */
  canManageInvestments: boolean
  /** Whether the actor may invite/expel/change roles (admin-only). */
  canManageMembers: boolean
  /** Whether the group may be deleted by the actor (admin-only). */
  canDeleteGroup: boolean
  /** Resolved per-group settings (merged with role defaults). */
  settings: GroupSettings
  /**
   * Ownership-aware edit/delete check for member-scoped rows
   * (`transaction.userId`, `investment.createdBy`): admins edit any row,
   * members only their own.
   */
  canEditRecord: (ownerId: string | undefined) => boolean
  canDeleteRecord: (ownerId: string | undefined) => boolean
}

/** Role of `userId` inside `groupId` from a snapshot (null when not a member). */
export function roleInGroup(
  snapshot: GroupSnapshot,
  groupId: string,
  userId?: string,
): GroupRole | null {
  if (!userId) return null
  const member = snapshot.members.find((m) => m.groupId === groupId && m.userId === userId)
  return member?.role ?? null
}

/** The group row's settings, or `{}` (role defaults apply) when absent. */
export function groupSettingsFor(
  snapshot: GroupSnapshot,
  groupId: string,
): GroupSettings {
  const group: Group | undefined = snapshot.groups.find((g) => g.id === groupId)
  return group?.settings ?? {}
}

/** Builds the resolved access model for `userId` in `groupId` from a snapshot. */
export function groupAccessForSnapshot(
  snapshot: GroupSnapshot,
  groupId: string,
  userId: string | undefined,
): GroupAccess {
  const role = roleInGroup(snapshot, groupId, userId)
  const settings = groupSettingsFor(snapshot, groupId)
  if (role === null) {
    return {
      role,
      isMember: false,
      isAdmin: false,
      canView: false,
      canEdit: false,
      canManageBudgets: false,
      canManageInvestments: false,
      canManageMembers: false,
      canDeleteGroup: false,
      settings,
      canEditRecord: () => false,
      canDeleteRecord: () => false,
    }
  }
  const actorId = userId ?? ''
  return {
    role,
    isMember: true,
    isAdmin: role === 'admin',
    canView: can(role, 'data.view', settings),
    canEdit: can(role, 'data.edit', settings),
    canManageBudgets: canManageGroupBudgets(role, settings),
    canManageInvestments: canManageGroupInvestments(role, settings),
    canManageMembers: can(role, 'member.add', settings),
    canDeleteGroup: can(role, 'group.delete', settings),
    settings,
    canEditRecord: (ownerId) => canEditData(role, actorId, ownerId, settings),
    canDeleteRecord: (ownerId) => canDeleteData(role, actorId, ownerId, settings),
  }
}

/** Convenience: resolved access for the current session user (persisted state). */
export function groupAccessFor(
  groupId: string,
  userId: string | undefined,
): GroupAccess {
  return groupAccessForSnapshot(loadGroupSnapshot(), groupId, userId)
}