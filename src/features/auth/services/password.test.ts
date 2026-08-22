import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  generateResetCode,
  isStrongPassword,
  passwordPolicyErrors,
  PASSWORD_MIN_LENGTH,
} from './password'

describe('password policies', () => {
  it('accepts a password with letters, numbers and 8+ characters', () => {
    expect(isStrongPassword('finanzas2026')).toBe(true)
    expect(passwordPolicyErrors('finanzas2026')).toEqual([])
  })

  it('rejects short / letterless / numberless passwords', () => {
    expect(isStrongPassword('corta1')).toBe(false)
    expect(isStrongPassword('solosololetras')).toBe(false)
    expect(isStrongPassword('1234567890')).toBe(false)
    expect(passwordPolicyErrors('a')).toContain('auth.password.tooShort')
    expect(passwordPolicyErrors('abcdefgh')).toContain('auth.password.noNumber')
    expect(passwordPolicyErrors('12345678')).toContain('auth.password.noLetter')
  })

  it('exposes the minimum length used by validation', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })
})

describe('mock hashing service', () => {
  it('produces a deterministic digest for the same salt+password', () => {
    const salt = generateSalt()
    expect(hashPassword('contra', salt)).toBe(hashPassword('contra', salt))
  })

  it('produces different digests for different salts or passwords', () => {
    const a = hashPassword('contra', 'salt-a')
    const b = hashPassword('contra', 'salt-b')
    const c = hashPassword('otra', 'salt-a')
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })

  it('verifies the correct password and rejects a wrong one', () => {
    const salt = generateSalt()
    const digest = hashPassword('finanzas2026', salt)
    expect(verifyPassword('finanzas2026', salt, digest)).toBe(true)
    expect(verifyPassword('finanzas2027', salt, digest)).toBe(false)
  })

  it('generates hex salts and 6-digit numeric reset codes', () => {
    const salt = generateSalt()
    expect(salt).toMatch(/^[0-9a-f]+$/)
    const code = generateResetCode()
    expect(code).toMatch(/^\d{6}$/)
  })
})