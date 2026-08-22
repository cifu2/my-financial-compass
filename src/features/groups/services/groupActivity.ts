import type { GroupActivity, GroupActivityKind } from '../types'
import { GROUP_ACTIVITY_KINDS, MAX_ACTIVITY_PER_GROUP } from '../types'
import { loadGroupSnapshot, newGroupId, persistGroupSnapshot } from './groupStore'
import { loadAuthSnapshot } from '../../auth/services/authStore'

/**
 * Audit trail of group actions (HU-0.11).
 *
 * Domain services (membership, ledger, settlements, budgets, investments) call
 * {@link recordGroupActivity} on every relevant mutation; the UI only reads
 * through {@link listGroupActivities}. The trail is append-only, kept per
 * group, trimmed to {@link MAX_ACTIVITY_PER_GROUP} rows to bound the key size
 * in localStorage while preserving the recent, most useful history.
 *
 * A future backend turns this into a proper events table (`group_activity`);
 * the shape (`groupId`, `userId`, `action`, `details`, `timestamp`) is the
 * column list of that table.
 */
export interface ActivityEntry {
  groupId: string
  /** Actor id; defaults to the caller's session user when omitted. */
  userId?: string
  action: GroupActivityKind
  details?: Record<string, string | number | boolean | undefined>
}

export interface ActivityFilter {
  /** Restrict to one member (actor id). */
  memberId?: string
  /** Restrict to one action kind. */
  action?: GroupActivityKind
}

/** Maximum entries returned by {@link listGroupActivity}. */
export const ACTIVITY_PAGE_SIZE = 200

/** Records one activity row for a group. Never throws (storage failures log). */
export function recordGroupActivity(entry: ActivityEntry): void {
  const snapshot = loadGroupSnapshot()
  const now = new Date().toISOString()
  const row: GroupActivity = {
    id: newGroupId().replace('grp-', 'act-'),
    groupId: entry.groupId,
    userId: entry.userId ?? 'system',
    action: entry.action,
    details: entry.details ?? {},
    timestamp: now,
  }
  const group = snapshot.groups.find((g) => g.id === entry.groupId)
  if (!group) return // never record for a group that does not exist
  snapshot.activities.push(row)
  if (snapshot.activities.length > MAX_ACTIVITY_PER_GROUP) {
    snapshot.activities = snapshot.activities.slice(-MAX_ACTIVITY_PER_GROUP)
  }
  persistGroupSnapshot(snapshot)
}

/** All activity of a group, newest first, optionally filtered. */
export function listGroupActivity(
  groupId: string,
  filter?: ActivityFilter,
): GroupActivity[] {
  const snapshot = loadGroupSnapshot()
  return snapshot.activities
    .filter((a) => a.groupId === groupId)
    .filter((a) => (filter?.memberId ? a.userId === filter.memberId : true))
    .filter((a) => (filter?.action ? a.action === filter.action : true))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, ACTIVITY_PAGE_SIZE)
}

/** Ordered list of action kinds the activity page offers as filter options. */
export function activityKinds(): readonly GroupActivityKind[] {
  return GROUP_ACTIVITY_KINDS
}

/** Newest activity entry of a group, or null when the group has none. */
export function lastGroupActivity(groupId: string): GroupActivity | null {
  const list = listGroupActivity(groupId)
  return list[0] ?? null
}

/** Distinct member ids present in the group's activity trail. */
export function activityMembers(groupId: string): string[] {
  const snapshot = loadGroupSnapshot()
  const seen = new Set<string>()
  for (const a of snapshot.activities) {
    if (a.groupId === groupId && a.userId !== 'system') seen.add(a.userId)
  }
  return Array.from(seen)
}

/** Snapshot helpers for the activity screen (members + reporting currency). */
export interface ActivityGroupContext {
  id: string
  name: string
  archived: boolean
  currency: string
  /** Members with display names resolved (fallback = short user id). */
  members: Array<{ userId: string; name: string }>
  names: Map<string, string>
}

/** Read-only context the activity page and the delete dialog consume. */
export function groupActivityContext(groupId: string): ActivityGroupContext | null {
  const snapshot = loadGroupSnapshot()
  const group = snapshot.groups.find((g) => g.id === groupId)
  if (!group) return null
  const auth = loadAuthSnapshot()
  const displayNames = new Map(auth.users.map((u) => [u.id, u.name]))
  const members = snapshot.members
    .filter((m) => m.groupId === groupId)
    .map((m) => ({
      userId: m.userId,
      name: displayNames.get(m.userId) ?? m.userId.slice(0, 8),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    id: group.id,
    name: group.name,
    archived: group.archivedAt !== undefined,
    currency: group.currency,
    members,
    names: new Map(members.map((m) => [m.userId, m.name])),
  }
}