import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AppStateProvider, type Transaction } from '../state/AppState'
import type { Category } from '../features/categories/types'
import DashboardPage from './DashboardPage'

const CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Alimentación', type: 'expense', isActive: true },
  { id: 'cat-fun', name: 'Ocio', type: 'expense', isActive: true },
  { id: 'cat-salary', name: 'Nómina', type: 'income', isActive: true },
]

const TRANSACTIONS: Transaction[] = [
  { id: 't1', concept: 'Nómina', amount: 2000, date: '2026-06-01', type: 'income', categoryId: 'cat-salary', isRecurring: false },
  { id: 't2', concept: 'Supermercado', amount: -120, date: '2026-06-03', type: 'expense', categoryId: 'cat-food', isRecurring: false },
  { id: 't3', concept: 'Cine', amount: -50, date: '2026-06-05', type: 'expense', categoryId: 'cat-fun', isRecurring: false },
  { id: 't4', concept: 'Salario', amount: 1900, date: '2026-05-01', type: 'income', categoryId: 'cat-salary', isRecurring: false },
  { id: 't5', concept: 'Mercado', amount: -70, date: '2026-05-02', type: 'expense', categoryId: 'cat-food', isRecurring: false },
]

const INVESTMENTS = [
  {
    id: 'inv-1',
    name: 'Fondo global',
    ticker: 'GAWC',
    type: 'funds' as const,
    purchaseDate: '2026-01-10',
    quantity: 12,
    investedAmount: 5200,
    currentValue: 5740,
    currency: 'EUR',
  },
]

const BUDGETS = [
  { id: 'bg-1', categoryId: 'cat-food', limit: 200, period: 'monthly' as const },
]

function renderDashboard() {
  return render(
    <AppStateProvider
      initialStore={{
        transactions: TRANSACTIONS,
        categories: CATEGORIES,
        investments: INVESTMENTS,
        budgets: BUDGETS,
      }}
    >
      <DashboardPage />
    </AppStateProvider>,
  )
}

describe('DashboardPage (MYF-10)', () => {
  it('renders the three KPI cards with the selected month totals', () => {
    renderDashboard()
    const incomePanel = screen
      .getAllByRole('heading', { name: 'Ingresos' })[0]
      .closest('.panel') as HTMLElement
    // June is the latest month: 2000 income, 170 expenses, 1830 cash flow.
    expect(within(incomePanel).getByText(/2\.?000,00 €/)).toBeInTheDocument()
    const expensesPanel = screen
      .getAllByRole('heading', { name: 'Gastos' })[0]
      .closest('.panel') as HTMLElement
    expect(within(expensesPanel).getByText(/170,00 €/)).toBeInTheDocument()
  })

  it('renders expense breakdown, recent transactions, budgets and net worth panels', () => {
    renderDashboard()
    expect(screen.getByRole('heading', { name: 'Desglose de gastos' })).toBeInTheDocument()
    expect(screen.getAllByText('Alimentación').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Transacciones recientes' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Supermercado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Estado de presupuestos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Patrimonio neto' })).toBeInTheDocument()
    expect(screen.getByText('Fondo global')).toBeInTheDocument()
  })

  it('shows the monthly history table with a previous-month comparison', () => {
    renderDashboard()
    const historyHeading = screen.getAllByRole('heading', { name: 'Resumen histórico' })
      .find(() => true) as HTMLElement
    expect(historyHeading).toBeInTheDocument()
    const table = historyHeading.closest('section')?.querySelector('table') as HTMLElement
    // Header row + one row per available month (May and June 2026).
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('exports the monthly summary as CSV combining all months', () => {
    const createUrl = vi.fn(() => 'blob:csv')
    const revokeUrl = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: createUrl, revokeObjectURL: revokeUrl })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Descargar CSV' }))
    expect(createUrl).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('loads demo data from the empty state', () => {
    const { container } = render(
      <AppStateProvider>
        <DashboardPage />
      </AppStateProvider>,
    )
    const demoButton = screen.getByRole('button', {
      name: /Cargar datos de demostración/,
    })
    expect(demoButton).toBeInTheDocument()
    fireEvent.click(demoButton)
    // The demo store populates the panels: investments and budgets render
    // and the empty-state prompt disappears.
    expect(screen.queryByRole('button', { name: /Cargar datos de demostración/ })).toBeNull()
    expect(container.textContent ?? '').toMatch(/Fondo global/)
    expect(container.textContent ?? '').toMatch(/Patrimonio neto/)
  })
})