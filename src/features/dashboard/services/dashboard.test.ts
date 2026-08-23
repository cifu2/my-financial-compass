import { describe, it, expect } from 'vitest'
import type { Transaction } from '../../transactions/types'
import type { Category } from '../../categories/types'
import type { Investment, InvestmentOwnership } from '../../investments/types'
import { RATES_BASE_EUR } from './currency'
import {
  currentMonthKey,
  liquidAssets,
  latestMonth,
  monthTotals,
  monthsAvailable,
  netWorth,
  netWorthHistory,
  netWorthItems,
  contextNetWorth,
  contextNetWorthItems,
  expenseBreakdown,
  percentageChange,
  previousMonthKey,
  recentTransactions,
  summarizeMonth,
  topExpenseCategories,
} from './dashboard'

const CATS: Category[] = [
  { id: 'c-food', name: 'Food', type: 'expense', isActive: true },
  { id: 'c-fun', name: 'Fun', type: 'expense', isActive: true },
  { id: 'c-wage', name: 'Wage', type: 'income', isActive: true },
]

function tx(
  id: string,
  concept: string,
  amount: number,
  date: string,
  categoryId: string,
  type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense',
): Transaction {
  return { id, concept, amount, date, type, categoryId, isRecurring: false }
}

const SAMPLE: Transaction[] = [
  tx('t1', 'Salary', 2000, '2026-05-01', 'c-wage', 'income'),
  tx('t2', 'Groceries', -120, '2026-05-03', 'c-food', 'expense'),
  tx('t3', 'Cinema', -80, '2026-05-05', 'c-fun', 'expense'),
  tx('t4', 'Groceries', -200, '2026-06-02', 'c-food', 'expense'),
  tx('t5', 'Salary', 2200, '2026-06-10', 'c-wage', 'income'),
  tx('t6', 'Late', -30, '2026-06-20', 'c-fun', 'expense'),
]

