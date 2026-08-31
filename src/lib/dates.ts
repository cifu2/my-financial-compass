export type Locale = 'es' | 'en'

const PART_ORDER: Record<Locale, string[]> = {
  es: ['day', 'month', 'year'],
  en: ['month', 'day', 'year'],
}

function formatDateParts(date: Date, locale: Locale): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const parts = formatter.formatToParts(date)
  const order = PART_ORDER[locale] ?? PART_ORDER['es']
  const values = new Map<string, string>(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  )
  return order.map((t) => values.get(t) ?? '').join('/')
}

export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (m) {
    const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    return isNaN(date.getTime()) ? null : date
  }
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (d) {
    const date = new Date(Date.UTC(Number(d[3]), Number(d[2]) - 1, Number(d[1])))
    return isNaN(date.getTime()) ? null : date
  }
  return null
}

export function isFutureOnly(value: string | undefined | null): Date | null {
  const date = parseDate(value)
  if (!date) return null
  return toIsoDate(date) >= todayIso() ? date : null
}

/**
 * Formats a Date (or ISO/DD-MM-YYYY string) using the local
 * date convention for the given locale. Spanish (`es`) produces
 * DD/MM/YYYY; English (`en`) produces MM/DD/YYYY so the same
 * call site stays locale-localized.
 */
export function formatDate(
  value: Date | string | null | undefined,
  locale: Locale = 'es',
): string {
  if (!value) return ''
  const date = typeof value === 'string' ? parseDate(value) : value
  if (!date) return ''
  return formatDateParts(date, locale)
}

/** Returns an ISO yyyy-MM-dd value for `<input type="date">`. */
export function toInputDate(value: Date | string | null | undefined): string {
  const date = typeof value === 'string' ? parseDate(value) : value
  if (!date) return ''
  const y = date.getUTCFullYear().toString().padStart(4, '0')
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const d = date.getUTCDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Returns an ISO yyyy-MM-dd value from any accepted date value. */
export function toIsoDate(value: Date | string | null | undefined): string {
  return toInputDate(value)
}

/** ISO date for today, in the app's local time. */
export function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear().toString().padStart(4, '0')
  const m = (now.getMonth() + 1).toString().padStart(2, '0')
  const d = now.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Human-friendly month label for an ISO `yyyy-mm` key, localized
 * (Spanish → "mayo de 2026", English → "May 2026").
 */
export function monthLabel(month: string, locale: Locale = 'es'): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  const date = new Date(Date.UTC(y, m - 1, 1))
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Parse a DD/MM/YYYY string (from a text input) into an ISO yyyy-MM-dd. */
export function parseDdmmYyyy(value: string): string {
  const [d, m, y] = value.split('/').map((p) => (p || '').padStart(2, '0'))
  return `${y}-${m}-${d}`
}