export type BudgetPeriod = 'monthly'

export type BudgetLevel = 'healthy' | 'warning' | 'danger' | 'over'

/** A user-defined monthly budget on a category. */
export interface Budget {
  id: string
  categoryId: string
  /** Monthly spending limit in the user's currency. */
  limit: number
  period: BudgetPeriod
}

/** A budget rendered on the dashboard, with auto-calculated figures. */
export interface BudgetRow {
  budget: Budget
  categoryName: string
  /** Accumulated spending for the period (from transactions, expenses). */
  spent: number
  /** limit - spent. Negative when over budget. */
  remaining: number
  /** 0..100+, capped percent of limit used. */
  percentage: number
  /** Color threshold level derived from percentage. */
  level: BudgetLevel
}

/** Aggregate summary across all active budgets. */
export interface BudgetSummary {
  totalSpent: number
  totalLimit: number
  budgetCount: number
}