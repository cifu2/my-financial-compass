import type { Locale } from '../../../lib/dates'

/**
 * Client-side password policy (see ADR-0007).
 *
 * "Contraseña segura": at least 8 characters, containing letters and numbers.
 * This is the validation rule enforced by the registration/login forms.
 */
export const PASSWORD_MIN_LENGTH = 8

export interface PasswordPolicy {
  minLength: number
  requiresLetter: boolean
  requiresNumber: boolean
}

export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,
  requiresLetter: true,
  requiresNumber: true,
}

/** Returns the list of policy violations for `password` as message keys. */
export function passwordPolicyErrors(
  password: string,
): Array<'auth.password.tooShort' | 'auth.password.noLetter' | 'auth.password.noNumber'> {
  const errors: Array<
    'auth.password.tooShort' | 'auth.password.noLetter' | 'auth.password.noNumber'
  > = []
  if (password.length < PASSWORD_POLICY.minLength) errors.push('auth.password.tooShort')
  if (PASSWORD_POLICY.requiresLetter && !/[a-zA-Z]/.test(password)) {
    errors.push('auth.password.noLetter')
  }
  if (PASSWORD_POLICY.requiresNumber && !/[0-9]/.test(password)) {
    errors.push('auth.password.noNumber')
  }
  return errors
}

export function isStrongPassword(password: string): boolean {
  return passwordPolicyErrors(password).length === 0
}

/**
 * Deterministic salted digest for the local mock auth backend.
 *
 * IMPORTANT: this is NOT cryptographically secure by design. The MVP has no
 * server, so a real key-derivation function (PBKDF2/bcrypt/argon2, server
 * side) is deliberately out of scope — see ADR-0007. The tenant of this
 * function is small: give the "password strength / persistence / reset" flows
 * an auditable seam that a backend swap replaces without touching the UI.
 * Callers must never rely on it for real security.
 */
export function hashDigest(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const a = Math.imul(hash ^ (hash >>> 13), 0x5bd1e995)
  const b = (a ^ (a >>> 15)) >>> 0
  return b.toString(16).padStart(8, '0')
}

/** Hashing API shaped like a real backend primitive (salt + plural rounds). */
export function hashPassword(password: string, salt: string): string {
  // Two rounds of the salted digest make the mock slightly less trivial while
  // keeping the whole thing sync and dependency-free.
  return hashDigest(`${salt}|${hashDigest(`${salt}|${password}`)}`)
}

export function verifyPassword(password: string, salt: string, digest: string): boolean {
  return hashPassword(password, salt) === digest
}

/** Random hex string used as a per-user salt. */
export function generateSalt(entropyBytes = 8): string {
  const bytes = new Uint8Array(entropyBytes)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Numeric password-reset code for the demo email-less flow. */
export function generateResetCode(length = 6): string {
  const digits = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(digits)
  } else {
    for (let i = 0; i < digits.length; i += 1) {
      digits[i] = Math.floor(Math.random() * 10)
    }
  }
  return Array.from(digits, (d) => String(d % 10)).join('')
}

/** Human-facing hint returned to forms when the password does not comply. */
export function passwordPolicyHint(locale: Locale): string {
  return locale === 'es'
    ? 'Mínimo 8 caracteres con letras y números.'
    : 'At least 8 characters with letters and numbers.'
}