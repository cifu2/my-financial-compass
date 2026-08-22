import type { Transaction } from '../../../state/AppState'
import type { Category } from '../../categories/types'
import type { Budget } from '../../budgeting/types'
import type { Investment } from '../../investments/types'

/**
 * Demo store shown when the app has no data. Seeding is explicit (the
 * dashboard empty state exposes a "load demo data" button) so real user
 * workflows and automated tests never see fixtures by default. Dates are
 * relative to today so "this month" widgets render with current figures.
 */

/** ISO yyyy-mm-dd for a day of the current month (drop into previous months). */
function day(
  monthsAgo: number,
  day: number,
  hours = 12,
): string {
  const now = new Date()
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth() - monthsAgo, day, hours),
  )
    .toISOString()
    .slice(0, 10)
}

export const demoCategories: Category[] = [
  { id: 'cat-nomina', name: 'Nómina', type: 'income', isActive: true },
  { id: 'cat-interes', name: 'Intereses', type: 'income', isActive: true },
  { id: 'cat-alimentacion', name: 'Alimentación', type: 'expense', isActive: true },
  { id: 'cat-vivienda', name: 'Vivienda', type: 'expense', isActive: true },
  { id: 'cat-transporte', name: 'Transporte', type: 'expense', isActive: true },
  { id: 'cat-ocio', name: 'Ocio y restaurantes', type: 'expense', isActive: true },
  { id: 'cat-salud', name: 'Salud', type: 'expense', isActive: true },
  { id: 'cat-suscripciones', name: 'Suscripciones', type: 'expense', isActive: true },
  { id: 'cat-otros', name: 'Otros gastos', type: 'expense', isActive: true },
]

function tpl(
  id: string,
  concept: string,
  amount: number,
  date: string,
  categoryId: string,
  type: 'income' | 'expense',
): Transaction {
  return { id, concept, amount, date, type, categoryId }
}

export const demoTransactions: Transaction[] = [
  // ---- current month
  tpl('tx-m0-1', 'Nómina Acme', 2540, day(0, 1), 'cat-nomina', 'income'),
  tpl('tx-m0-2', 'Alquiler + gastos', -780, day(0, 1), 'cat-vivienda', 'expense'),
  tpl('tx-m0-3', 'Supermercado', -96.4, day(0, 3), 'cat-alimentacion', 'expense'),
  tpl('tx-m0-4', 'Mercadillo', -32.8, day(0, 6), 'cat-alimentacion', 'expense'),
  tpl('tx-m0-5', 'Abono transporte', -42, day(0, 1), 'cat-transporte', 'expense'),
  tpl('tx-m0-6', 'Gasolina', -58.3, day(0, 8), 'cat-transporte', 'expense'),
  tpl('tx-m0-7', 'Cena amigos', -64.2, day(0, 9), 'cat-ocio', 'expense'),
  tpl('tx-m0-8', 'Cine', -22.5, day(0, 11), 'cat-ocio', 'expense'),
  tpl('tx-m0-9', 'Farmacia', -18.7, day(0, 5), 'cat-salud', 'expense'),
  tpl('tx-m0-10', 'Suscripciones', -19.5, day(0, 14), 'cat-suscripciones', 'expense'),
  tpl('tx-m0-11', 'Transferencia ahorro', -150, day(0, 15), 'cat-otros', 'expense'),
  tpl('tx-m0-12', 'Intereses cuenta', 8.2, day(0, 20), 'cat-interes', 'income'),
  // --- previous month
  tpl('tx-m1-1', 'Salario Acme', 2540, day(1, 1), 'cat-nomina', 'income'),
  tpl('tx-m1-2', 'Intereses cuenta', 7.9, day(1, 20), 'cat-interes', 'income'),
  tpl('tx-m1-3', 'Alquiler', -780, day(1, 1), 'cat-vivienda', 'expense'),
  tpl('tx-m1-4', 'Supermercado', -210.6, day(1, 4), 'cat-alimentacion', 'expense'),
  tpl('tx-m1-5', 'Abono transporte', -42, day(1, 1), 'cat-transporte', 'expense'),
  tpl('tx-m1-6', 'Cena familia', -58, day(1, 8), 'cat-ocio', 'expense'),
  tpl('tx-m1-7', 'Suscripciones', -19.5, day(1, 14), 'cat-suscripciones', 'expense'),
  tpl('tx-m1-8', 'Mueble', -134, day(1, 12), 'cat-vivienda', 'expense'),
  tpl('tx-m1-9', 'Restaurante', -87.4, day(1, 18), 'cat-ocio', 'expense'),
  // --- two months ago
  tpl('tx-m2-1', 'Salario Acme', 2540, day(2, 1), 'cat-nomina', 'income'),
  tpl('tx-m2-2', 'Alquiler', -780, day(2, 1), 'cat-vivienda', 'expense'),
  tpl('tx-m2-3', 'Supermercado', -188.9, day(2, 5), 'cat-alimentacion', 'expense'),
  tpl('tx-m2-4', 'Abono transporte', -42, day(2, 1), 'cat-transporte', 'expense'),
  tpl('tx-m2-5', 'Concierto', -48, day(2, 16), 'cat-ocio', 'expense'),
  tpl('tx-m2-6', 'Suscripciones', -19.5, day(2, 14), 'cat-suscripciones', 'expense'),
]

export const demoBudgets: Budget[] = [
  { id: 'bg-housing', categoryId: 'cat-vivienda', limit: 850, period: 'monthly' },
  { id: 'bg-food', categoryId: 'cat-alimentacion', limit: 400, period: 'monthly' },
  { id: 'bg-transport', categoryId: 'cat-transporte', limit: 150, period: 'monthly' },
  { id: 'bg-leisure', categoryId: 'cat-ocio', limit: 250, period: 'monthly' },
  { id: 'bg-subs', categoryId: 'cat-suscripciones', limit: 60, period: 'monthly' },
]

export const demoInvestments: Investment[] = [
  {
    id: 'inv-fondo',
    name: 'Fondo global',
    ticker: 'GAWC',
    type: 'funds',
    purchaseDate: '2026-01-10',
    quantity: 12,
    investedAmount: 5200,
    currentValue: 5740,
    currency: 'EUR',
  },
  {
    id: 'inv-us',
    name: 'ETF S&P 500',
    ticker: 'SPY',
    type: 'stocks',
    purchaseDate: '2026-02-01',
    quantity: 4,
    investedAmount: 1850,
    currentValue: 1980,
    currency: 'USD',
  },
  {
    id: 'inv-crypto',
    name: 'Bitcoin',
    ticker: 'BTC',
    type: 'crypto',
    purchaseDate: '2026-03-05',
    quantity: 0.04,
    investedAmount: 420,
    currentValue: 780,
    currency: 'EUR',
  },
]