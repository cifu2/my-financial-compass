export interface Transaction {
  id: string
  concept: string
  amount: number
  date: string
  type: 'income' | 'expense'
  categoryId: string
  isRecurring: boolean
  recurringId?: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | 'both'
  isActive: boolean
}
