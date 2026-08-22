import type {
  Group,
  GroupMember,
  GroupSnapshot,
  Invitation,
  InvitationStatus,
} from '../types'
import { isValidGroupRole, isValidInvitationStatus } from '../types'
import type { CurrencyCode } from '../../dashboard/services/currency'

/**
 * Persistence for the groups/multiuser store (see ADR-0008).
 *
 * The snapshot lives in its own localStorage key, separate from the financial
 * store and the auth snapshot, so group membership state never tangles with
 * ledger data. Mirrors the `authStore` conventions: synchronous, defensive
 * (never throws), strict parsing that drops individual corrupt rows and a
 * schema `version` that invalidates incompatible payloads. A future database
 * replaces the `load`/`persist` pair inside `groupService` without touching
 * the domain layer.
 */

export const GROUP_STORAGE_KEY = 'my-financial-compass:groups:v1'

/** Schema version stored inside the payload. */
export const GROUP_SNAPSHOT_VERSION = 1 as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

/** Collision-resistant-ish ids (adequate for a local-only MVP). */
export function newGroupId(): string {
  return `grp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function newInvitationToken(): string {
  const raw = cryptoAvailable()
    ? crypto.getRandomValues(new Uint8Array(12))
    : randomFallback(12)
  return Array.from(raw, (b) => b.toString(16).padStart(2, '0')).join('')
}

function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
}

function randomFallback(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  return bytes
}

export function emptyGroupSnapshot(): GroupSnapshot {
  return { version: GROUP_SNAPSHOT_VERSION, groups: [], members: [], invitations: [] }
}

function groupFrom(value: unknown): Group | null {
  if (!isRecord(value)) return null
  const {
    id,
    name,
    description,
    icon,
    color,
    currency,
    createdBy,
    createdAt,
  } = value
  if (
    !isString(id) ||
    !isString(name) ||
    !isString(description) ||
    !isString(icon) ||
    !isString(color) ||
    !isString(currency) ||
    !isString(createdBy) ||
    !isString(createdAt)
  ) {
    return null
  }
  return {
    id,
    name,
    description,
    icon,
    color,
    currency: currency as CurrencyCode,
    createdBy,
    createdAt,
  }
}

function memberFrom(value: unknown): GroupMember | null {
  if (!isRecord(value)) return null
  const { groupId, userId, role, joinedAt } = value
  if (!isString(groupId) || !isString(userId) || !isValidGroupRole(role) || !isString(joinedAt)) {
    return null
  }
  return { groupId, userId, role, joinedAt }
}

function invitationFrom(value: unknown): Invitation | null {
  if (!isRecord(value)) return null
  const { id, groupId, email, role, status, token, expiresAt, createdAt } = value
  const statusValue: unknown = status
  if (
    !isString(id) ||
    !isString(groupId) ||
    !isString(email) ||
    !isValidGroupRole(role) ||
    !isValidInvitationStatus(statusValue) ||
    !isString(token) ||
    !isString(expiresAt) ||
    !isString(createdAt)
  ) {
    return null
  }
  return {
    id,
    groupId,
    email,
    role,
    status: statusValue as InvitationStatus,
    token,
    expiresAt,
    createdAt,
  }
}

/**
 * Parse a persisted groups blob strictly. Rows that fail validation are
 * dropped individually; the snapshot only becomes `null` when the payload is
 * unreadable as JSON or its schema version is unknown.
 */
export function parseGroupSnapshot(raw: string): GroupSnapshot | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.version !== GROUP_SNAPSHOT_VERSION) return null
  const groups = (Array.isArray(parsed.groups) ? parsed.groups : [])
    .map(groupFrom)
    .filter((g): g is Group => g !== null)
  const members = (Array.isArray(parsed.members) ? parsed.members : [])
    .map(memberFrom)
    .filter((m): m is GroupMember => m !== null)
  const invitations = (Array.isArray(parsed.invitations) ? parsed.invitations : [])
    .map(invitationFrom)
    .filter((i): i is Invitation => i !== null)
  return { version: GROUP_SNAPSHOT_VERSION, groups, members, invitations }
}

/** Load and parse the persisted groups snapshot. Never throws. */
export function loadGroupSnapshot(): GroupSnapshot {
  if (typeof localStorage === 'undefined') return emptyGroupSnapshot()
  const raw = localStorage.getItem(GROUP_STORAGE_KEY)
  if (raw === null) return emptyGroupSnapshot()
  return parseGroupSnapshot(raw) ?? emptyGroupSnapshot()
}

/** Serialize and persist the groups snapshot. Returns a storage error or null. */
export function persistGroupSnapshot(snapshot: GroupSnapshot): Error | null {
  if (typeof localStorage === 'undefined') return null
  try {
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(snapshot))
    return null
  } catch (error) {
    console.warn('[groups] no se pudo guardar el estado de grupos', error)
    return error instanceof Error ? error : new Error('no se pudo guardar el estado de grupos')
  }
}

/** Drop the whole groups snapshot (used by resets and tests). */
export function clearGroupSnapshot(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(GROUP_STORAGE_KEY)
  }
}