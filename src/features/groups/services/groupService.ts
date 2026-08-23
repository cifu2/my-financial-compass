import type { CurrencyCode } from '../../dashboard/services/currency'
import type {
  Group,
  GroupMember,
  GroupRole,
  GroupSnapshot,
  Invitation,
  MemberProfile,
  MyGroup,
} from '../types'
import {
  defaultGroupPalette,
  GROUP_COLORS,
  GROUP_ICONS,
  INVITATION_TTL_DAYS,
  isValidGroupRole,
  roleAtLeast,
} from '../types'
import type { GroupSettings } from '../permissions'
import {
  loadGroupSnapshot,
  newGroupId,
  newInvitationToken,
  persistGroupSnapshot,
} from './groupStore'
import { recordGroupActivity } from './groupActivity'
import { loadAuthSnapshot } from '../../auth/services/authStore'

/**
 * Domain service for the multiuser/groups model (see ADR-0008).
 *
 * Every operation loads the persisted snapshot, applies the change and writes
 * it back, exactly like a REST backend would — so a future swap to a real API
 * only re-implements this module. Public entry points are async by design.
 *
 * ### Integrity & permissions
 *
 * - **Admin invariant**: a group always has at least one `admin`. Operations
 *   that would remove or demote the last admin are rejected, including
 *   leaving the group, deleting a member, demoting a role, and archiving a
 *   group that still has other members.
 * - **Authorization**: only admins may add/remove members, change roles,
 *   invite, edit, archive or delete the group. Any authenticated user may
 *   create a group (becoming its first admin) or leave one. `readonly`
 *   members keep data visible but cannot change it.
 * - **Audit trail (HU-0.11)**: every relevant mutation records a
 *   {@link GroupActivity} row via `recordGroupActivity`, so members can trace
 *   who changed what. Deleting/archiving a group first posts a notice entry
 *   for each member (the local-first equivalent of "notifying members").
 * - Validations live here (not in the UI): known currencies, palette values,
 *   role/status whitelists, unique group names per user, single pending
 *   invitation per (group, email).
 */

export type GroupFailureCode =
  | 'name-required'
  | 'group-name-taken'
  | 'not-found'
  | 'already-member'
  | 'not-a-member'
  | 'not-admin'
  | 'last-admin'
  | 'email-invalid'
  | 'invalid-role'
  | 'invalid-icon'
  | 'invalid-color'
  | 'invalid-currency'
  | 'invitation-exists'
  | 'invitation-not-pending'
  | 'group-not-empty'
  | 'storage'

export class GroupError extends Error {
  readonly code: GroupFailureCode

  constructor(code: GroupFailureCode, message: string) {
    super(message)
    this.name = 'GroupError'
    this.code = code
  }
}

export type GroupResult<T> = { ok: true; data: T } | { ok: false; error: GroupError }

const ok = <T,>(data: T): GroupResult<T> => ({ ok: true, data })
const fail = <T,>(code: GroupFailureCode, message: string): GroupResult<T> => ({
  ok: false,
  error: new GroupError(code, message),
})

