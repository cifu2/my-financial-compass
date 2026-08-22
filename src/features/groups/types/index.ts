import type { CurrencyCode } from '../../dashboard/services/currency'

/**
 * Multiuser model (groups) — foundation for shared ledgers.
 *
 * The domain model mirrors a relational design (see ADR-0008) so the storage
 * swap to a database only touches the persistence layer:
 *
 * - `users`       lives in the auth module (id, email, name, avatar,
 *                 mainCurrency, createdAt). Groups only reference `userId`s.
 * - `groups`      1:N `group_members` (via GroupMember.groupId)
 * - `groups`      1:N `invitations`     (via Invitation.groupId)
 * - `users`       1:N `group_members`   (via GroupMember.userId)
 *
 * A **group always has at least one `admin`**; that invariant is enforced by
 * `groupService`, never by callers.
 */

export type GroupRole = 'admin' | 'member' | 'readonly'

/** The four lifecycle states of an invitation link. */
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

/** A shared space users belong to (think "household" / "couple"). */
export interface Group {
  id: string
  name: string
  description: string
  /** Icon key from {@link GROUP_ICONS} (ids, not emojis). */
  icon: string
  /** Color key from {@link GROUP_COLORS} (maps to accessible hex tones). */
  color: string
  /** Reporting currency for shared (group-level) amounts. */
  currency: CurrencyCode
  /** Id of the user who created the group (its first admin). */
  createdBy: string
  createdAt: string
}

/** Row of the join table users ↔ groups. */
export interface GroupMember {
  groupId: string
  userId: string
  role: GroupRole
  joinedAt: string
}

/**
 * Pending join request by email. The invite is "consumed" (accepted/rejected)
 * by whoever opens the link while logged in. Expired invitations stop being
 * acceptable but keep their history for the audit trail.
 */
export interface Invitation {
  id: string
  groupId: string
  email: string
  /** Which role the invitee gets once the invitation is accepted. */
  role: GroupRole
  status: InvitationStatus
  /**
   * Unguessable join token (the shareable part of the link). Served as
   * `…/join?invite={token}` by the UI layer.
   */
  token: string
  /** ISO timestamp; pending invitations past this date are "expired". */
  expiresAt: string
  createdAt: string
}

/**
 * On-disk snapshot for the groups store (localStorage until the relational
 * backend lands). Versioning follows the `storageService`/`authStore` pattern.
 */
export interface GroupSnapshot {
  version: 1
  groups: Group[]
  members: GroupMember[]
  invitations: Invitation[]
}

/** Append-only view of a membership row joined with the current profile. */
export interface MemberProfile extends GroupMember {
  email: string
  name: string
  avatar: string
}

/** Group row enriched with the requesting user's role (for navigation). */
export interface MyGroup extends Group {
  role: GroupRole
  memberCount: number
}

/** Icon palette: semantic ids the UI maps to inline SVGs / glyphs. */
export const GROUP_ICONS: readonly string[] = [
  'home',
  'heart',
  'wallet',
  'chart',
  'users',
  'piggy',
] as const

/** Color palette: WCAG-AA-safe tones for badges and avatars. */
export const GROUP_COLORS: readonly string[] = [
  '#155e75',
  '#4338ca',
  '#0f766e',
  '#9a3412',
  '#6d28d9',
  '#be185d',
]

export const INVITATION_TTL_DAYS = 14

/** Role hierarchy used for comparisons (`admin` outranks `readonly`). */
const ROLE_LEVEL: Record<GroupRole, number> = { admin: 3, member: 2, readonly: 1 }

export function roleAtLeast(role: GroupRole, threshold: GroupRole): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[threshold]
}

export function isValidGroupRole(value: unknown): value is GroupRole {
  return value === 'admin' || value === 'member' || value === 'readonly'
}

export function isValidInvitationStatus(value: unknown): value is InvitationStatus {
  return (
    value === 'pending' ||
    value === 'accepted' ||
    value === 'rejected' ||
    value === 'expired'
  )
}

/** Default group palette values for a fresh group. */
export function defaultGroupPalette(): Pick<Group, 'icon' | 'color'> {
  return { icon: GROUP_ICONS[0], color: GROUP_COLORS[0] }
}