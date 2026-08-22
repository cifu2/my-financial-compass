import { describe, expect, it } from 'vitest'
import {
  buildBudgetRows,
  levelForPercentage,
  monthKey,
  spentForCategory,
  summarize,
  THRESHOLDS,
  type SpendingInput,
} from './budgetCalculator'
import type { Budget } from '../types/index'

const isExpense = (t: SpendingInput) => t.amount < 0

const budget = (id: string, categoryId: string, limit: number): Budget => ({
  id,
  categoryId,
  limit,
  period: 'monthly',
})

describe('levelForPercentage', () => {
  it('maps the four color thresholds correctly', () => {
    expect(levelForPercentage(0)).toBe('healthy')
    expect(levelForPercentage(70)).toBe('healthy')
    expect(levelForPercentage(70.01)).toBe('warning')
    expect(levelForPercentage(90)).toBe('warning')
    expect(levelForPercentage(91)).toBe('danger')
    expect(levelForPercentage(100)).toBe('danger')
    expect(levelForPercentage(100.01)).toBe('over')
    expect(levelForPercentage(150)).toBe('over')
  })

  it('exposes the documented thresholds', () => {
    expect(THRESHOLDS.green).toBe(70)
    expect(THRESHOLDS.yellow).toBe(90)
    expect(THRESHOLDS.red).toBe(100)
  })
})

describe('monthKey', () => {
  it('reduces an ISO date to a yyyy-mm period', () => {
    expect(monthKey('2026-08-14')).toBe('2026-08')
    expect(monthKey('2026-03-01')).toBe('2026-03')
  })
})

describe('spentForCategory', () => {
  it('sums abs amounts of expense transactions for the month', () => {
    const inputs: SpendingInput[] = [
      { amount: -50, date: '2026-08-02', categoryId: 'cat-food' },
      { amount: -25.5, date: '2026-08-10', categoryId: 'cat-food' },
      { amount: -99, date: '2026-07-20', categoryId: 'cat-food' },
      { amount: -10, date: '2026-08-11', categoryId: 'cat-other' },
      { amount: 2000, date: '2026-08-01', categoryId: 'cat-food' },
    ]
    expect(spentForCategory(inputs, 'cat-food', '2026-08', isExpense)).toBe(75.5)
  })
})

describe('buildBudgetRows', () => {
  const categoryNameFor = (id: string) =>
    ({
      'cat-food': 'Food',
      'cat-transport': 'Transport',
      'cat-fun': 'Fun',
      'cat-over': 'Over',
    })[id] ?? null

  const transactions: SpendingInput[] = [
    { amount: -210, date: '2026-08-05', categoryId: 'cat-food' },
    { amount: -150, date: '2026-08-06', categoryId: 'cat-transport' },
    { amount: -199, date: '2026-08-07', categoryId: 'cat-fun' },
    { amount: -402, date: '2026-08-08', categoryId: 'cat-over' },
  ]

  it('computes spent, remaining, percentage and level per budget', () => {
    const rows = buildBudgetRows(
      [
        budget('b1', 'cat-food', 300),
        budget('b2', 'cat-transport', 200),
        budget('b3', 'cat-fun', 200),
        budget('b4', 'cat-over', 400),
      ],
      transactions,
      isExpense,
      '2026-08',
      categoryNameFor,
    )

    expect(rows).toEqual([
      expect.objectContaining({ categoryName: 'Food', spent: 210, remaining: 90, percentage: 70, level: 'healthy' }),
      expect.objectContaining({ categoryName: 'Transport', spent: 150, remaining: 50, percentage: 75, level: 'warning' }),
      expect.objectContaining({ categoryName: 'Fun', spent: 199, remaining: 1, percentage: 99.5, level: 'danger' }),
      expect.objectContaining({ categoryName: 'Over', spent: 402, remaining: -2, percentage: 100.5, level: 'over' }),
    ])
  })

  it('resolves unknown categories to an Unknown label', () => {
    const rows = buildBudgetRows(
      [budget('b9', 'cat-missing', 100)],
      [],
      isExpense,
      '2026-08',
      categoryNameFor,
    )
    expect(rows[0].categoryName).toBe('Unknown category')
    expect(rows[0].spent).toBe(0)
    expect(rows[0].remaining).toBe(100)
    expect(rows[0].level).toBe('healthy')
  })

  it('flags over 100% only when the limit is exceeded', () => {
    const rows = buildBudgetRows(
      [budget('bA', 'cat-food', 300)],
      [{ amount: -330, date: '2026-08-01', categoryId: 'cat-food' }],
      isExpense,
      '2026-08',
      categoryNameFor,
    )
    expect(rows[0].percentage).toBe(110)
    expect(rows[0].level).toBe('over')
  })
})

describe('summarize', () => {
  it('sums spent and limit across rows', () => {
    const rows = buildBudgetRows(
      [budget('b1', 'cat-food', 300), budget('b2', 'cat-transport', 200)],
      [
        { amount: -210, date: '2026-08-05', categoryId: 'cat-food' },
        { amount: -150, date: '2026-08-06', categoryId: 'cat-transport' },
      ],
      isExpense,
      '2026-08',
      () => 'x',
    )
    expect(summarize(rows)).toEqual({ totalSpent: 360, totalLimit: 500, budgetCount: 2 })
  })
})