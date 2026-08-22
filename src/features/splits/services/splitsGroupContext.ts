import { loadGroupSnapshot } from '../../groups/services/groupStore'
import { loadAuthSnapshot } from '../../auth/services/authStore'

/**
 * Splits group context (HU-0.7): the same synchronous slice of the groups and
 * auth stores the investment/budget context helpers read, so the split editor
 * and balances page can resolve member lists, display names and the group's
 * reporting currency without async plumbing. Mirrors `investmentGroupContext`.
 */

export interface SplitGroupScope {
  id: string
  name: string
  currency: string
  memberCount: number
}

export interface GroupMemberLookup {
  userId: string
  name: string
}

/** Groups the user belongs to, ordered by name. */
export function splitGroupsFor(userId: string): SplitGroupScope[] {
  const snapshot = loadGroupSnapshot()
  const memberIds = new Set(
    snapshot.members.filter((m) => m.userId === userId).map((m) => m.groupId),
  )
  return snapshot.groups
    .filter((g) => memberIds.has(g.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      currency: g.currency,
      memberCount: snapshot.members.filter((m) => m.groupId === g.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Members of a group joined with the display names from the auth store. */
export function splitGroupMembers(groupId: string): GroupMemberLookup[] {
  const snapshot = loadGroupSnapshot()
  const auth = loadAuthSnapshot()
  const names = new Map(auth.users.map((u) => [u.id, u.name]))
  return snapshot.members
    .filter((m) => m.groupId === groupId)
    .map((m) => ({
      userId: m.userId,
      name: names.get(m.userId) ?? m.userId.slice(0, 8),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** The reporting currency for the group (falls back to EUR). */
export function groupCurrency(groupId: string): string {
  const group = loadGroupSnapshot().groups.find((g) => g.id === groupId)
  return group && isCurrencyLike(group.currency) ? group.currency : 'EUR'
}

function isCurrencyLike(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    [
      'EUR',
      'USD',
      'GBP',
      'JPY',
      'CHF',
      'CAD',
      'AUD',
      'SEK',
      'CNY',
      'BRL',
      'INR',
      'MXN',
    ].includes(value)
  )
}