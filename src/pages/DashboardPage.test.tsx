import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { AppStateProvider, type Transaction } from '../state/AppState'
import type { Category } from '../features/categories/types'
import DashboardPage from './DashboardPage'
import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'
import { seedGroupSnapshot } from '../features/groups/data/seeds'
import { GROUP_STORAGE_KEY } from '../features/groups/services/groupStore'

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

  it('loads demo data from the empty state with loading feedback', async () => {
    const { container } = render(
      <AppStateProvider>
        <DashboardPage />
      </AppStateProvider>,
    )
    const demoButton = await screen.findByRole('button', {
      name: /Cargar datos de demostración/,
    })
    expect(demoButton).toBeInTheDocument()
    fireEvent.click(demoButton)
    // The async demo load shows a spinner with the loading label on the button.
    const loadingButton = await screen.findByRole('button', {
      name: /Cargando datos de demostración…/,
    })
    expect(loadingButton).toHaveAttribute('aria-busy', 'true')
    // Once resolved, the demo store populates the panels, the empty-state
    // prompt disappears and the dashboard renders the investment and net worth.
    await screen.findByText(/Fondo global/)
    expect(screen.queryByRole('button', { name: /Cargar datos de demostración/ })).toBeNull()
    expect(container.textContent ?? '').toMatch(/Patrimonio neto/)
  })
})

// ---- HU-0.5 multi-context dashboard -------------------------------------

const GROUP_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Alimentación', type: 'expense', isActive: true },
  { id: 'cat-home', name: 'Vivienda', type: 'expense', isActive: true },
  { id: 'cat-salary', name: 'Nómina', type: 'income', isActive: true },
]

function groupAccountTransactions(): Transaction[] {
  return [
    // Ana's personal ledger (June).
    { id: 'p1', concept: 'Pan', amount: -30, date: '2026-06-02', type: 'expense', categoryId: 'cat-food', userId: 'usr-ana' },
    { id: 'p2', concept: 'Nómina', amount: 2500, date: '2026-06-01', type: 'income', categoryId: 'cat-salary', userId: 'usr-ana' },
    // Shared "Hogar" ledger (June): one row by Ana, one by José.
    { id: 'g1', concept: 'Alquiler', amount: -780, date: '2026-06-01', type: 'expense', categoryId: 'cat-home', groupId: 'grp-hogar', userId: 'usr-ana' },
    { id: 'g2', concept: 'Luz', amount: -80, date: '2026-06-05', type: 'expense', categoryId: 'cat-home', groupId: 'grp-hogar', userId: 'usr-jose' },
  ]
}

const GROUP_INVESTMENTS = [
  { id: 'inv-personal', name: 'Fondo mío', ticker: 'OWN', type: 'funds' as const, purchaseDate: '2026-01-10', quantity: 1, investedAmount: 1000, currentValue: 1100, currency: 'EUR' },
  { id: 'inv-group', name: 'Fondo común', ticker: 'GRP', type: 'funds' as const, purchaseDate: '2026-01-10', quantity: 1, investedAmount: 2000, currentValue: 2200, currency: 'EUR', groupId: 'grp-hogar', createdBy: 'usr-ana' },
]

function seedAnasGroups() {
  const auth = buildSeededSnapshot({ id: 'usr-ana', email: 'ana@example.com', name: 'Ana', password: 'pass1234' })
  auth.users.push({
    id: 'usr-jose',
    email: 'jose@example.com',
    name: 'José',
    avatar: '#4338ca',
    currency: 'EUR',
    createdAt: new Date().toISOString(),
    password: { salt: 'salt', digest: 'digest' },
  })
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
  localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(seedGroupSnapshot()))
}

async function selectContext(label: string) {
  const select = (await screen.findByLabelText('Contexto')) as HTMLSelectElement
  fireEvent.change(select, { target: { value: label } })
}

function kpiPanel(metricHeading: string): HTMLElement {
  const heading = screen
    .getAllByRole('heading', { name: metricHeading })
    .find(() => true) as HTMLElement
  return heading.closest('.panel') as HTMLElement
}

describe('DashboardPage multi-context (HU-0.5)', () => {
  afterEach(() => localStorage.clear())

  it('defaults to the personal context and hides group-ledger rows', async () => {
    seedAnasGroups()
    render(
      <AppStateProvider
        initialStore={{
          transactions: groupAccountTransactions(),
          categories: GROUP_CATEGORIES,
          investments: GROUP_INVESTMENTS,
        }}
      >
        <DashboardPage />
      </AppStateProvider>,
    )

    const contextSelect = await screen.findByLabelText('Contexto')
    expect(contextSelect).toHaveValue('personal')

    // Personal KPI: only Ana's own rows (expenses = 30, income = 2500).
    const expenses = kpiPanel('Gastos')
    expect(within(expenses).getByText(/30,00 €/)).toBeInTheDocument()

    // The shared "Alquiler" row must not appear in recent transactions.
    expect(screen.queryByRole('cell', { name: 'Alquiler' })).toBeNull()
    // Nor the group investment in the net worth panel.
    expect(screen.queryByText('Fondo común')).toBeNull()
  })

  it('switching to a group aggregates all members and breaks down by member', async () => {
    seedAnasGroups()
    render(
      <AppStateProvider
        initialStore={{
          transactions: groupAccountTransactions(),
          categories: GROUP_CATEGORIES,
          investments: GROUP_INVESTMENTS,
        }}
      >
        <DashboardPage />
      </AppStateProvider>,
    )

    await screen.findByLabelText('Contexto')
    await selectContext('grp-hogar')

    // Group KPI aggregates every member: Alquiler 780 + Luz 80 + Pan 30 = 890.
    await waitFor(() => {
      const expenses = kpiPanel('Gastos')
      expect(within(expenses).getByText(/890,00 €/)).toBeInTheDocument()
    })

    // The group ledger transaction is shown in recent.
    expect(screen.getByRole('cell', { name: 'Alquiler' })).toBeInTheDocument()

    // Vivienda is broken down per member (Ana 780 · José 80) in the chips.
    const joseChip = screen.getByText('José')
    const chips = joseChip.closest('.share-chips') as HTMLElement
    expect(within(chips).getByText('Ana')).toBeInTheDocument()

    // Net worth includes the group asset at full value.
    expect(screen.getByText('Fondo común')).toBeInTheDocument()
  })

  it('the "Todo" context consolidates personal and group with origin labels', async () => {
    seedAnasGroups()
    render(
      <AppStateProvider
        initialStore={{
          transactions: groupAccountTransactions(),
          categories: GROUP_CATEGORIES,
          investments: GROUP_INVESTMENTS,
        }}
      >
        <DashboardPage />
      </AppStateProvider>,
    )

    await screen.findByLabelText('Contexto')
    await selectContext('all')

    // Consolidated expenses: 30 + 780 + 80 = 890.
    await waitFor(() => {
      const expenses = kpiPanel('Gastos')
      expect(within(expenses).getByText(/890,00 €/)).toBeInTheDocument()
    })

    // The recent table tags each row with an origin column.
    const originColumn = await screen.findByRole('columnheader', { name: 'Origen' })
    expect(originColumn).toBeInTheDocument()
    expect(within(originColumn.closest('table') as HTMLElement).getAllByText('Personal').length).toBeGreaterThan(0)
    expect(within(originColumn.closest('table') as HTMLElement).getAllByText('Hogar').length).toBeGreaterThan(0)
  })
})