import { loadGroupSnapshot } from '../../groups/services/groupStore'
import { loadAuthSnapshot } from '../../auth/services/authStore'
import type { CurrencyCode } from '../../dashboard/services/currency'

/**
 * Investment group context (HU-0.9).
 *
 * The investments page needs a small, synchronous slice of the groups/auth
 * stores to render the context selector and the ownership editor without
 * async plumbing: which groups the user belongs to (to pick a scope), the
 * group's reporting currency, and the group members (with display names). It
 * reads the same persisted snapshots the async services use, so the data never
 * drifts from what `groupService` would return.
 */

export interface InvestmentGroupScope {
  id: string
  name: string
  currency: CurrencyCode
  memberCount: number
}

export interface GroupMemberLookup {
  userId: string
  name: string
}

/** Groups the user belongs to, ordered by name. */
export function investmentGroupsFor(userId: string): InvestmentGroupScope[] {
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

/** Members of a group joined with display names from the auth store. */
export function investmentGroupMembers(groupId: string): GroupMemberLookup[] {
  const snapshot = loadGroupSnapshot()
  const auth = loadAuthSnapshot()
  const names = new Map(auth.users.map((u) => [u.id, u.name]))
  return snapshot.members
    .filter((m) => m.groupId === groupId)
    .map((m) => ({
      userId: m.userId,
      name: names.get(m.userId) ?? m.userId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** The reporting currency for a context (falls back to EUR). */
export function scopeCurrency(
  userId: string,
  groupId: string | undefined,
): CurrencyCode {
  if (groupId === undefined) {
    const auth = loadAuthSnapshot()
    const user = auth.users.find((u) => u.id === userId)
    const currency = user?.currency
    return isCurrencyLike(currency) ? currency : 'EUR'
  }
  const snapshot = loadGroupSnapshot()
  const group = snapshot.groups.find((g) => g.id === groupId)
  return group && isCurrencyLike(group.currency) ? group.currency : 'EUR'
}

function isCurrencyLike(value: unknown): value is CurrencyCode {
  return (
    typeof value === 'string' &&
    ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'SEK', 'CNY', 'BRL', 'INR', 'MXN'].includes(value)
  )
}