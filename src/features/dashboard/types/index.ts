export interface MonthlySummary {
  month: string
  year: number
  totalIncome: number
  totalExpenses: number
  cashFlow: number
  topCategories: CategoryExpense[]
  netWorth: number
}

export interface CategoryExpense {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
}

export interface NetWorth {
  liquidAssets: number
  investments: number
  total: number
  currency: string
}
