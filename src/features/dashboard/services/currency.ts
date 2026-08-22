/**
 * Multi-currency support (Module 5).
 *
 * Exchange rates are expressed base-EUR: `rate[code]` is how many units of
 * `code` buy one EUR. Amounts are converted through EUR as the pivot so any
 * pair `(from -> to)` works without a second table.
 *
 * Rates are a static daily snapshot (see `RATES_AS_OF`). The loader is a
 * single function (`getRates()`) so a live provider (API keyed, fetched once
 * a day and cached) can replace the snapshot without changing call sites.
 * Until a production feed exists we deliberately ship no hard-coded API keys.
 */

export type CurrencyCode =
  | 'EUR'
  | 'USD'
  | 'GBP'
  | 'JPY'
  | 'CHF'
  | 'CAD'
  | 'AUD'
  | 'SEK'
  | 'CNY'
  | 'BRL'
  | 'INR'
  | 'MXN'

/** The user's primary currency for reporting (dashboard, net worth). */
export const PRIMARY_CURRENCY: CurrencyCode = 'EUR'

/** ISO yyyy-mm-dd this snapshot was assembled for ("updated daily"). */
export const RATES_AS_OF = '2026-08-22'

/** Approximate ECB-style rates, base EUR (1 EUR = n <code>). */
export const RATES_BASE_EUR: Record<CurrencyCode, number> = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.85,
  JPY: 163,
  CHF: 0.94,
  CAD: 1.49,
  AUD: 1.66,
  SEK: 11.4,
  CNY: 7.85,
  BRL: 6.0,
  INR: 91.2,
  MXN: 21.3,
}

export interface ExchangeRates {
  asOf: string
  base: CurrencyCode
  rates: Record<CurrencyCode, number>
}

/** Partial rate lookup map (some currencies may be missing). */
export type PartialRates = Partial<Record<string, number>>

/** Current (fallback) daily snapshot. Swap the body for a live fetch later. */
export function getRates(): ExchangeRates {
  return { asOf: RATES_AS_OF, base: 'EUR', rates: RATES_BASE_EUR }
}

/** Whether a code has a known rate in this snapshot. */
export function hasRate(
  code: string,
  rates: Partial<Record<string, number>>,
): code is CurrencyCode {
  return code in rates && typeof rates[code] === 'number'
}

/**
 * Converts `amount` from `from` to `to`, or returns `null` when either
 * currency is unknown. Identity (same currency) always returns the input.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Partial<Record<string, number>> = RATES_BASE_EUR,
): number | null {
  if (from === to) return amount
  const fromRate = rates[from]
  const toRate = rates[to]
  if (fromRate === undefined || toRate === undefined || fromRate === 0) return null
  const inEur = amount / fromRate
  return toEur(inEur * toRate)
}

/** Shorthand for converting an amount into the primary (EUR) currency. */
export function toPrimary(
  amount: number,
  from: string,
  rates: Partial<Record<string, number>> = RATES_BASE_EUR,
): number | null {
  return convert(amount, from, PRIMARY_CURRENCY, rates)
}

function toEur(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}