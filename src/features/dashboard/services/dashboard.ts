import type { Transaction } from '../../transactions/types'
import type { Category } from '../../categories/types'
import type { Investment } from '../../investments/types'
import { monthKey } from '../../budgeting/services/budgetCalculator'
import {
  convert,
  isCurrencyCode,
  PRIMARY_CURRENCY,
  RATES_BASE_EUR,
  type CurrencyCode,
  type ExchangeRates,
  type PartialRates,
} from './currency'
import type {
  CategoryExpense,
  MonthComparison,
  MonthSummary,
  NetWorth,
  NetWorthItem,
} from '../types/index'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export { monthKey }

/** ISO `yyyy-mm` key for the month containing `date`. */
export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** ISO `yyyy-mm` key exactly one month before the given key. */
export function previousMonthKey(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 2, 1))
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Sorted ascending list of months that have at least one transaction. */
export function monthsAvailable(transactions: readonly Transaction[]): string[] {
  const keys = new Set(transactions.map((t) => monthKey(t.date)))
  return [...keys].sort()
}

/** Latest month present in the ledger, or the current month when empty. */
export function latestMonth(transactions: readonly Transaction[]): string {
  const months = monthsAvailable(transactions)
  return months[months.length - 1] ?? currentMonthKey()
}

export interface MonthTotals {
  income: number
  expenses: number
  cashFlow: number
}

/** Sums income/expenses for one ISO month period. */
export function monthTotals(
  transactions: readonly Transaction[],
  month: string,
): MonthTotals {
  let income = 0
  let expenses = 0
  for (const t of transactions) {
    if (monthKey(t.date) !== month) continue
    if (t.type === 'income') income += t.amount
    else expenses += Math.abs(t.amount)
  }
  return {
    income: round2(income),
    expenses: round2(expenses),
    cashFlow: round2(income - expenses),
  }
}

/** Sorted list of the month's expense categories (largest first). */
export function topExpenseCategories(
  transactions: readonly Transaction[],
  month: string,
  categories: readonly Category[],
  limit = 5,
): CategoryExpense[] {
  const nameFor = new Map<string, string>(
    categories.map((c) => [c.id, c.name]),
  )
  const byCategory = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    if (monthKey(t.date) !== month) continue
    byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + Math.abs(t.amount))
  }
  const total = round2([...byCategory.values()].reduce((a, b) => a + b, 0))
  const sorted = [...byCategory.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      amount: round2(amount),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)

  return sorted.map((entry) => ({
    categoryId: entry.categoryId,
    categoryName: nameFor.get(entry.categoryId) ?? entry.categoryId,
    amount: entry.amount,
    percentage: total > 0 ? round2((entry.amount / total) * 100) : 0,
  }))
}

/** Full summary for a month: totals + top expense categories. */
export function summarizeMonth(
  transactions: readonly Transaction[],
  month: string,
  categories: readonly Category[],
  topLimit = 5,
): MonthSummary {
  const totals = monthTotals(transactions, month)
  const topCategories = topExpenseCategories(transactions, month, categories, topLimit)
  return {
    month,
    totalIncome: totals.income,
    totalExpenses: totals.expenses,
    cashFlow: totals.cashFlow,
    topCategories,
  }
}

/** Percentage change of `current` against `previous`. */
export function percentageChange(
  current: number,
  previous: number,
): MonthComparison {
  const delta = round2(current - previous)
  const percent = previous === 0 ? null : round2((delta / Math.abs(previous)) * 100)
  return { previous: round2(previous), delta, percent }
}

/** Most recent transactions by date (newest first), capped at `limit`. */
export function recentTransactions(
  transactions: readonly Transaction[],
  limit = 8,
): Transaction[] {
  return [...transactions]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
}

/** Cash value implied by the ledger: the sum of all transaction amounts. */
export function liquidAssets(transactions: readonly Transaction[]): number {
  return round2(transactions.reduce((acc, t) => acc + t.amount, 0))
}

/** Current value of one holding, preferring `currentValue` over invested. */
export function investmentNativeValue(investment: Investment): number {
  return investment.currentValue ?? investment.investedAmount
}

/** A holding converted to the primary currency (null when rate is missing). */
export function investmentPrimaryValue(
  investment: Investment,
  rates?: PartialRates,
  primary: string = PRIMARY_CURRENCY,
): number | null {
  const nativeValue = investmentNativeValue(investment)
  const converted = convert(nativeValue, investment.currency, primary, rates)
  return converted === null ? null : round2(converted)
}

/** Per-holding breakdown used by the net worth panel. */
export function netWorthItems(
  investments: readonly Investment[],
  rates: PartialRates,
  primary: string = PRIMARY_CURRENCY,
): NetWorthItem[] {
  return investments.map((inv) => {
    const nativeValue = investmentNativeValue(inv)
    const primaryValue = investmentPrimaryValue(inv, rates, primary)
    return {
      id: inv.id,
      name: inv.name,
      ticker: inv.ticker,
      type: inv.type,
      nativeValue: round2(nativeValue),
      nativeCurrency: inv.currency,
      primaryValue: primaryValue === null ? null : round2(primaryValue),
    }
  })
}

/**
 * Net worth = liquid assets (ledger) + current investment value, both in the
 * primary currency. Holdings without a known exchange rate are excluded from
 * the total (and counted so the UI can explain the gap).
 */
export function netWorth(
  transactions: readonly Transaction[],
  investments: readonly Investment[],
  rates: PartialRates = RATES_BASE_EUR,
  primary: string = PRIMARY_CURRENCY,
): NetWorth {
  const currency: CurrencyCode = isCurrencyCode(primary) ? primary : PRIMARY_CURRENCY
  const liquid = liquidAssets(transactions)
  let investedTotal = 0
  let unconvertedCount = 0
  for (const inv of investments) {
    const primaryValue = investmentPrimaryValue(inv, rates, currency)
    if (primaryValue === null) {
      unconvertedCount += 1
      continue
    }
    investedTotal += primaryValue
  }
  const investmentsValue = round2(investedTotal)
  return {
    liquidAssets: liquid,
    investments: investmentsValue,
    total: round2(liquid + investmentsValue),
    currency,
    unconvertedCount,
  }
}

export interface NetWorthHistoryPoint {
  month: string
  liquidAssets: number
  investments: number
  total: number
}

/**
 * Historical net worth: liquid assets accumulated up to each month present
 * in the ledger plus the constant current investment value. Investments are
 * valued at today's snapshot for every historical point.
 */
export function netWorthHistory(
  transactions: readonly Transaction[],
  investments: readonly Investment[],
  rates: ExchangeRates,
): NetWorthHistoryPoint[] {
  const months = monthsAvailable(transactions)
  const investedValue = netWorth(transactions, investments, rates.rates).investments
  return months.map((month) => {
    let running = 0
    for (const t of transactions) {
      if (monthKey(t.date) <= month) running += t.amount
    }
    const liquid = round2(running)
    return {
      month,
      liquidAssets: liquid,
      investments: investedValue,
      total: round2(liquid + investedValue),
    }
  })
}