export type CategoryType = 'income' | 'expense' | 'both'

export interface Category {
  id: string
  name: string
  /** Which ledger(s) the category applies to. */
  type: CategoryType
  /** Inactive categories are hidden from pickers but keep their history. */
  isActive: boolean
}