describe('dashboard service', () => {
  it('computes per-month income, expenses and cash flow', () => {
    const may = monthTotals(SAMPLE, '2026-05')
    const june = monthTotals(SAMPLE, '2026-06')
    expect(may).toEqual({ income: 2000, expenses: 200, cashFlow: 1800 })
    expect(june).toEqual({ income: 2200, expenses: 230, cashFlow: 1970 })
  })

  it('summarizes a month including top categories', () => {
    const june = summarizeMonth(SAMPLE, '2026-06', CATS)
    expect(june.month).toBe('2026-06')
    expect(june.totalIncome).toBe(2200)
    expect(june.totalExpenses).toBe(230)
    expect(june.cashFlow).toBe(1970)
    expect(june.topCategories[0].categoryName).toBe('Food')
    expect(june.topCategories[0].amount).toBe(200)
    expect(june.topCategories[0].percentage).toBeCloseTo(86.96, 2)
  })

  it('caps top categories at the requested limit and sorts descending', () => {
    const top = topExpenseCategories(
      [
        tx('a', 'A', -50, '2026-06-01', 'c-food', 'expense'),
        tx('b', 'B', -120, '2026-06-02', 'c-fun', 'expense'),
        tx('c', 'C', -5, '2026-06-03', 'c-other', 'expense'),
        tx('d', 'D', -300, '2026-06-04', 'c-extra', 'expense'),
        tx('e', 'E', -70, '2026-06-05', 'c-more', 'expense'),
        tx('f', 'F', -15, '2026-06-06', 'c-min', 'expense'),
      ],
      '2026-06',
      CATS,
      5,
    )
    expect(top).toHaveLength(5)
    expect(top[0].amount).toBe(300)
    expect(top[1].amount).toBe(120)
  })

  it('keeps unknown categories in the top list with the id as fallback name', () => {
    const top = topExpenseCategories(
      [tx('n', 'Mystery', -45, '2026-06-01', 'c-other', 'expense')],
      '2026-06',
      CATS,
    )
    expect(top).toHaveLength(1)
    expect(top[0].categoryName).toBe('c-other')
  })

  describe('expenseBreakdown with labelled sub-totals (HU-0.5)', () => {
    const rows = [
      tx('a', 'A', -50, '2026-06-01', 'c-food', 'expense'),
      tx('b', 'B', -30, '2026-06-02', 'c-food', 'expense'),
      tx('c', 'C', -20, '2026-06-03', 'c-fun', 'expense'),
    ]

    it('is identical to the plain top list when no split is given', () => {
      const plain = expenseBreakdown(rows, '2026-06', CATS)
      const top = topExpenseCategories(rows, '2026-06', CATS)
      expect(plain).toEqual(top)
      expect(plain[0].shares).toBeUndefined()
    })

    it('splits each category by member and keeps labels per row', () => {
      const split = (t: Transaction) => (
        t.userId === undefined
          ? { key: t.concept, label: t.concept }
          : { key: t.userId, label: `Member ${t.userId}` }
      )
      const withShares = expenseBreakdown(rows, '2026-06', CATS, 5, split)
      const food = withShares.find((row) => row.categoryId === 'c-food')
      expect(food?.amount).toBe(80)
      // Shares sorted descending: A (50) then B (30).
      expect(food?.shares).toEqual([
        { key: 'A', label: 'A', amount: 50 },
        { key: 'B', label: 'B', amount: 30 },
      ])
      const fun = withShares.find((row) => row.categoryId === 'c-fun')
      expect(fun?.shares).toEqual([{ key: 'C', label: 'C', amount: 20 }])
    })

    it('ignores null splits (untagged rows) without creating empty shares', () => {
      const withNull = expenseBreakdown(rows, '2026-06', CATS, 5, () => null)
      expect(withNull.every((row) => row.shares === undefined)).toBe(true)
    })
  })

  it('computes month comparison numbers', () => {
    expect(percentageChange(120, 100)).toEqual({ previous: 100, delta: 20, percent: 20 })
    expect(percentageChange(80, 100)).toEqual({ previous: 100, delta: -20, percent: -20 })
    expect(percentageChange(100, 0)).toEqual({ previous: 0, delta: 100, percent: null })
  })

  it('lists months present and resolves latest/previous keys', () => {
    expect(monthsAvailable(SAMPLE)).toEqual(['2026-05', '2026-06'])
    expect(latestMonth(SAMPLE)).toBe('2026-06')
    expect(latestMonth([])).toBe(currentMonthKey())
    expect(previousMonthKey('2026-06')).toBe('2026-05')
    expect(previousMonthKey('2026-01')).toBe('2025-12')
  })

  it('returns the most recent transactions, newest first and capped', () => {
    const many: Transaction[] = [
      tx('x1', 'Oldest', -1, '2026-01-01', 'c-food', 'expense'),
    ]
    for (let i = 1; i <= 10; i += 1) {
      many.push(tx(`x${i + 1}`, `Recent ${i}`, -1, `2026-07-${String(i).padStart(2, '0')}`, 'c-food', 'expense'))
    }
    const recent = recentTransactions(many, 5)
    expect(recent).toHaveLength(5)
    expect(recent[0].concept).toBe('Recent 10')
  })

  it('averts a name clash check with an explicit recent limit', () => {
    const recent = recentTransactions(SAMPLE, 8)
    expect(recent).toHaveLength(6)
    expect(recent[0].id).toBe('t6')
  })

  it('computes liquid assets as the ledger balance', () => {
    expect(liquidAssets(SAMPLE)).toBe(3770)
  })

  it('computes net worth with multi-currency conversion', () => {
    const inv: Investment = {
      id: 'i1',
      name: 'US Tech',
      type: 'stocks',
      purchaseDate: '2026-01-01',
      quantity: 1,
      investedAmount: 500,
      currentValue: 545,
      currency: 'USD',
    }
    const worth = netWorth(SAMPLE, [inv])
    // Liquid 3770 + 545 USD converted to EUR (545/1.09)
    expect(worth.liquidAssets).toBe(3770)
    expect(worth.investments).toBeCloseTo(500, 2)
    expect(worth.total).toBeCloseTo(4270, 2)
    expect(worth.currency).toBe('EUR')
  })

  it('counts holdings whose rate is unknown and excludes them from the total', () => {
    const inv: Investment = {
      id: 'i1',
      name: 'Mystery',
      type: 'other',
      purchaseDate: '2026-01-01',
      quantity: 1,
      investedAmount: 100,
      currency: 'XXX',
    }
    const worth = netWorth(SAMPLE, [inv])
    expect(worth.unconvertedCount).toBe(1)
    expect(worth.investments).toBe(0)
    expect(worth.total).toBe(3770)
  })

  it('builds per-holding net worth items with native and primary values', () => {
    const invs: Investment[] = [
      {
        id: 'i1',
        name: 'EU Fund',
        type: 'funds',
        purchaseDate: '2026-01-01',
        quantity: 2,
        investedAmount: 1000,
        currency: 'EUR',
      },
      {
        id: 'i2',
        name: 'US Stock',
        type: 'stocks',
        purchaseDate: '2026-01-01',
        quantity: 1,
        investedAmount: 300,
        currentValue: 327,
        currency: 'USD',
      },
    ]
    const items = netWorthItems(invs, RATES_BASE_EUR)
    expect(items).toHaveLength(2)
    expect(items[0].primaryValue).toBe(1000)
    expect(items[1].primaryValue).toBeCloseTo(300, 2)
    expect(items[1].nativeCurrency).toBe('USD')
  })

  it('builds a historical net worth series over available months', () => {
    const history = netWorthHistory(SAMPLE, [], {
      asOf: '2026-08-22',
      base: 'EUR',
      rates: RATES_BASE_EUR,
    })
    expect(history.map((p) => p.month)).toEqual(['2026-05', '2026-06'])
    // May cumulative: 2000 - 120 - 80 = 1800
    expect(history[0].liquidAssets).toBe(1800)
    expect(history[1].liquidAssets).toBe(3770)
  })

  describe('context-aware net worth (HU-0.9)', () => {
    const groupInv: Investment = {
      id: 'gi-1',
      name: 'Grupo fondo',
      type: 'funds',
      purchaseDate: '2026-01-01',
      quantity: 1,
      investedAmount: 1000,
      currentValue: 2000,
      currency: 'EUR',
      groupId: 'grp-hogar',
      createdBy: 'usr-ana',
    }
    const personalInv: Investment = {
      id: 'pi-1',
      name: 'Personal',
      type: 'funds',
      purchaseDate: '2026-01-01',
      quantity: 1,
      investedAmount: 500,
      currentValue: 500,
      currency: 'EUR',
      createdBy: 'usr-ana',
    }
    const ownerships: InvestmentOwnership[] = [
      { investmentId: 'gi-1', userId: 'usr-ana', percentage: 60 },
      { investmentId: 'gi-1', userId: 'usr-jose', percentage: 40 },
    ]

    it('personal context values group assets at the user share', () => {
      const worth = contextNetWorth(
        SAMPLE,
        [groupInv, personalInv],
        ownerships,
        { kind: 'personal', userId: 'usr-ana' },
        'EUR',
        RATES_BASE_EUR,
      )
      // Liquid 3770 + personal 500 + group share 2000*0.6 = 1200 → 5470.
      expect(worth.liquidAssets).toBe(3770)
      expect(worth.investments).toBe(1700)
      expect(worth.total).toBe(5470)
    })

    it('group context values the whole asset', () => {
      const worth = contextNetWorth(
        SAMPLE,
        [groupInv, personalInv],
        ownerships,
        { kind: 'group', groupId: 'grp-hogar' },
        'EUR',
        RATES_BASE_EUR,
      )
      expect(worth.investments).toBe(2000)
      expect(worth.total).toBe(5770)
    })

    it('excludes unconvertible holdings from the total and counts them', () => {
      const exotic: Investment = {
        ...groupInv,
        id: 'fx-1',
        currency: 'XXX',
        currentValue: 900,
      }
      const worth = contextNetWorth(
        [],
        [groupInv, exotic],
        [...ownerships, { investmentId: 'fx-1', userId: 'usr-ana', percentage: 100 }],
        { kind: 'group', groupId: 'grp-hogar' },
        'EUR',
        RATES_BASE_EUR,
      )
      expect(worth.investments).toBe(2000)
      expect(worth.unconvertedCount).toBe(1)
    })

    it('exposes proportional native values in the breakdown', () => {
      const items = contextNetWorthItems(
        [groupInv],
        ownerships,
        { kind: 'personal', userId: 'usr-ana' },
        'EUR',
        RATES_BASE_EUR,
      )
      expect(items).toHaveLength(1)
      expect(items[0].nativeValue).toBe(1200)
      expect(items[0].primaryValue).toBe(1200)
    })
  })
})