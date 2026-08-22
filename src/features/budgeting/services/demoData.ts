import type { Category, Transaction } from '../../transactions/types/index'
import type { Budget } from '../types/index'

/**
 * Seed data for the budget dashboard. Fixtures are resolved relative to the
 * current date so "this month" rows render with green/yellow/red/dark
 * thresholds and the previous-month comparison has data too.
 */

/** An ISO yyyy-mm-dd date for a fixed calendar day of the current month. */
function thisMonth(day: number): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), day, 12))
  return d.toISOString().slice(0, 10)
}

/** An ISO yyyy-mm-dd date `days` days before today. */
function daysAgo(days: number): string {
  const now = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return now.toISOString().slice(0, 10)
}

export const seedCategories: Category[] = [
  { id: 'cat-food', name: 'Food & Groceries', type: 'expense', isActive: true },
  { id: 'cat-transport', name: 'Transport', type: 'expense', isActive: true },
  { id: 'cat-entertainment', name: 'Entertainment', type: 'expense', isActive: true },
  { id: 'cat-shopping', name: 'Shopping', type: 'expense', isActive: true },
  { id: 'cat-utilities', name: 'Utilities', type: 'expense', isActive: true },
  { id: 'cat-salary', name: 'Salary', type: 'income', isActive: true },
]

export const seedTransactions: Transaction[] = [
  // Food: healthy (~57% of 300)
  { id: 'tx-1', concept: 'Supermarket', amount: -85.5, date: thisMonth(2), type: 'expense', categoryId: 'cat-food', isRecurring: false },
  { id: 'tx-2', concept: 'Farmers market', amount: -48.2, date: thisMonth(6), type: 'expense', categoryId: 'cat-food', isRecurring: false },
  { id: 'tx-3', concept: 'Bakery', amount: -39.8, date: thisMonth(12), type: 'expense', categoryId: 'cat-food', isRecurring: false },
  // Transport: warning (~83% of 160)
  { id: 'tx-4', concept: 'Metro pass', amount: -52, date: thisMonth(1), type: 'expense', categoryId: 'cat-transport', isRecurring: true, recurringId: 'rec-metro' },
  { id: 'tx-5', concept: 'Fuel', amount: -61.4, date: thisMonth(9), type: 'expense', categoryId: 'cat-transport', isRecurring: false },
  { id: 'tx-6', concept: 'Ride share', amount: -18.9, date: thisMonth(15), type: 'expense', categoryId: 'cat-transport', isRecurring: false },
  // Entertainment: danger (~96% of 120)
  { id: 'tx-7', concept: 'Cinema', amount: -57.6, date: thisMonth(4), type: 'expense', categoryId: 'cat-entertainment', isRecurring: false },
  { id: 'tx-8', concept: 'Concert', amount: -38.4, date: thisMonth(10), type: 'expense', categoryId: 'cat-entertainment', isRecurring: false },
  { id: 'tx-9', concept: 'Streaming', amount: -19.2, date: thisMonth(14), type: 'expense', categoryId: 'cat-entertainment', isRecurring: true, recurringId: 'tx-stream' },
  // Shopping: over (>100% of 200)
  { id: 'tx-10', concept: 'Jacket online', amount: -149.99, date: thisMonth(3), type: 'expense', categoryId: 'cat-shopping', isRecurring: false },
  { id: 'tx-11', concept: 'New shoes', amount: -89.5, date: thisMonth(11), type: 'expense', categoryId: 'cat-shopping', isRecurring: false },
  // Utilities this month: empty so far (0%)
  // Income
  { id: 'tx-12', concept: 'Salary', amount: 2450, date: thisMonth(1), type: 'income', categoryId: 'cat-salary', isRecurring: true, recurringId: 'tx-salary' },

  // Previous month fixtures (for optional month comparison)
  { id: 'tx-p1', concept: 'Supermarket', amount: -270.3, date: daysAgo(25), type: 'expense', categoryId: 'cat-food', isRecurring: false },
  { id: 'tx-p2', concept: 'Metro', amount: -88, date: daysAgo(24), type: 'expense', categoryId: 'cat-transport', isRecurring: true, recurringId: 'tx-metro' },
  { id: 'tx-p3', concept: 'Fuel', amount: -59.1, date: daysAgo(27), type: 'expense', categoryId: 'cat-transport', isRecurring: false },
  { id: 'tx-p4', concept: 'Cinema', amount: -44.5, date: daysAgo(22), type: 'expense', categoryId: 'cat-entertainment', isRecurring: false },
]

export const seedBudgets: Budget[] = [
  { id: 'budget-food', categoryId: 'cat-food', limit: 300, period: 'monthly' },
  { id: 'budget-transport', categoryId: 'cat-transport', limit: 160, period: 'monthly' },
  { id: 'budget-entertainment', categoryId: 'cat-entertainment', limit: 120, period: 'monthly' },
  { id: 'budget-shopping', categoryId: 'cat-shopping', limit: 200, period: 'monthly' },
  { id: 'budget-utilities', categoryId: 'cat-utilities', limit: 180, period: 'monthly' },
]