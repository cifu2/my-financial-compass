import { describe, it, expect } from 'vitest'
import {
  convert,
  getRates,
  hasRate,
  PRIMARY_CURRENCY,
  RATES_BASE_EUR,
  toPrimary,
} from './currency'

describe('currency service', () => {
  it('returns a base-EUR snapshot with an as-of date', () => {
    const rates = getRates()
    expect(rates.base).toBe('EUR')
    expect(rates.rates.EUR).toBe(1)
    expect(rates.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('converts between two non-base currencies through EUR', () => {
    const usd = convert(10, 'EUR', 'USD')
    expect(usd).toBe(10.9)
    const eur = convert(10, 'USD', 'EUR')
    expect(eur).toBeCloseTo(9.17, 2)
  })

  it('returns the input unchanged for the same currency', () => {
    expect(convert(42.5, 'EUR', 'EUR')).toBe(42.5)
  })

  it('returns null when either rate is missing', () => {
    expect(convert(5, 'EUR', 'XYZ')).toBeNull()
    expect(convert(5, 'XYZ', 'EUR')).toBeNull()
  })

  it('converts to the primary currency', () => {
    expect(toPrimary(10, 'EUR')).toBe(10)
    expect(PRIMARY_CURRENCY).toBe('EUR')
  })

  it('detects known and unknown codes', () => {
    expect(hasRate('USD', RATES_BASE_EUR)).toBe(true)
    expect(hasRate('BAD', RATES_BASE_EUR)).toBe(false)
  })
})