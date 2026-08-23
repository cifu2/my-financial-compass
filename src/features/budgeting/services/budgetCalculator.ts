import type {
  Budget,
  BudgetContext,
  BudgetLevel,
  BudgetRow,
  BudgetSummary,
  MemberSpend,
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
  /** Owner user id. Missing on legacy rows (they belong to the viewer). */
  userId?: string
  /** Group context the row belongs to (group-shared ledgers, HU-0.8). */
  groupId?: string
}

/** Options that scope budget rows to a {@link BudgetContext}. */
export interface BudgetRowsOptions {
  context?: BudgetContext
  /** User who is viewing (owns `undefined`-owner legacy transactions). */
  currentUserId?: string | null
  /** Member user ids of the active group (group budgets breakdown). */
  memberIds?: ReadonlySet<string>
  /** Display names for member ids (group budgets breakdown). */
  memberNames?: ReadonlyMap<string, string>
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Whether a spending row counts toward the scoped budget:
 * - Personal context → only rows not signed to any group and owned by (or
 *   created by) the current user. Legacy rows without an owner count.
 * - Group context → rows of the group ledger (`groupId` match) plus rows
 *   owned by any member of the group.
 * - No context → every row (legacy/dashboard without scope).
 */
function isInScope(input: SpendingInput, options: BudgetRowsOptions): boolean {
  const { context, currentUserId } = options
  if (context === undefined) return true

  if (context.kind === 'personal') {
    if (input.groupId != null) return false
    const owner = input.userId ?? currentUserId ?? null
    return owner === null || owner === currentUserId
  }

  if (input.groupId === context.groupId) return true
  if (options.memberIds === undefined || options.memberIds.size === 0) return false
  const owner = input.userId ?? currentUserId ?? null
  return owner !== null && options.memberIds.has(owner)
}

/** Whether a budget belongs to the active context. */
function budgetInContext(budget: Budget, context: BudgetContext | undefined): boolean {
  if (context === undefined) return true
  if (context.kind === 'personal') return budget.groupId == null
  return budget.groupId === context.groupId
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
  options: BudgetRowsOptions = {},
): number {
  let sum = 0
  for (const t of inputs) {
    if (t.categoryId !== categoryId) continue
    if (monthKey(t.date) !== month) continue
    if (!isExpense(t)) continue
    if (!isInScope(t, options)) continue
    sum += Math.abs(t.amount)
  }
  return round2(sum)
}

/**
 * Builds the per-member spend shares of a group budget for the given month.
 * Rows without an owner are attributed to the viewing user when they are a
 * group member. The shares sum to `spentForCategory` for the same scope.
 */
export function memberBreakdown(
  transactions: readonly SpendingInput[],
  budget: Budget,
  month: string,
  isExpense: (input: SpendingInput) => boolean,
  options: BudgetRowsOptions,
): MemberSpend[] {
  const currentUser = options.currentUserId ?? null
  const members = options.memberIds ?? new Set<string>()
  const names = options.memberNames ?? new Map<string, string>()
  const totals = new Map<string, { name: string; spent: number }>()

  for (const t of transactions) {
    if (t.categoryId !== budget.categoryId) continue
    if (monthKey(t.date) !== month) continue
    if (!isExpense(t)) continue
    if (!isInScope(t, options)) continue
    const owner = t.userId ?? currentUser
    if (owner === null || !members.has(owner)) continue
    const name = names.get(owner) ?? owner
    const existing = totals.get(owner)
    if (existing) existing.spent += Math.abs(t.amount)
    else totals.set(owner, { name, spent: Math.abs(t.amount) })
  }

  return Array.from(totals.entries())
    .map(([userId, data]) => ({ userId, name: data.name, spent: round2(data.spent) }))
    .sort((a, b) => b.spent - a.spent)
}

/** Builds dashboard rows for the given period, scoped to a context. */
export function buildBudgetRows(
  budgets: readonly Budget[],
  transactions: readonly SpendingInput[],
  isExpense: (input: SpendingInput) => boolean,
  month: string,
  categoryNameFor: (categoryId: string) => string | null,
  options: BudgetRowsOptions = {},
): BudgetRow[] {
  return budgets
    .filter((budget) => budgetInContext(budget, options.context))
    .map((budget) => {
      const spent = spentForCategory(transactions, budget.categoryId, month, isExpense, options)
      const categoryName = categoryNameFor(budget.categoryId) ?? 'Unknown category'
      const remaining = round2(budget.limit - spent)
      const percentage =
        budget.limit > 0 ? round2((spent / budget.limit) * 100) : spent > 0 ? 100 : 0
      const row: BudgetRow = {
        budget,
        categoryName,
        spent,
        remaining,
        percentage,
        level: levelForPercentage(percentage),
      }
      if (
        options.context?.kind === 'group' &&
        options.memberIds !== undefined &&
        options.memberIds.size > 0
      ) {
        row.memberSpend = memberBreakdown(transactions, budget, month, isExpense, options)
      }
      return row
    })
}

export function summarize(rows: readonly BudgetRow[]): BudgetSummary {
  const totalSpent = round2(rows.reduce((acc, r) => acc + r.spent, 0))
  const totalLimit = round2(rows.reduce((acc, r) => acc + r.budget.limit, 0))
  return { totalSpent, totalLimit, budgetCount: rows.length }
}

/** Spending row alias kept for API compatibility. */
export type SpendingTransaction = SpendingInput