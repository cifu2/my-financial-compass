import type { AuthSnapshot, StoredUser } from '../types'

/**
 * Persistence for the local mock auth backend (see ADR-0007).
 *
 * The snapshot lives in its own localStorage key, separate from the financial
 * store, so session/handling decisions never tangle with ledger data. Every
 * function is synchronous and defensive (never throws); a future backend
 * replaces these calls inside `authService` without touching the UI.
 */

/** Storage key. The auth schema is independent from the data schema. */
export const AUTH_STORAGE_KEY = 'my-financial-compass:auth:v1'

/** Schema version stored inside the payload. */
export const AUTH_SNAPSHOT_VERSION = 2 as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function newUserId(): string {
  return uid('usr')
}

export function newResetId(): string {
  return uid('rst')
}

export function emptyAuthSnapshot(): AuthSnapshot {
  return { version: AUTH_SNAPSHOT_VERSION, users: [], session: null, resets: [] }
}

/** Parse a persisted auth blob strictly. Returns null when unreadable. */
export function parseAuthSnapshot(raw: string): AuthSnapshot | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.version !== AUTH_SNAPSHOT_VERSION) return null
  const users = (Array.isArray(parsed.users) ? parsed.users : [])
    .map(storedUserFrom)
    .filter((u): u is StoredUser => u !== null)
  const session = isRecord(parsed.session) && isString(parsed.session.userId)
    ? { userId: parsed.session.userId }
    : null
  const resets = (Array.isArray(parsed.resets) ? parsed.resets : [])
    .map((r) => {
      if (!isRecord(r)) return null
      const { id, email, code, expiresAt } = r
      if (!isString(id) || !isString(email) || !isString(code) || !isString(expiresAt)) {
        return null
      }
      return { id, email, code, expiresAt }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  return { version: AUTH_SNAPSHOT_VERSION, users, session, resets }
}

function storedUserFrom(value: unknown): StoredUser | null {
  if (!isRecord(value)) return null
  const { id, email, name, avatar, currency, createdAt, password } = value
  if (
    !isString(id) ||
    !isString(email) ||
    !isString(name) ||
    !isString(avatar) ||
    !isString(currency) ||
    !isString(createdAt)
  ) {
    return null
  }
  if (!isRecord(password)) return null
  const { salt, digest } = password
  if (!isString(salt) || !isString(digest)) return null
  return { id, email, name, avatar, currency, createdAt, password: { salt, digest } }
}

/** Load and parse the persisted session snapshot. Never throws. */
export function loadAuthSnapshot(): AuthSnapshot {
  if (typeof localStorage === 'undefined') return emptyAuthSnapshot()
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (raw === null) return emptyAuthSnapshot()
  return parseAuthSnapshot(raw) ?? emptyAuthSnapshot()
}

/** Serialize and persist the snapshot. Returns a storage error or null. */
export function persistAuthSnapshot(snapshot: AuthSnapshot): Error | null {
  if (typeof localStorage === 'undefined') return null
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot))
    return null
  } catch (error) {
    console.warn('[auth] no se pudo guardar la sesión', error)
    return error instanceof Error ? error : new Error('no se pudo guardar la sesión')
  }
}

/** Drop the whole auth snapshot (used by account deletion and tests). */
export function clearAuthSnapshot(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}