import { describe, expect, it, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AppStateProvider, type Investment, type InvestmentOwnership } from '../state/AppState'
import { AuthProvider } from '../features/auth/state/AuthContext'
import InvestmentsPage from './InvestmentsPage'
import { persistGroupSnapshot, clearGroupSnapshot } from '../features/groups/services/groupStore'
import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'
import { seedGroupSnapshot } from '../features/groups/data/seeds'
import { PREDEFINED_CATEGORIES } from '../features/categories/data/predefined'

/**
 * Personal/group investment flows (HU-0.9). The page reads the same group +
 * auth snapshots the services do (via localStorage), so the fixture writes the
 * real persisted stores before rendering, mirroring the app.
 */

const USER_ID = 'usr-ana'

function buildAuth() {
  return buildSeededSnapshot({
    id: USER_ID,
    email: 'ana@example.com',
    name: 'Ana',
    password: 'pass1234',
  })
}

function installGroups() {
  persistGroupSnapshot(seedGroupSnapshot())
}

const GROUP_INVESTMENT: Investment = {
  id: 'inv-g1',
  name: 'Fondo compartido',
  type: 'funds',
  purchaseDate: '2026-03-01',
  quantity: 1,
  investedAmount: 1000,
  currentValue: 2000,
  currency: 'EUR',
  groupId: 'grp-hogar',
  createdBy: USER_ID,
}
const PERSONAL_INVESTMENT: Investment = {
  id: 'inv-p1',
  name: 'Fondo personal',
  type: 'funds',
  purchaseDate: '2026-01-10',
  quantity: 1,
  investedAmount: 500,
  currentValue: 500,
  currency: 'EUR',
  createdBy: USER_ID,
}

function fillForm(
  form: HTMLElement,
  name: string,
  value: string,
  type: string,
  date: string,
) {
  fireEvent.change(within(form).getByLabelText(/Nombre/), {
    target: { value: name },
  })
  fireEvent.change(within(form).getByLabelText(/Valor|Value/), {
    target: { value },
  })
  fireEvent.change(form.querySelector('select[name="invType"]') as HTMLSelectElement, {
    target: { value: type },
  })
  fireEvent.change(within(form).getByLabelText(/Fecha|Date/), {
    target: { value: date },
  })
}

describe('InvestmentsPage group support (HU-0.9)', () => {
  beforeEach(() => {
    localStorage.clear()
    clearGroupSnapshot()
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(buildAuth()))
    installGroups()
  })

  it('shows a scope selector with personal + the user groups', () => {
    renderPage()
    const scope = screen.getByLabelText(/Ámbito/) as HTMLSelectElement
    expect(scope).toBeInTheDocument()
    const options = Array.from(scope.querySelectorAll('option')).map((o) => o.textContent)
    expect(options[0]).toMatch(/Personal/)
    expect(options.some((o) => o?.includes('Hogar'))).toBe(true)
  })

  it('filters the list to the active group scope with full value', () => {
    renderPage([PERSONAL_INVESTMENT, GROUP_INVESTMENT], [
      { investmentId: 'inv-g1', userId: 'usr-ana', percentage: 60 },
      { investmentId: 'inv-g1', userId: 'usr-jose', percentage: 40 },
    ])

    // Personal scope: Ana owns 60% of the group asset, so both are visible
    // but the group asset is valued at the proportional share (1200,00).
    expect(screen.getByText('Fondo personal')).toBeInTheDocument()
    expect(screen.getByText('Fondo compartido')).toBeInTheDocument()
    expect(screen.getByText(/1\.?200,00/)).toBeInTheDocument()

    // Switch to the Hogar group: full value appears.
    fireEvent.change(screen.getByLabelText(/Ámbito/) as HTMLSelectElement, {
      target: { value: 'grp-hogar' },
    })
    expect(screen.getByText('Fondo compartido')).toBeInTheDocument()
    expect(screen.getByText(/2\.?000,00/)).toBeInTheDocument()
  })

  it('lets the user create a personal investment that lands in the personal scope', () => {
    renderPage()
    const form = document.querySelector("form") as HTMLElement
    fillForm(form, 'Fondo índice', '1200', 'funds', '01/02/2026')
    fireEvent.click(within(form).getByRole('button', { name: /Guardar/ }))

    expect(screen.getByText('Fondo índice')).toBeInTheDocument()
  })

  it('creates a group investment with the ownership rows saved', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/Ámbito/) as HTMLSelectElement, {
      target: { value: 'grp-hogar' },
    })

    const form = document.querySelector("form") as HTMLElement
    fillForm(form, 'Piso 60-40', '2000', 'funds', '01/03/2026')

    // Two members (Ana, José) get percentage inputs. Make it 60/40.
    const anaLabelled = screen.getByLabelText(/^Ana\b/)
    const joseLabelled = document.querySelector("input[name=share-usr-jose]") as HTMLInputElement
    fireEvent.change(anaLabelled, { target: { value: '60' } })
    fireEvent.change(joseLabelled, { target: { value: '40' } })
    fireEvent.click(within(form).getByRole('button', { name: /Guardar/ }))

    // The investment appears under the group scope with shares sorted.
    expect(screen.getByText('Piso 60-40')).toBeInTheDocument()
    const row = screen.getByText('Piso 60-40').closest('tr')
    expect(within(row ?? document.body).getByText('60 · 40')).toBeInTheDocument()
  })

  it('rejects group ownership that does not sum to 100', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/Ámbito/) as HTMLSelectElement, {
      target: { value: 'grp-hogar' },
    })

    const form = document.querySelector("form") as HTMLElement
    fillForm(form, 'Fondo compartido', '2000', 'funds', '01/03/2026')
    const anaLabelled = screen.getByLabelText(/^Ana\b/)
    const joseLabelled = document.querySelector("input[name=share-usr-jose]") as HTMLInputElement
    fireEvent.change(anaLabelled, { target: { value: '30' } })
    fireEvent.change(joseLabelled, { target: { value: '30' } })

    fireEvent.click(within(form).getByRole('button', { name: /Guardar/ }))
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/deben sumar 100/i)
    expect(screen.queryByText('Fondo compartido')).toBeNull()
  })
})

function renderPage(
  investments: Investment[] = [],
  ownerships: InvestmentOwnership[] = [],
) {
  return render(
    <AuthProvider initialSnapshot={buildAuth()}>
      <AppStateProvider
        initialStore={{
          transactions: [],
          categories: PREDEFINED_CATEGORIES,
          investments,
          investmentOwnerships: ownerships,
          budgets: [],
          recurrings: [],
        }}
      >
        <InvestmentsPage />
      </AppStateProvider>
    </AuthProvider>,
  )
}