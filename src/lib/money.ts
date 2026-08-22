import type { Locale } from './dates'

/**
 * Formats an amount in the user's primary currency using the local convention
 * (Spanish → 1.234,56 €; English → EUR 1,234.56). The app reports in EUR.
 */
export function formatMoney(
  n: number,
  locale: Locale = 'es',
  currency = 'EUR',
): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    style: 'currency',
    currency,
  }).format(n)
}

/** Formats a signed amount with an explicit '+'/'-' prefix. */
export function formatSignedMoney(
  n: number,
  locale: Locale = 'es',
  currency = 'EUR',
): string {
  const base = formatMoney(Math.abs(n), locale, currency)
  if (n === 0) return base
  return n > 0 ? `+${base}` : `−${base}`
}