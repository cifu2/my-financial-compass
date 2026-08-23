import { loadGroupSnapshot } from '../../groups/services/groupStore'
import { loadAuthSnapshot } from '../../auth/services/authStore'
import type { GroupRole } from '../../groups/types'
import { can } from '../../groups/permissions'

/**
 * Transaction group context (HU-0.6, MYF-22).
 *
 * The transactions page needs a small, synchronous slice of the groups/auth
 * stores so the form can offer a context selector (personal vs. one of the
 * member's groups) and the list can label rows with their origin and creator,
 * without async plumbing. It reads the same persisted snapshots the async
 * services use, so it never drifts from what `groupService` would return.
 *
 * Following the established pattern (see `investmentGroupContext`), the data
 * below is the *current session user's* view; a session switch is handled by
 * the UI by keying on the resolved user id.
 */

export interface TransactionGroupOption {
  id: string
  name: string
  /** Whether the actor may create/edit transactions in this group (HU-0.10). */
  canEdit: boolean
  role: GroupRole
}

export interface CreatorLookup {
  name: string
  isSelf: boolean
}

/** Groups the user belongs to, ordered by name, with edit capability. */
export function transactionGroupsFor(userId: string): TransactionGroupOption[] {
  const snapshot = loadGroupSnapshot()
  const memberIds = new Set(
    snapshot.members.filter((m) => m.userId === userId).map((m) => m.groupId),
  )
  return snapshot.groups
    .filter((g) => memberIds.has(g.id))
    .map((g) => {
      const member = snapshot.members.find(
        (m) => m.groupId === g.id && m.userId === userId,
      )
      return {
        id: g.id,
        name: g.name,
        role: member?.role ?? 'member',
        canEdit: member ? can(member.role, 'data.edit') : false,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Name of a group, or `null` when it no longer exists. */
export function transactionGroupName(groupId: string): string | null {
  const snapshot = loadGroupSnapshot()
  return snapshot.groups.find((g) => g.id === groupId)?.name ?? null
}

/**
 * Resolves who created a transaction (`transaction.userId`) to a display
 * label like "Añadido por Ana". Personal rows without an owner resolve to the
 * current user. Falls back to a short id prefix rather than failing.
 */
export function transactionCreatorFor(
  userId: string,
  currentUserId: string | null,
): CreatorLookup {
  if (userId === currentUserId) return { name: '', isSelf: true }
  const auth = loadAuthSnapshot()
  const direct = auth.users.find((u) => u.id === userId)
  if (direct) return { name: direct.name, isSelf: false }
  return { name: userId.slice(0, 8), isSelf: false }
}