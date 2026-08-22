import type { CurrencyCode } from '../services/currency'

/** Expense accumulated by one category during a period. */
export interface CategoryExpense {
  categoryId: string
  categoryName: string
  amount: number
  /** Share of the month's total expenses, 0..100. */
  percentage: number
  /**
   * Labelled sub-totals that explain the row: per member in a group context,
   * per origin (personal / each group) in the consolidated "Todo" view
   * (HU-0.5). Absent when the view does not split the category.
   */
  shares?: CategoryShare[]
}

/** One labelled sub-total of a {@link CategoryExpense}. */
export interface CategoryShare {
  /** Stable id (member `userId` or origin key). */
  key: string
  /** Human label (member name or "Personal"/group name). */
  label: string
  amount: number
}

/** One month of the ledger: totals plus the top expense categories. */
export interface MonthSummary {
  /** ISO `yyyy-mm` period key. */
  month: string
  totalIncome: number
  totalExpenses: number
  /** income - expenses. */
  cashFlow: number
  topCategories: CategoryExpense[]
}

/** Percentage evolution of one metric against the previous month. */
export interface MonthComparison {
  /** Previous period sum, 0 when there is no previous data. */
  previous: number
  /** Absolute difference current - previous. */
  delta: number
  /** 0..+Inf for growth; negative for a drop; null when not computable. */
  percent: number | null
}

/** Net worth breakdown in the user's primary currency. */
export interface NetWorth {
  /** Cash value implied by the ledger (sum of all transaction amounts). */
  liquidAssets: number
  /** Current value of investments, converted to primary currency. */
  investments: number
  total: number
  currency: CurrencyCode
  /** Investment holdings not convertible (missing rate) kept out of total. */
  unconvertedCount: number
}

/** Per-investment breakdown used by the net worth panel. */
export interface NetWorthItem {
  id: string
  name: string
  ticker?: string
  type: string
  /** Value in its own currency. */
  nativeValue: number
  nativeCurrency: string
  /** Value converted to primary currency; null when the rate is missing. */
  primaryValue: number | null
}