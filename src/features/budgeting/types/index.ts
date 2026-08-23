export type BudgetPeriod = 'monthly'

export type BudgetLevel = 'healthy' | 'warning' | 'danger' | 'over'

/**
 * A user-defined monthly budget on a category.
 *
 * `groupId` sets the sharing scope: null/undefined means a **personal**
 * budget (only the owner consumes against it), while a group id means the
 * budget is **shared** by the whole group — the spending of every member
 * aggregates against it (see HU-0.8).
 */
export interface Budget {
  id: string
  categoryId: string
  /** Monthly spending limit in the user's currency. */
  limit: number
  period: BudgetPeriod
  /** Id of the group the budget is shared with, or null for personal. */
  groupId?: string | null
}

/** Per-member spending share of a group budget, for the period breakdown. */
export interface MemberSpend {
  userId: string
  name: string
  /** Absolute expense accumulated by this member in the period. */
  spent: number
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
  /** Per-member spend shares (only for group budgets, when computed). */
  memberSpend?: MemberSpend[]
}

/** Aggregate summary across all active budgets. */
export interface BudgetSummary {
  totalSpent: number
  totalLimit: number
  budgetCount: number
}

/**
 * Budget view context: `personal` shows only the owner's own budgets and
 * counts only their spending; `group` shows the budgets of a chosen group and
 * aggregates the spending of every group member.
 */
export interface BudgetContext {
  kind: 'personal' | 'group'
  /** Current group id when `kind === 'group'`. */
  groupId: string | null
}