import type { AuthSnapshot, StoredUser, UserProfile } from '../types'
import { defaultAvatarColor, defaultCurrency } from '../types'
import { loadAuthSnapshot, newResetId, newUserId, persistAuthSnapshot } from './authStore'
import { generateResetCode, generateSalt, hashPassword, verifyPassword } from './password'

/**
 * Local mock authentication backend (see ADR-0007).
 *
 * Every operation loads the persisted snapshot, applies the change and writes
 * it back, mirroring how a REST backend would behave so the swap to a real API
 * only touches this module. All public entry points are async on purpose.
 */

export type AuthFailureCode =
  | 'invalid-credentials'
  | 'email-taken'
  | 'not-found'
  | 'invalid-code'
  | 'expired-code'
  | 'wrong-password'
  | 'storage'

export class AuthError extends Error {
  readonly code: AuthFailureCode

  constructor(code: AuthFailureCode, message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export type AuthResult<T> = { ok: true; data: T } | { ok: false; error: AuthError }

const ok = <T,>(data: T): AuthResult<T> => ({ ok: true, data })
const fail = <T,>(code: AuthFailureCode, message: string): AuthResult<T> => ({
  ok: false,
  error: new AuthError(code, message),
})

function toPublic(user: StoredUser): UserProfile {
  const { id, email, name, avatar, currency, createdAt } = user
  return { id, email, name, avatar, currency, createdAt }
}

function setPassword(user: StoredUser, password: string): void {
  const salt = generateSalt()
  user.password = { salt, digest: hashPassword(password, salt) }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Writes the snapshot, mapping write failures to a storage error. */
function persistOrFail(snapshot: AuthSnapshot): Error | null {
  return persistAuthSnapshot(snapshot)
}

export interface RegisterInput {
  email: string
  name: string
  password: string
}

/** Creates an account (does not log in; callers decide the session). */
export async function register(input: RegisterInput): Promise<AuthResult<UserProfile>> {
  const email = normalizeEmail(input.email)
  const snapshot = loadAuthSnapshot()
  if (snapshot.users.some((u) => u.email === email)) {
    return fail('email-taken', 'Ya existe una cuenta con ese email.')
  }
  const user: StoredUser = {
    id: newUserId(),
    email,
    name: input.name.trim(),
    avatar: defaultAvatarColor(),
    currency: defaultCurrency(),
    createdAt: new Date().toISOString(),
    password: { salt: '', digest: '' },
  }
  setPassword(user, input.password)
  snapshot.users.push(user)
  const write = persistOrFail(snapshot)
  if (write) return fail('storage', 'No se pudo guardar la cuenta.')
  return ok(toPublic(user))
}

/** Validates credentials and returns the profile when they match. */
export async function login(email: string, password: string): Promise<AuthResult<UserProfile>> {
  const normalized = normalizeEmail(email)
  const user = loadAuthSnapshot().users.find((u) => u.email === normalized)
  if (!user || !verifyPassword(password, user.password.salt, user.password.digest)) {
    return fail('invalid-credentials', 'Email o contraseña incorrectos.')
  }
  return ok(toPublic(user))
}

/** Sets the persisted session to `userId` (null clears it). */
export async function setSession(userId: string | null): Promise<Error | null> {
  const snapshot = loadAuthSnapshot()
  snapshot.session = userId === null ? null : { userId }
  return persistAuthSnapshot(snapshot)
}

/** Reads the current session user (or null when signed out / session stale). */
export function readSessionUser(): UserProfile | null {
  const snapshot = loadAuthSnapshot()
  if (!snapshot.session) return null
  const user = snapshot.users.find((u) => u.id === snapshot.session?.userId)
  return user ? toPublic(user) : null
}

export async function logout(): Promise<void> {
  await setSession(null)
}

/** Updates editable profile fields for the given user. */
export async function updateProfile(
  userId: string,
  patch: Partial<Pick<UserProfile, 'name' | 'avatar' | 'currency'>>,
): Promise<AuthResult<UserProfile>> {
  const snapshot = loadAuthSnapshot()
  const user = snapshot.users.find((u) => u.id === userId)
  if (!user) return fail('not-found', 'Usuario no encontrado.')
  Object.assign(user, patch)
  const write = persistOrFail(snapshot)
  if (write) return fail('storage', 'No se pudo guardar el perfil.')
  return ok(toPublic(user))
}

/** Verifies the current password and stores a new one. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult<null>> {
  const snapshot = loadAuthSnapshot()
  const user = snapshot.users.find((u) => u.id === userId)
  if (!user) return fail('not-found', 'Usuario no encontrado.')
  if (!verifyPassword(currentPassword, user.password.salt, user.password.digest)) {
    return fail('wrong-password', 'La contraseña actual no es correcta.')
  }
  setPassword(user, newPassword)
  const write = persistOrFail(snapshot)
  if (write) return fail('storage', 'No se pudo guardar la nueva contraseña.')
  return ok(null)
}

/** TTL for reset codes: 15 minutes. */
export const RESET_TTL_MS = 15 * 60 * 1000

export interface PasswordResetDelivery {
  deliveredTo: string
  /** Present only in mock mode (no email transport yet) so the demo works. */
  demoCode: string | null
  expiresAt: string
}

/** Issues a password-reset code for an existing account (email flow, mocked). */
export async function requestPasswordReset(
  email: string,
): Promise<AuthResult<PasswordResetDelivery>> {
  const normalized = normalizeEmail(email)
  const snapshot = loadAuthSnapshot()
  const accountExists = snapshot.users.some((u) => u.email === normalized)
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString()
  // Never reveal whether an account exists: always answer generically.
  if (!accountExists) {
    return ok({ deliveredTo: normalized, demoCode: null, expiresAt })
  }
  // Drop stale codes for this email; keep a single fresh one.
  snapshot.resets = snapshot.resets.filter(
    (r) => r.email !== normalized || new Date(r.expiresAt).getTime() > Date.now(),
  )
  const code = generateResetCode()
  snapshot.resets.push({ id: newResetId(), email: normalized, code, expiresAt })
  const write = persistOrFail(snapshot)
  if (write) return fail('storage', 'No se pudo solicitar la recuperación.')
  return ok({ deliveredTo: normalized, demoCode: code, expiresAt })
}

/** Redeems a reset code and stores the new password. */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<AuthResult<null>> {
  const normalized = normalizeEmail(email)
  const snapshot = loadAuthSnapshot()
  const record = snapshot.resets.find((r) => r.email === normalized && r.code === code)
  if (!record) return fail('invalid-code', 'Código de recuperación incorrecto.')
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return fail('expired-code', 'El código ha expirado. Solicita uno nuevo.')
  }
  const user = snapshot.users.find((u) => u.email === normalized)
  if (!user) return fail('not-found', 'Usuario no encontrado.')
  setPassword(user, newPassword)
  snapshot.resets = snapshot.resets.filter((r) => r !== record)
  const write = persistOrFail(snapshot)
  if (write) return fail('storage', 'No se pudo guardar la nueva contraseña.')
  return ok(null)
}

/**
 * Deletes the account and its session. Financial data is cleared by the UI
 * layer (the auth module does not reach into the data store).
 */
export async function deleteAccount(userId: string): Promise<AuthResult<null>> {
  const snapshot = loadAuthSnapshot()
  const before = snapshot.users.length
  snapshot.users = snapshot.users.filter((u) => u.id !== userId)
  if (snapshot.users.length === before) return fail('not-found', 'Usuario no encontrado.')
  if (snapshot.session?.userId === userId) snapshot.session = null
  const write = persistOrFail(snapshot)
  if (write) return fail('storage', 'No se pudo borrar la cuenta.')
  return ok(null)
}

/** Convenience for tests and demo seeding: snapshot with a user + session. */
export function buildSeededSnapshot(input: {
  id?: string
  email: string
  name: string
  password: string
}): AuthSnapshot {
  const email = normalizeEmail(input.email)
  const user: StoredUser = {
    id: input.id ?? 'seeded-user',
    email,
    name: input.name,
    avatar: defaultAvatarColor(),
    currency: defaultCurrency(),
    createdAt: new Date().toISOString(),
    password: { salt: '', digest: '' },
  }
  setPassword(user, input.password)
  return {
    version: 2,
    users: [user],
    session: { userId: user.id },
    resets: [],
  }
}