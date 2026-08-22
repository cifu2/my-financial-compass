import { describe, it, expect } from 'vitest'
import { formatDate, parseDate, toInputDate } from './dates'

describe('dates (MYF-8 localized format)', () => {
  it('formats as DD/MM/YYYY for Spanish', () => {
    expect(formatDate(new Date(Date.UTC(2026, 7, 22)), 'es')).toBe('22/08/2026')
  })

  it('formats as MM/DD/YYYY for English', () => {
    expect(formatDate(new Date(Date.UTC(2026, 7, 22)), 'en')).toBe('08/22/2026')
  })

  it('formats from an ISO string using local convention', () => {
    expect(formatDate('2026-08-22', 'es')).toBe('22/08/2026')
  })

  it('formats from a DD/MM/YYYY string', () => {
    expect(formatDate('22/08/2026', 'es')).toBe('22/08/2026')
  })

  it('defaults to es when no locale given', () => {
    expect(formatDate(new Date(Date.UTC(2026, 7, 22)))).toBe('22/08/2026')
  })

  it('parses ISO and DD/MM/YYYY to UTC dates', () => {
    expect(parseDate('2026-08-22')?.toISOString()).toBe('2026-08-22T00:00:00.000Z')
    expect(parseDate('22/08/2026')?.toISOString()).toBe('2026-08-22T00:00:00.000Z')
    expect(parseDate('garbage')).toBeNull()
    expect(parseDate('')).toBeNull()
  })

  it('toInputDate returns yyyy-mm-dd for date inputs', () => {
    expect(toInputDate(new Date(Date.UTC(2026, 7, 22)))).toBe('2026-08-22')
    expect(toInputDate('22/08/2026')).toBe('2026-08-22')
  })

  it('roundtrips parse + format', () => {
    const parsed = parseDate('15/03/2026')
    expect(formatDate(parsed, 'es')).toBe('15/03/2026')
  })
})