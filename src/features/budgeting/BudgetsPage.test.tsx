import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AppStateProvider, type Category, type Transaction } from '../../state/AppState'
import BudgetsPage from '../../pages/BudgetsPage'
import type { Budget } from './types'
import { buildSeededSnapshot } from '../auth/services/authService'
import { AUTH_STORAGE_KEY } from '../auth/services/authStore'
import { seedGroupSnapshot } from '../groups/data/seeds'
import { persistGroupSnapshot } from '../groups/services/groupStore'

/** An ISO yyyy-mm-dd date for a fixed calendar day of the current month. */
function thisMonth(day: number): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), day, 12))
  return d.toISOString().slice(0, 10)
}

const categories: Category[] = [
  { id: 'cat-food', name: 'Food & Groceries', type: 'expense', isActive: true },
  { id: 'cat-transport', name: 'Transport', type: 'expense', isActive: true },
  { id: 'cat-salary', name: 'Salary', type: 'income', isActive: true },
  { id: 'cat-home', name: 'Home', type: 'both', isActive: true },
]

const transactions: Transaction[] = [
  { id: 'tx-1', concept: 'Supermarket', amount: -120, date: thisMonth(2), type: 'expense', categoryId: 'cat-food' },
  { id: 'tx-2', concept: 'Salary', amount: 2450, date: thisMonth(1), type: 'income', categoryId: 'cat-salary' },
  { id: 'tx-3', concept: 'Rent', amount: -300, date: thisMonth(5), type: 'expense', categoryId: 'cat-home' },
]

const budgets: Budget[] = [
  { id: 'b-food', categoryId: 'cat-food', limit: 300, period: 'monthly' },
  { id: 'b-transport', categoryId: 'cat-transport', limit: 160, period: 'monthly' },
]

function renderPage() {
  return render(
    <AppStateProvider
      initialStore={{ categories, transactions, budgets }}
    >
      <BudgetsPage />
    </AppStateProvider>,
  )
}

const DELETE_BTN = /Delete|Eliminar/i
const SAVE_BTN = /Save|Guardar/i
const CATEGORY_RE = /Categor|Categoría/i
const LIMIT_RE = /Monthly limit|Límite mensual/i

