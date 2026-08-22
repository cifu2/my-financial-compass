import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Locale } from '../lib/dates'
import type { Budget } from '../features/budgeting/types'

export interface Transaction {
  id: string
  concept: string
  amount: number
  date: string
  type: 'income' | 'expense'
  categoryId: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | 'both'
  isActive: boolean
}

export interface Investment {
  id: string
  name: string
  ticker?: string
  type: 'stocks' | 'funds' | 'crypto' | 'bonds' | 'other'
  purchaseDate: string
  quantity: number
  investedAmount: number
  currency: string
  currentValue?: number
}

export type UndoEntity =
  | { kind: 'transaction'; item: Transaction }
  | { kind: 'category'; item: Category }
  | { kind: 'investment'; item: Investment }
  | { kind: 'budget'; item: Budget }

interface Storage {
  transactions: Transaction[]
  categories: Category[]
  investments: Investment[]
  budgets: Budget[]
}

export interface AppState {
  locale: Locale
  setLocale: (locale: Locale) => void
  store: Storage
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  addCategory: (c: Omit<Category, 'id'>) => void
  addInvestment: (i: Omit<Investment, 'id'>) => void
  addBudget: (b: Omit<Budget, 'id'>) => void
  updateBudget: (id: string, b: Omit<Budget, 'id'>) => void
  remove: (entity: UndoEntity) => void
  restore: (entity: UndoEntity) => void
}

const AppStateContext = createContext<AppState | null>(null)

function now(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`
}

export function AppStateProvider({
  children,
  initialStore,
}: {
  children: ReactNode
  initialStore?: Partial<Storage>
}) {
  const [locale, setLocale] = useState<Locale>('es')
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialStore?.transactions ?? [],
  )
  const [categories, setCategories] = useState<Category[]>(
    initialStore?.categories ?? [],
  )
  const [investments, setInvestments] = useState<Investment[]>(
    initialStore?.investments ?? [],
  )
  const [budgets, setBudgets] = useState<Budget[]>(initialStore?.budgets ?? [])

  const value: AppState = {
    locale,
    setLocale,
    store: { transactions, categories, investments, budgets },
    addTransaction: (t) =>
      setTransactions((prev) => [...prev, { ...t, id: now('tx') }]),
    addCategory: (c) => setCategories((prev) => [...prev, { ...c, id: now('cat') }]),
    addInvestment: (i) =>
      setInvestments((prev) => [...prev, { ...i, id: now('inv') }]),
    addBudget: (b) => setBudgets((prev) => [...prev, { ...b, id: now('bg') }]),
    updateBudget: (id, b) =>
      setBudgets((prev) => prev.map((x) => (x.id === id ? { ...x, ...b } : x))),
    remove: (entity) => {
      if (entity.kind === 'transaction') {
        setTransactions((prev) => prev.filter((x) => x.id !== entity.item.id))
      } else if (entity.kind === 'category') {
        setCategories((prev) => prev.filter((x) => x.id !== entity.item.id))
      } else if (entity.kind === 'investment') {
        setInvestments((prev) => prev.filter((x) => x.id !== entity.item.id))
      } else {
        setBudgets((prev) => prev.filter((x) => x.id !== entity.item.id))
      }
    },
    restore: (entity) => {
      if (entity.kind === 'transaction') {
        setTransactions((prev) => [...prev, entity.item])
      } else if (entity.kind === 'category') {
        setCategories((prev) => [...prev, entity.item])
      } else if (entity.kind === 'investment') {
        setInvestments((prev) => [...prev, entity.item])
      } else {
        setBudgets((prev) => [...prev, entity.item])
      }
    },
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

function useAppState(): AppState {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

export { useAppState }