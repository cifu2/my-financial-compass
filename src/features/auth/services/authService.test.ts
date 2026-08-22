import { beforeEach, describe, expect, it } from 'vitest'
import {
  register,
  login,
  logout,
  setSession,
  readSessionUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  confirmPasswordReset,
  deleteAccount,
  normalizeEmail,
} from './authService'
import { AUTH_STORAGE_KEY } from './authStore'

function seed() {
  localStorage.clear()
  // A pre-existing account to log into.
  return register({ email: 'Sara@Correo.es', name: 'Sara', password: 'finanzas2026' })
}

describe('authService (local mock backend, MYF-20)', () => {
  beforeEach(() => localStorage.clear())

  describe('register', () => {
    it('creates a normalized-email account and stores a salted digest', async () => {
      const result = await seed()
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.data.email).toBe('sara@correo.es')
      expect(result.data.name).toBe('Sara')
      expect(result.data.currency).toBe('EUR')
      const snapshot = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '{}')
      const stored = snapshot.users[0]
      expect(stored.password.digest).not.toContain('finanzas2026')
      expect(stored.password.salt).toBeTruthy()
    })

    it('rejects a duplicate email (any casing)', async () => {
      await seed()
      const dup = await register({ email: 'SARA@correo.es', name: 'Otro', password: 'otraPass2026' })
      expect(dup.ok).toBe(false)
      if (!dup.ok) expect(dup.error.code).toBe('email-taken')
    })
  })

  describe('login / session', () => {
    it('logs in with the right credentials and reads the session', async () => {
      await seed()
      const result = await login('sara@correo.es', 'finanzas2026')
      expect(result.ok).toBe(true)
      const session = await setSession(result.ok ? result.data.id : null)
      expect(session).toBeNull()
      expect(readSessionUser()?.email).toBe('sara@correo.es')
    })

    it('rejects a wrong password with invalid-credentials', async () => {
      await seed()
      const result = await login('sara@correo.es', 'mala-password')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('invalid-credentials')
    })

    it('clears the session on logout', async () => {
      await seed()
      const loginResult = await login('sara@correo.es', 'finanzas2026')
      expect(loginResult.ok).toBe(true)
      if (!loginResult.ok) return
      await setSession(loginResult.data.id)
      expect(readSessionUser()).not.toBeNull()
      await logout()
      expect(readSessionUser()).toBeNull()
    })
  })

  describe('profile', () => {
    it('updates name, avatar and currency', async () => {
      await seed()
      const loginResult = await login('sara@correo.es', 'finanzas2026')
      expect(loginResult.ok).toBe(true)
      if (!loginResult.ok) return
      const updated = await updateProfile(loginResult.data.id, {
        name: 'Sara L',
        avatar: '#4338ca',
        currency: 'USD',
      })
      expect(updated.ok).toBe(true)
      if (updated.ok) {
        expect(updated.data.name).toBe('Sara L')
        expect(updated.data.currency).toBe('USD')
        expect(updated.data.avatar).toBe('#4338ca')
      }
    })
  })

  describe('password change', () => {
    it('rejects a wrong current password', async () => {
      await seed()
      const loginResult = await login('sara@correo.es', 'finanzas2026')
      expect(loginResult.ok).toBe(true)
      if (!loginResult.ok) return
      const r = await changePassword(loginResult.data.id, 'equivocada', 'nuevaPass2026')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('wrong-password')
    })

    it('stores the new password when the current one matches', async () => {
      await seed()
      const loginResult = await login('sara@correo.es', 'finanzas2026')
      expect(loginResult.ok).toBe(true)
      if (!loginResult.ok) return
      const r = await changePassword(loginResult.data.id, 'finanzas2026', 'nuevaPass2026')
      expect(r.ok).toBe(true)
      const relogin = await login('sara@correo.es', 'nuevaPass2026')
      expect(relogin.ok).toBe(true)
    })
  })

  describe('password recovery (mock email flow)', () => {
    it('never reveals whether an account exists', async () => {
      await seed()
      const missing = await requestPasswordReset('noexiste@correo.es')
      expect(missing.ok).toBe(true)
      if (missing.ok) expect(missing.data.demoCode).toBeNull()
    })

    it('issues a demo code for an existing account and redeems it', async () => {
      await seed()
      const req = await requestPasswordReset('sara@correo.es')
      expect(req.ok).toBe(true)
      if (!req.ok) return
      expect(req.data.demoCode).toMatch(/^\d{6}$/)
      const bad = await confirmPasswordReset('sara@correo.es', '000000', 'nuevaPass2026')
      expect(bad.ok).toBe(false)
      if (bad.ok) return
      expect(bad.error.code).toBe('invalid-code')

      const good = await confirmPasswordReset('sara@correo.es', req.data.demoCode!, 'nuevaPass2026')
      expect(good.ok).toBe(true)
      const relogin = await login('sara@correo.es', 'nuevaPass2026')
      expect(relogin.ok).toBe(true)
    })
  })

  describe('account deletion', () => {
    it('removes the user and their session', async () => {
      await seed()
      const loginResult = await login('sara@correo.es', 'finanzas2026')
      expect(loginResult.ok).toBe(true)
      if (!loginResult.ok) return
      await setSession(loginResult.data.id)
      expect(readSessionUser()).not.toBeNull()
      const r = await deleteAccount(loginResult.data.id)
      expect(r.ok).toBe(true)
      expect(readSessionUser()).toBeNull()
      const relogin = await login('sara@correo.es', 'finanzas2026')
      expect(relogin.ok).toBe(false)
    })
  })

  it('normalizes emails for comparison', () => {
    expect(normalizeEmail('  Sara@Correo.ES ')).toBe('sara@correo.es')
  })
})