describe('BudgetsPage (budget definition)', () => {
  it('renders the total summary line from the stored budgets', () => {
    renderPage()
    expect(screen.getByText(/Has gastado|You have spent/).textContent).toMatch(
      /de \d+[\s.,]\d+|of \d+[\s.,]\d+/,
    )
  })

  it('lists a progress bar per stored budget card', () => {
    renderPage()
    const bars = screen.getAllByRole('progressbar')
    expect(bars.length).toBeGreaterThanOrEqual(2)
  })

  it('only offers active expense/both categories in the create select', () => {
    renderPage()
    const combo = screen.getByRole('combobox', { name: CATEGORY_RE })
    const options = within(combo).getAllByRole('option')
    const labels = options.map((o) => (o as HTMLOptionElement).textContent ?? '')
    expect(labels).toContain('Food & Groceries')
    expect(labels).toContain('Transport')
    expect(labels.some((l) => l.startsWith('Home'))).toBe(true)
    expect(labels).not.toContain('Salary')
  })

  it('creates a budget from the form', () => {
    renderPage()
    fireEvent.change(screen.getByRole('combobox', { name: CATEGORY_RE }), {
      target: { value: 'cat-home' },
    })
    fireEvent.change(screen.getByLabelText(LIMIT_RE), {
      target: { value: '500' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /Period|Periodo/i }), {
      target: { value: 'monthly' },
    })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BTN }))

    const cards = Array.from(document.querySelectorAll('.budget-card'))
    const added = cards.find((c) => c.textContent?.includes('Home'))
    expect(added).toBeTruthy()
    expect(added?.textContent).toMatch(/500/)
  })

  it('rejects a duplicate active budget for the same category', () => {
    renderPage()
    fireEvent.change(screen.getByRole('combobox', { name: CATEGORY_RE }), {
      target: { value: 'cat-food' },
    })
    fireEvent.change(screen.getByLabelText(LIMIT_RE), {
      target: { value: '200' },
    })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BTN }))

    expect(
      screen.getByText(/already an active budget|presupuesto activo/i),
    ).toBeInTheDocument()
    const cards = Array.from(document.querySelectorAll('.budget-card'))
    expect(cards.filter((c) => c.textContent?.includes('Food')).length).toBe(1)
  })

  it('edits an existing budget limit in place', () => {
    renderPage()
    const foodCard = Array.from(document.querySelectorAll('.budget-card')).find(
      (c) => c.textContent?.includes('Food & Groceries'),
    ) as HTMLElement
    fireEvent.click(within(foodCard).getByRole('button', { name: /Edit|Editar/i }))

    fireEvent.change(screen.getByLabelText(LIMIT_RE), {
      target: { value: '999' },
    })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BTN }))

    const updated = Array.from(document.querySelectorAll('.budget-card')).find(
      (c) => c.textContent?.includes('Food & Groceries'),
    ) as HTMLElement
    expect(updated.textContent).toContain('999,00')
  })

  it('deletes a budget after confirmation and keeps the rest', () => {
    renderPage()
    const foodCard = Array.from(document.querySelectorAll('.budget-card')).find(
      (c) => c.textContent?.includes('Food & Groceries'),
    ) as HTMLElement
    fireEvent.click(within(foodCard).getByRole('button', { name: DELETE_BTN }))
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^Delete$|^Eliminar$/ }))

    const remaining = Array.from(document.querySelectorAll('.budget-card'))
    expect(remaining.some((c) => c.textContent?.includes('Food'))).toBe(false)
    expect(remaining.some((c) => c.textContent?.includes('Transport'))).toBe(true)
  })

  it('offers undo after deleting a budget', () => {
    renderPage()
    const foodCard = Array.from(document.querySelectorAll('.budget-card')).find(
      (c) => c.textContent?.includes('Food & Groceries'),
    ) as HTMLElement
    fireEvent.click(within(foodCard).getByRole('button', { name: DELETE_BTN }))
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^Delete$|^Eliminar$/ }))

    const toast = screen.getByRole('status')
    expect(toast.textContent).toMatch(/Deleted|Eliminado/i)
    fireEvent.click(within(toast).getByRole('button', { name: /Undo|Deshacer/i }))

    const cards = Array.from(document.querySelectorAll('.budget-card'))
    expect(cards.some((c) => c.textContent?.includes('Food & Groceries'))).toBe(true)
  })
})

/** Seeds an authenticated session. The group snapshot is installed per-test. */
describe('BudgetsPage permissions (HU-0.10)', () => {
  function renderGroup(userId: string, groupSnapshot: ReturnType<typeof seedGroupSnapshot>) {
    const auth = buildSeededSnapshot({ id: userId, email: 'u@example.com', name: 'U', password: 'pass1234' })
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
    persistGroupSnapshot(groupSnapshot)
    return render(
      <AppStateProvider
        initialStore={{ categories, transactions, budgets, budgetGroupId: 'grp-hogar' }}
      >
        <BudgetsPage />
      </AppStateProvider>,
    )
  }

  it('shows the form and actions for a group admin', () => {
    renderGroup('usr-ana', seedGroupSnapshot())
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(screen.getByRole('combobox', { name: CATEGORY_RE })).toBeInTheDocument()
  })

  it('hides the form and management actions for a read-only group member', () => {
    const snapshot = seedGroupSnapshot()
    const jose = snapshot.members.find((m) => m.groupId === 'grp-hogar' && m.userId === 'usr-jose')
    if (jose) jose.role = 'readonly'
    renderGroup('usr-jose', snapshot)
    expect(screen.queryByRole('combobox', { name: CATEGORY_RE })).toBeNull()
    expect(screen.getByRole('alert').textContent).toMatch(/solo lectura|read-only/i)
  })

  it('does not allow members when the group revokes budget management', () => {
    const snapshot = seedGroupSnapshot()
    const grp = snapshot.groups.find((g) => g.id === 'grp-hogar')
    if (grp) grp.settings = { membersCanManageBudgets: false }
    renderGroup('usr-jose', snapshot)
    expect(screen.queryByRole('combobox', { name: CATEGORY_RE })).toBeNull()
    expect(screen.getByRole('alert').textContent).toMatch(/no pueden gestionar presupuestos|members cannot manage budgets/i)
  })
})