/** Human-facing message for the failure code (Spanish UI default). */
export function groupErrorMessage(code: GroupFailureCode): string {
  switch (code) {
    case 'name-required':
      return 'El grupo necesita un nombre.'
    case 'group-name-taken':
      return 'Ya tienes un grupo con este nombre.'
    case 'not-found':
      return 'Grupo no encontrado.'
    case 'already-member':
      return 'Este usuario ya pertenece al grupo.'
    case 'not-a-member':
      return 'Este usuario no pertenece al grupo.'
    case 'not-admin':
      return 'Solo los administradores pueden hacer esto.'
    case 'last-admin':
      return 'El grupo siempre debe tener al menos un administrador.'
    case 'email-invalid':
      return 'Introduce un email válido.'
    case 'invalid-role':
      return 'Rol no válido.'
    case 'invalid-icon':
      return 'Icono no válido.'
    case 'invalid-color':
      return 'Color no válido.'
    case 'invalid-currency':
      return 'Divisa no válida.'
    case 'invitation-exists':
      return 'Ya existe una invitación pendiente para este email en este grupo.'
    case 'invitation-not-pending':
      return 'La invitación ya fue resuelta o expiró.'
    case 'group-not-empty':
      return 'El grupo debe quedar vacío antes de borrarlo.'
    default:
      return 'No se pudo completar la operación.'
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

function findGroup(snapshot: GroupSnapshot, groupId: string): Group | undefined {
  return snapshot.groups.find((g) => g.id === groupId)
}

function findMember(
  snapshot: GroupSnapshot,
  groupId: string,
  userId: string,
): GroupMember | undefined {
  return snapshot.members.find((m) => m.groupId === groupId && m.userId === userId)
}

/** Count of admin members in a group. */
export function adminCount(snapshot: GroupSnapshot, groupId: string): number {
  return snapshot.members.filter(
    (m) => m.groupId === groupId && m.role === 'admin',
  ).length
}

/** Whether `userId` is a member of `groupId` with at least `minRole`. */
export function hasRole(
  snapshot: GroupSnapshot,
  groupId: string,
  userId: string,
  minRole: GroupRole = 'readonly',
): boolean {
  const member = findMember(snapshot, groupId, userId)
  return member !== undefined && roleAtLeast(member.role, minRole)
}

/** User-facing view of a group with the requester's role and member count. */
export function toMyGroup(
  snapshot: GroupSnapshot,
  group: Group,
  userId: string,
): MyGroup {
  const member = findMember(snapshot, group.id, userId)
  return {
    ...group,
    role: member?.role ?? 'readonly',
    memberCount: snapshot.members.filter((m) => m.groupId === group.id).length,
  }
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/** Basic structural email check shared across the module. */
export function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

/** Whether `name` already exists among the user's own groups (case-insensitive). */
function groupNameTaken(
  snapshot: GroupSnapshot,
  ownerId: string,
  name: string,
  excludeGroupId?: string,
): boolean {
  const normalized = name.trim().toLocaleLowerCase()
  return snapshot.groups.some((g) => {
    if (g.id === excludeGroupId) return false
    if (g.createdBy !== ownerId) return false
    return g.name.trim().toLocaleLowerCase() === normalized
  })
}

/** Maps an arbitrary string to a known {@link CurrencyCode} or `null`. */
function normalizeCurrency(value: string): CurrencyCode | null {
  const known: readonly string[] = [
    'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'SEK', 'CNY', 'BRL', 'INR', 'MXN',
  ]
  return known.includes(value) ? (value as CurrencyCode) : null
}

// ---------------------------------------------------------------------------
// Groups CRUD
// ---------------------------------------------------------------------------

export interface CreateGroupInput {
  name: string
  description?: string
  icon?: string
  color?: string
  currency?: string
  settings?: GroupSettings
}

/** Creates a group owned by `createdBy`, who becomes its first admin. */
export async function createGroup(
  ownerId: string,
  input: CreateGroupInput,
): Promise<GroupResult<Group>> {
  const name = input.name.trim()
  if (!name) return fail('name-required', 'El grupo necesita un nombre.')
  const snapshot = loadGroupSnapshot()
  if (groupNameTaken(snapshot, ownerId, name)) {
    return fail('group-name-taken', 'Ya tienes un grupo con este nombre.')
  }
  const currency = normalizeCurrency(input.currency ?? 'EUR')
  if (!currency) return fail('invalid-currency', 'Divisa no válida.')
  if (input.icon !== undefined && !GROUP_ICONS.includes(input.icon)) {
    return fail('invalid-icon', 'Icono no válido.')
  }
  if (input.color !== undefined && !GROUP_COLORS.includes(input.color)) {
    return fail('invalid-color', 'Color no válido.')
  }
  const palette = defaultGroupPalette()
  const now = new Date().toISOString()
  const group: Group = {
    id: newGroupId(),
    name,
    description: (input.description ?? '').trim(),
    icon: input.icon ?? palette.icon,
    color: input.color ?? palette.color,
    currency,
    createdBy: ownerId,
    createdAt: now,
    ...(normalizeSettings(input.settings) ? { settings: normalizeSettings(input.settings) } : {}),
  }
  const admin: GroupMember = {
    groupId: group.id,
    userId: ownerId,
    role: 'admin',
    joinedAt: now,
  }
  snapshot.groups.push(group)
  snapshot.members.push(admin)
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo guardar el grupo.')
  recordGroupActivity({
    groupId: group.id,
    userId: ownerId,
    action: 'group_created',
    details: { group: group.name },
  })
  return ok(group)
}

/** Reads a single group without membership context. */
export async function getGroup(groupId: string): Promise<GroupResult<Group>> {
  const group = findGroup(loadGroupSnapshot(), groupId)
  return group ? ok(group) : fail('not-found', 'Grupo no encontrado.')
}

/** Groups the user belongs to (that is, where they have a membership row). */
export async function listUserGroups(userId: string): Promise<MyGroup[]> {
  const snapshot = loadGroupSnapshot()
  const memberIds = new Set(
    snapshot.members.filter((m) => m.userId === userId).map((m) => m.groupId),
  )
  return snapshot.groups
    .filter((g) => memberIds.has(g.id) && !g.archivedAt)
    .map((g) => toMyGroup(snapshot, g, userId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Active + archived groups of the user (used by group management screens). */
export async function listUserGroupsIncludingArchived(userId: string): Promise<MyGroup[]> {
  const snapshot = loadGroupSnapshot()
  const memberIds = new Set(
    snapshot.members.filter((m) => m.userId === userId).map((m) => m.groupId),
  )
  return snapshot.groups
    .filter((g) => memberIds.has(g.id))
    .map((g) => toMyGroup(snapshot, g, userId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Members of a group joined with display names (for activity renderers). */
export async function listMembersWithNames(
  groupId: string,
): Promise<GroupResult<MemberProfile[]>> {
  const members = await listMembers(groupId)
  if (!members.ok) return members
  const auth = loadAuthSnapshot()
  const names = new Map(auth.users.map((u) => [u.id, u.name]))
  return ok(
    members.data.map((m) => ({
      ...m,
      name: names.get(m.userId) ?? m.name,
    })),
  )
}

export interface UpdateGroupInput {
  name?: string
  description?: string
  icon?: string
  color?: string
  currency?: string
  settings?: GroupSettings
}

/**
 * Normalizes a settings bag, dropping unknown/falsy field types so the domain
 * never stores partial garbage. An empty result returns undefined so callers
 * can decide whether to attach the field at all.
 */
function normalizeSettings(input: GroupSettings | undefined): GroupSettings | undefined {
  if (input === undefined) return undefined
  const settings: GroupSettings = {}
  if (typeof input.membersCanManageBudgets === 'boolean') {
    settings.membersCanManageBudgets = input.membersCanManageBudgets
  }
  if (typeof input.membersCanManageInvestments === 'boolean') {
    settings.membersCanManageInvestments = input.membersCanManageInvestments
  }
  return Object.keys(settings).length > 0 ? settings : undefined
}

/** Updates editable group fields. Only a group admin may edit. */
export async function updateGroup(
  groupId: string,
  actorId: string,
  input: UpdateGroupInput,
): Promise<GroupResult<Group>> {
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden editar el grupo.')
  }
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) return fail('name-required', 'El grupo necesita un nombre.')
    if (groupNameTaken(snapshot, group.createdBy, name, group.id)) {
      return fail('group-name-taken', 'Ya tienes un grupo con este nombre.')
    }
    group.name = name
  }
  if (input.description !== undefined) group.description = input.description.trim()
  if (input.icon !== undefined) {
    if (!GROUP_ICONS.includes(input.icon)) return fail('invalid-icon', 'Icono no válido.')
    group.icon = input.icon
  }
  if (input.color !== undefined) {
    if (!GROUP_COLORS.includes(input.color)) return fail('invalid-color', 'Color no válido.')
    group.color = input.color
  }
  if (input.currency !== undefined) {
    const currency = normalizeCurrency(input.currency)
    if (!currency) return fail('invalid-currency', 'Divisa no válida.')
    group.currency = currency
  }
  if (input.settings !== undefined) {
    const merged: GroupSettings = {
      ...(group.settings ?? {}),
      ...normalizeSettings(input.settings),
    }
    const normalized = normalizeSettings(merged)
    if (normalized) group.settings = normalized
    else delete group.settings
  }
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo guardar el grupo.')
  recordGroupActivity({
    groupId: group.id,
    userId: actorId,
    action: 'group_updated',
    details: { group: group.name },
  })
  return ok(group)
}

/**
 * Hard-deletes a group, its memberships, invitations and activity trail
 * (HU-0.12). Only an admin may delete; the UI enforces the double
 * confirmation and offers archival as a safer alternative. Before removing
 * the group, a `group_delete_notice` entry is posted for every member (the
 * local-first "notify members before deleting" step) and the deletion itself
 * is written to the trail so the action has a trace.
 */
export async function deleteGroup(
  groupId: string,
  actorId: string,
): Promise<GroupResult<null>> {
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden borrar el grupo.')
  }
  const memberIds = snapshot.members
    .filter((m) => m.groupId === groupId)
    .map((m) => m.userId)
  for (const userId of memberIds) {
    recordGroupActivity({
      groupId,
      userId: actorId,
      action: 'group_delete_notice',
      details: { recipientId: userId },
    })
  }
  recordGroupActivity({
    groupId,
    userId: actorId,
    action: 'group_deleted',
    details: { group: group.name },
  })
  snapshot.groups = snapshot.groups.filter((g) => g.id !== groupId)
  snapshot.members = snapshot.members.filter((m) => m.groupId !== groupId)
  snapshot.invitations = snapshot.invitations.filter((i) => i.groupId !== groupId)
  snapshot.activities = snapshot.activities.filter((a) => a.groupId !== groupId)
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo borrar el grupo.')
  return ok(null)
}

/**
 * Archives a group keeping its shared data and activity trail (HU-0.12).
 * Archived groups disappear from the active selectors but stay stored; an
 * admin may restore them later. Every member is posted a notice entry first.
 */
export async function archiveGroup(
  groupId: string,
  actorId: string,
  options: { notify?: boolean } = {},
): Promise<GroupResult<Group>> {
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden archivar el grupo.')
  }
  if (!group.archivedAt) {
    group.archivedAt = new Date().toISOString()
  }
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo archivar el grupo.')
  if (options.notify !== false) {
    for (const userId of snapshot.members
      .filter((m) => m.groupId === groupId)
      .map((m) => m.userId)) {
      recordGroupActivity({
        groupId,
        userId: actorId,
        action: 'group_delete_notice',
        details: { recipientId: userId },
      })
    }
  }
  recordGroupActivity({
    groupId,
    userId: actorId,
    action: 'group_archived',
    details: { group: group.name },
  })
  return ok(group)
}

/** Re-activates an archived group. Admins only. */
export async function restoreGroup(
  groupId: string,
  actorId: string,
): Promise<GroupResult<Group>> {
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden restaurar el grupo.')
  }
  const wasArchived = group.archivedAt !== undefined
  delete group.archivedAt
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo restaurar el grupo.')
  if (wasArchived) {
    recordGroupActivity({
      groupId,
      userId: actorId,
      action: 'group_restored',
      details: { group: group.name },
    })
  }
  return ok(group)
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

/**
 * Adds an existing user to a group (direct add; email invites live below).
 * Only admins may add; the added user's role defaults to `member`.
 */
export async function addMember(
  groupId: string,
  actorId: string,
  userId: string,
  role: GroupRole = 'member',
): Promise<GroupResult<GroupMember>> {
  if (!isValidGroupRole(role)) return fail('invalid-role', 'Rol no válido.')
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden añadir miembros.')
  }
  if (findMember(snapshot, groupId, userId)) {
    return fail('already-member', 'Este usuario ya pertenece al grupo.')
  }
  const member: GroupMember = {
    groupId,
    userId,
    role,
    joinedAt: new Date().toISOString(),
  }
  snapshot.members.push(member)
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo añadir el miembro.')
  recordGroupActivity({
    groupId,
    userId: actorId,
    action: 'member_added',
    details: { targetUserId: userId },
  })
  return ok(member)
}

/** Changes a member's role. Only admins may demote/promote; last admin safe. */
export async function changeMemberRole(
  groupId: string,
  actorId: string,
  userId: string,
  newRole: GroupRole,
): Promise<GroupResult<GroupMember>> {
  if (!isValidGroupRole(newRole)) return fail('invalid-role', 'Rol no válido.')
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden cambiar roles.')
  }
  const member = findMember(snapshot, groupId, userId)
  if (!member) return fail('not-a-member', 'Este usuario no pertenece al grupo.')
  const demotingLastAdmin =
    member.role === 'admin' && newRole !== 'admin' && adminCount(snapshot, groupId) === 1
  if (demotingLastAdmin) return fail('last-admin', 'El grupo debe tener un administrador.')
  member.role = newRole
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo cambiar el rol.')
  recordGroupActivity({
    groupId,
    userId: actorId,
    action: 'role_changed',
    details: { targetUserId: userId, role: newRole },
  })
  return ok(member)
}

/**
 * Removes a member (or the caller leaving the group). Guards the admin
 * invariant: the last admin cannot be removed or leave.
 */
export async function removeMember(
  groupId: string,
  actorId: string,
  userId: string,
): Promise<GroupResult<null>> {
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  const isSelf = actorId === userId
  if (!isSelf && !hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden quitar miembros.')
  }
  const member = findMember(snapshot, groupId, userId)
  if (!member) return fail('not-a-member', 'Este usuario no pertenece al grupo.')
  if (member.role === 'admin' && adminCount(snapshot, groupId) === 1) {
    return fail('last-admin', 'El grupo debe tener un administrador.')
  }
  snapshot.members = snapshot.members.filter(
    (m) => !(m.groupId === groupId && m.userId === userId),
  )
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo quitar el miembro.')
  recordGroupActivity({
    groupId,
    userId: actorId,
    action: 'member_removed',
    details: { targetUserId: userId },
  })
  return ok(null)
}

/** Lists a group's members, oldest join first. Admins may call this. */
export async function listMembers(groupId: string): Promise<GroupResult<MemberProfile[]>> {
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  const members = snapshot.members
    .filter((m) => m.groupId === groupId)
    .map((m) => ({ ...m, email: '', name: '', avatar: '' }))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
  return ok(members)
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export interface CreateInvitationInput {
  email: string
  role?: GroupRole
  ttlDays?: number
}

/** Issues a join invitation for the group. Only admins invite. */
export async function createInvitation(
  groupId: string,
  actorId: string,
  input: CreateInvitationInput,
): Promise<GroupResult<Invitation>> {
  const email = input.email.trim().toLowerCase()
  if (!isEmailLike(email)) return fail('email-invalid', 'Introduce un email válido.')
  const role = input.role ?? 'member'
  if (!isValidGroupRole(role)) return fail('invalid-role', 'Rol no válido.')
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden invitar.')
  }
  const alreadyPending = snapshot.invitations.some(
    (i) => i.groupId === groupId && i.email === email && i.status === 'pending',
  )
  if (alreadyPending) return fail('invitation-exists', 'Invitación pendiente para este email.')
  const now = Date.now()
  const invitation: Invitation = {
    id: newInvitationId(),
    groupId,
    email,
    role,
    status: 'pending',
    token: newInvitationToken(),
    expiresAt: new Date(now + (input.ttlDays ?? INVITATION_TTL_DAYS) * 86400000).toISOString(),
    createdAt: new Date(now).toISOString(),
  }
  snapshot.invitations.push(invitation)
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo crear la invitación.')
  recordGroupActivity({
    groupId,
    userId: actorId,
    action: 'invitation_sent',
    details: { email, role },
  })
  return ok(invitation)
}

function newInvitationId(): string {
  return newGroupId().replace(/^grp-/, 'inv-')
}

/** Lists invitations of a group, newest first. Admins may call this. */
export async function listInvitations(
  groupId: string,
  actorId: string,
): Promise<GroupResult<Invitation[]>> {
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden ver invitaciones.')
  }
  const invitations = snapshot.invitations
    .filter((i) => i.groupId === groupId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return ok(invitations)
}

/** Resolves a join token to its invitation, lazily expiring stale ones. */
export async function findInvitationByToken(token: string): Promise<GroupResult<Invitation>> {
  const snapshot = loadGroupSnapshot()
  const invitation = snapshot.invitations.find((i) => i.token === token)
  if (!invitation) return fail('not-found', 'Invitación no encontrada.')
  if (invitation.status === 'pending' && new Date(invitation.expiresAt).getTime() < Date.now()) {
    invitation.status = 'expired'
    persistGroupSnapshot(snapshot)
  }
  return ok(invitation)
}

/** Accepts a pending invitation, creating a membership for `userId`. */
export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<GroupResult<GroupMember>> {
  const snapshot = loadGroupSnapshot()
  const invitation = snapshot.invitations.find((i) => i.token === token)
  if (!invitation) return fail('not-found', 'Invitación no encontrada.')
  if (invitation.status !== 'pending') {
    return fail('invitation-not-pending', 'La invitación ya fue resuelta o expiró.')
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    invitation.status = 'expired'
    persistGroupSnapshot(snapshot)
    return fail('invitation-not-pending', 'La invitación ha expirado.')
  }
  const group = findGroup(snapshot, invitation.groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  const existing = findMember(snapshot, group.id, userId)
  if (existing) {
    invitation.status = 'accepted'
    persistGroupSnapshot(snapshot)
    return ok(existing)
  }
  const member: GroupMember = {
    groupId: group.id,
    userId,
    role: invitation.role,
    joinedAt: new Date().toISOString(),
  }
  snapshot.members.push(member)
  invitation.status = 'accepted'
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo aceptar la invitación.')
  recordGroupActivity({
    groupId: group.id,
    userId,
    action: 'member_added',
    details: { targetUserId: userId },
  })
  return ok(member)
}

/** Rejects a pending invitation by its token. */
export async function rejectInvitation(token: string): Promise<GroupResult<null>> {
  const snapshot = loadGroupSnapshot()
  const invitation = snapshot.invitations.find((i) => i.token === token)
  if (!invitation) return fail('not-found', 'Invitación no encontrada.')
  if (invitation.status !== 'pending') {
    return fail('invitation-not-pending', 'La invitación ya fue resuelta o expiró.')
  }
  invitation.status = 'rejected'
  const write = persistGroupSnapshot(snapshot)
  if (write) return fail('storage', 'No se pudo rechazar la invitación.')
  return ok(null)
}

/** Revokes a pending invitation (admin only), switching it to `rejected`. */
export async function revokeInvitation(
  groupId: string,
  actorId: string,
  token: string,
): Promise<GroupResult<null>> {
  const snapshot = loadGroupSnapshot()
  const group = findGroup(snapshot, groupId)
  if (!group) return fail('not-found', 'Grupo no encontrado.')
  if (!hasRole(snapshot, groupId, actorId, 'admin')) {
    return fail('not-admin', 'Solo los administradores pueden cancelar invitaciones.')
  }
  const invitation = snapshot.invitations.find(
    (i) => i.token === token && i.groupId === groupId,
  )
  if (!invitation) return fail('not-found', 'Invitación no encontrada.')
  if (invitation.status === 'pending') {
    invitation.status = 'rejected'
    const write = persistGroupSnapshot(snapshot)
    if (write) return fail('storage', 'No se pudo cancelar la invitación.')
  }
  return ok(null)
}

/** Promotes an existing member of a group to `admin` (admin-only action). */
export async function promoteToAdmin(
  groupId: string,
  actorId: string,
  userId: string,
): Promise<GroupResult<GroupMember>> {
  return changeMemberRole(groupId, actorId, userId, 'admin')
}