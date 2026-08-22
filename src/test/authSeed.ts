import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'

/**
 * Writes an authenticated session (one user) into localStorage so tests that
 * render the full <App /> boot straight into the dashboard instead of the
 * login gate.
 */
export function seedAuthSession(
  opts: { email?: string; name?: string; password?: string; avatar?: string; currency?: string } = {},
): void {
  const dto = {
    email: opts.email ?? 'ana@test.local',
    name: opts.name ?? 'Ana',
    password: opts.password ?? 'pass1234',
  }
  const snapshot = buildSeededSnapshot(dto)
  if (opts.avatar) snapshot.users[0].avatar = opts.avatar
  if (opts.currency) snapshot.users[0].currency = opts.currency
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot))
}

export const SEED_EMAIL = 'alana@test.local'
export const SEED_PASSWORD = 'pass1234'