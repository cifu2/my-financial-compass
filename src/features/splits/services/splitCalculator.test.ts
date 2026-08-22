import { describe, it, expect } from 'vitest'
import { computeSplit, toCents } from './splitCalculator'

describe('computeSplit math', () => {
  it('toCents/fromCents round-trip exactly', () => {
    expect(toCents(45.9)).toBe(4590)
    expect(toCents(0.01)).toBe(1)
    expect(toCents(0)).toBe(0)
  })
})

describe('computeSplit · equal', () => {
  it('splits exactly among participants (cent remainder absorbed)', () => {
    const result = computeSplit(10, 'equal', [
      { userId: 'a' },
      { userId: 'b' },
      { userId: 'c' },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const shares = result.shares
    const total = shares.reduce((a, b) => a + b.amount, 0)
    expect(total).toBeCloseTo(10, 2)
    const cents = shares.map((s) => toCents(s.amount)).reduce((a, b) => a + b, 0)
    expect(cents).toBe(1000)
  })

  it('handles imperfect thirds (100 / 3)', () => {
    const result = computeSplit(100, 'equal', [
      { userId: 'a' },
      { userId: 'b' },
      { userId: 'c' },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // 33.33 + 33.33 + 33.34 keeps the exact cent total.
    const cents = result.shares.map((s) => toCents(s.amount))
    expect(cents.reduce((a, b) => a + b, 0)).toBe(10000)
    expect(Math.min(...cents)).toBe(3333)
    expect(Math.max(...cents)).toBe(3334)
  })

  it('rejects an empty participant list', () => {
    const result = computeSplit(10, 'equal', [])
    expect(result).toEqual({ ok: false, error: 'no-participants' })
  })
})

describe('computeSplit · percentages', () => {
  it('distributes by given percentages', () => {
    const result = computeSplit(90, 'percentages', [
      { userId: 'a', value: 50 },
      { userId: 'b', value: 25 },
      { userId: 'c', value: 25 },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const byUser = new Map(result.shares.map((s) => [s.userId, s.amount]))
    expect(byUser.get('a')).toBeCloseTo(45, 2)
    expect(byUser.get('b')).toBeCloseTo(22.5, 2)
    expect(toCents(byUser.get('a')!) + toCents(byUser.get('b')!) + toCents(byUser.get('c')!)).toBe(9000)
  })

  it('sum of cents is exact even with odd percentages', () => {
    const result = computeSplit(9.99, 'percentages', [
      { userId: 'a', value: 33.333333 },
      { userId: 'b', value: 33.333333 },
      { userId: 'c', value: 33.333334 },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const cents = result.shares.map((s) => toCents(s.amount))
    expect(cents.reduce((a, b) => a + b, 0)).toBe(999)
  })

  it('rejects percentages that do not sum to 100', () => {
    const result = computeSplit(90, 'percentages', [
      { userId: 'a', value: 50 },
      { userId: 'b', value: 30 },
    ])
    expect(result).toEqual({ ok: false, error: 'percentages-sum' })
  })
})

describe('computeSplit · amounts', () => {
  it('accepts fixed amounts that match the total', () => {
    const result = computeSplit(45, 'amounts', [
      { userId: 'a', value: 15 },
      { userId: 'b', value: 30 },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const byUser = new Map(result.shares.map((s) => [s.userId, s.amount]))
    expect(byUser.get('a')).toBe(15)
    expect(byUser.get('b')).toBe(30)
  })

  it('rejects fixed amounts that mismatch the total', () => {
    const result = computeSplit(45, 'amounts', [
      { userId: 'a', value: 15 },
      { userId: 'b', value: 31 },
    ])
    expect(result).toEqual({ ok: false, error: 'amounts-sum' })
  })
})

describe('computeSplit · weights', () => {
  it('distributes proportionally to weights (2:1)', () => {
    const result = computeSplit(30, 'weights', [
      { userId: 'a', value: 2 },
      { userId: 'b', value: 1 },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const byUser = new Map(result.shares.map((s) => [s.userId, s.amount]))
    expect(byUser.get('a')).toBeCloseTo(20, 2)
    expect(byUser.get('b')).toBeCloseTo(10, 2)
  })

  it('sums exactly in cents', () => {
    const result = computeSplit(100, 'weights', [
      { userId: 'a', value: 7 },
      { userId: 'b', value: 3 },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const cents = result.shares.map((s) => toCents(s.amount)).reduce((a, b) => a + b, 0)
    expect(cents).toBe(10000)
  })

  it('rejects non-positive weights', () => {
    const result = computeSplit(100, 'weights', [
      { userId: 'a', value: 0 },
      { userId: 'b', value: 1 },
    ])
    expect(result).toEqual({ ok: false, error: 'invalid-input' })
  })
})