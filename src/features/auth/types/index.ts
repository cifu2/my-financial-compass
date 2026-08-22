import type { CurrencyCode } from '../../dashboard/services/currency'

/**
 * Public, non-sensitive profile of an authenticated user. What the rest of the
 * app is allowed to see; never contains hashes or secrets.
 */
export interface UserProfile {
  id: string
  email: string
  name: string
  /** Id of the avatar color in the avatar palette. */
  avatar: string
  /** The user's primary currency for reporting amounts. */
  currency: string
  createdAt: string
}

/** Persisted credentials: a salted digest, never the plain text. */
export interface StoredCredentials {
  salt: string
  digest: string
}

/**
 * Full persisted account record. Stored under the auth storage key; designed
 * to be replaceable by a real backend (see ADR-0007) without changing the UI
 * contract, which only ever sees {@link UserProfile}.
 */
export interface StoredUser extends UserProfile {
  password: StoredCredentials
}

/** One in-flight password reset request (survives page reloads). */
export interface PasswordResetRecord {
  id: string
  email: string
  code: string
  /** ISO timestamp. Requests older than this must be re-issued. */
  expiresAt: string
}

/** The on-disk auth snapshot (`localStorage` until a backend lands). */
export interface AuthSnapshot {
  version: 2
  users: StoredUser[]
  session: { userId: string } | null
  resets: PasswordResetRecord[]
}

/** Currencies offered as "main currency" by the profile editor. */
export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = [
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'SEK',
  'CNY',
  'BRL',
  'INR',
  'MXN',
]

/** Avatar palette: dark-enough backgrounds so white initials keep AA contrast. */
export const AVATAR_COLORS: readonly string[] = [
  '#155e75',
  '#4338ca',
  '#0f766e',
  '#9a3412',
  '#6d28d9',
  '#0e7490',
  '#be185d',
  '#3f6212',
]

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
}

export function defaultCurrency(): CurrencyCode {
  return 'EUR'
}

export function defaultAvatarColor(): string {
  return AVATAR_COLORS[0]
}