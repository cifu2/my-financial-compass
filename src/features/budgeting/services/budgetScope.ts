import type { Budget, BudgetContext, MemberSpend } from '../types'
import { loadGroupSnapshot } from '../../groups/services/groupStore'
import { loadAuthSnapshot } from '../../auth/services/authStore'

/**
 * Resolves the members of a group together with their display names so the
 * budget dashboard can aggregate the consumption of the whole group and break
 * it down per member (HU-0.8).
 *
 * Read-only, synchronous and defensive: unknown ids drop out quietly. A future
 * backend replaces these reads with profile calls without touching the UI.
 */

export interface GroupMemberInfo {
  userId: string
  name: string
}

/** Members of a group (for group budgets), best-effort name resolution. */
export function groupMembers(groupId: string): GroupMemberInfo[] {
  const snapshot = loadGroupSnapshot()
  const auth = loadAuthSnapshot()
  const nameFor = new Map(auth.users.map((u) => [u.id, u.name]))
  return snapshot.members
    .filter((m) => m.groupId === groupId)
    .map((m) => ({
      userId: m.userId,
      name: nameFor.get(m.userId) ?? m.userId.slice(0, 8),
    }))
}

/** Convenience: group budget context options the calculator needs. */
export function groupBudgetOptions(groupId: string, currentUserId: string | null) {
  if (groupId === '' || groupId == null) {
    return { currentUserId, memberIds: new Set<string>(), memberNames: new Map<string, string>() }
  }
  const members = groupMembers(groupId)
  return {
    currentUserId,
    memberIds: new Set(members.map((m) => m.userId)),
    memberNames: new Map(members.map((m) => [m.userId, m.name])),
  }
}

/** True when the viewer belongs to the group (can see its shared budgets). */
export function isGroupMember(groupId: string, currentUserId: string | null): boolean {
  if (currentUserId === null) return false
  return groupMembers(groupId).some((m) => m.userId === currentUserId)
}

export type { Budget, BudgetContext, MemberSpend }