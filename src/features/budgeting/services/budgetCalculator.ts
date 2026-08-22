import type {
  Budget,
  BudgetLevel,
  BudgetRow,
  BudgetSummary,
} from '../types/index'

/** Percentage threshold ranges (inclusive lower bound) per dashboard spec. */
export const THRESHOLDS = {
  green: 70, // 0-70%
  yellow: 90, // 71-90%
  red: 100, // 91-100%
  dark: Number.POSITIVE_INFINITY, // >100%
} as const

export function levelForPercentage(percentage: number): BudgetLevel {
  if (percentage <= THRESHOLDS.green) return 'healthy'
  if (percentage <= THRESHOLDS.yellow) return 'warning'
  if (percentage <= THRESHOLDS.red) return 'danger'
  return 'over'
}

/** Formats an ISO date as a `yyyy-mm` key used to bucket monthly periods. */
export function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7)
}

export interface SpendingInput {
  amount: number
  date: string
  categoryId: string
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Accumulated spending for one category within a single month period.
 * Only expense-ledger transactions count toward a budget.
 */
export function spentForCategory(
  inputs: readonly SpendingInput[],
  categoryId: string,
  month: string,
  isExpense: (input: SpendingInput) => boolean,
): number {
  let sum = 0
  for (const t of inputs) {
    if (t.categoryId !== categoryId) continue
    if (monthKey(t.date) !== month) continue
    if (!isExpense(t)) continue
    sum += Math.abs(t.amount)
  }
  return round2(sum)
}

/** Builds dashboard rows for the given period. */
export function buildBudgetRows(
  budgets: readonly Budget[],
  transactions: readonly SpendingInput[],
  isExpense: (input: SpendingInput) => boolean,
  month: string,
  categoryNameFor: (categoryId: string) => string | null,
): BudgetRow[] {
  return budgets.map((budget) => {
    const spent = spentForCategory(transactions, budget.categoryId, month, isExpense)
    const categoryName = categoryNameFor(budget.categoryId) ?? 'Unknown category'
    const remaining = round2(budget.limit - spent)
    const percentage =
      budget.limit > 0 ? round2((spent / budget.limit) * 100) : spent > 0 ? 100 : 0
    return {
      budget,
      categoryName,
      spent,
      remaining,
      percentage,
      level: levelForPercentage(percentage),
    }
  })
}

export function summarize(rows: readonly BudgetRow[]): BudgetSummary {
  const totalSpent = round2(rows.reduce((acc, r) => acc + r.spent, 0))
  const totalLimit = round2(rows.reduce((acc, r) => acc + r.budget.limit, 0))
  return { totalSpent, totalLimit, budgetCount: rows.length }
}