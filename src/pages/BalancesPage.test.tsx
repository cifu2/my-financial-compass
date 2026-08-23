import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppStateProvider } from '../state/AppState'
import { AuthProvider } from '../features/auth/state/AuthContext'
import BalancesPage from './BalancesPage'
import { savePersistedState, STORAGE_KEY } from '../lib/storageService'
import { persistGroupSnapshot, clearGroupSnapshot } from '../features/groups/services/groupStore'
import { seedGroupSnapshot } from '../features/groups/data/seeds'
import { PREDEFINED_CATEGORIES } from '../features/categories/data/predefined'
import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'

/**
 * Debt balances + settlements screen (HU-0.7 / MYF-27). Rendered isolated with
 * the real AppState boot (persistence) path so the seeded split expense drives
 * the debt rows and settlement writes land in localStorage.
 */

const USER_ID = 'usr-ana'

function seedAuthAsMember() {
  const base = buildSeededSnapshot({
    id: USER_ID,
    email: 'ana@example.com',
    name: 'Ana',
    password: 'pass1234',
  })
  const snapshot = {
    version: 2 as const,
    users: [
      ...base.users,
      { id: 'usr-jose', email: 'jose@example.com', name: 'José', avatar: '#4338ca', currency: 'EUR', createdAt: '2026-01-01T00:00:00Z', password: { salt: '', digest: '' } },
      { id: 'usr-lucia', email: 'lucia@example.com', name: 'Lucía', avatar: '#be185d', currency: 'EUR', createdAt: '2026-01-01T00:00:00Z', password: { salt: '', digest: '' } },
    ],
    session: base.session,
    resets: [],
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot))
}

function seedBalanceData() {
  savePersistedState({
    locale: 'es',
    transactions: [
      {
        id: 'tx-split-1',
        concept: 'Cena hogar',
        amount: 45,
        date: '2026-08-01',
        type: 'expense',
        categoryId: 'cat-alimentacion',
        groupId: 'grp-hogar',
        userId: USER_ID,
      },
    ],
    categories: PREDEFINED_CATEGORIES,
    investments: [],
    investmentOwnerships: [],
    budgets: [],
    recurrings: [],
    expenseSplits: [
      {
        transactionId: 'tx-split-1',
        groupId: 'grp-hogar',
        paidBy: USER_ID,
        method: 'equal',
        shares: [
          { userId: USER_ID, amount: 22.5 },
          { userId: 'usr-jose', amount: 22.5 },
        ],
      },
    ],
  })
}

async function renderBalances() {
  render(
    <AuthProvider>
      <AppStateProvider bootDelayMs={0}>
        <BalancesPage />
      </AppStateProvider>
    </AuthProvider>,
  )
  const select = await screen.findByRole('combobox', { name: /Grupo|Group/i }, { timeout: 8000 })
  await waitFor(() => {
    expect(Array.from(select.querySelectorAll('option')).some((o) => o.textContent === 'Hogar')).toBe(true)
  })
  fireEvent.change(select, { target: { value: 'grp-hogar' } })
  return select
}

describe('Balances + settlements (HU-0.7 / MYF-27)', () => {
  beforeEach(() => {
    localStorage.clear()
    seedAuthAsMember()
    persistGroupSnapshot(seedGroupSnapshot())
    seedBalanceData()
  })
  afterEach(() => {
    localStorage.clear()
    clearGroupSnapshot()
  })

  it('shows "someone owes Ana" after a shared expense', async () => {
    await renderBalances()
    await waitFor(() => expect(screen.getAllByText(/José/).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/22,50/).length).toBeGreaterThan(0)
  })

  it('records a settlement in the history', async () => {
    await renderBalances()
    await waitFor(() => expect(screen.getAllByText(/José/).length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText(/Paga/i), { target: { value: 'usr-jose' } })
    fireEvent.change(screen.getByLabelText(/Recibe/i), { target: { value: USER_ID } })
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '22,5' } })
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: '02/08/2026' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar liquidación/i }))

    expect(await screen.findByText(/Historial de liquidaciones/)).toBeInTheDocument()
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(persisted.settlements).toHaveLength(1)
    expect(persisted.settlements[0].fromUserId).toBe('usr-jose')
    expect(persisted.settlements[0].toUserId).toBe(USER_ID)
    expect(persisted.settlements[0].amount).toBeCloseTo(22.5, 2)
  })

  it('blocks a settlement where payer and receiver are the same member', async () => {
    await renderBalances()
    await waitFor(() => expect(screen.getAllByText(/José/).length).toBeGreaterThan(0))

    const from = screen.getByLabelText(/Paga/i)
    const to = screen.getByLabelText(/Recibe/i)
    const amount = screen.getByLabelText(/Importe/i)
    fireEvent.change(from, { target: { value: 'usr-jose' } })
    fireEvent.change(to, { target: { value: 'usr-jose' } })
    fireEvent.change(amount, { target: { value: '10,00' } })
    fireEvent.change(screen.getByLabelText(/Fecha/i), { target: { value: '02/08/2026' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar liquidación/i }))
    expect(
      await screen.findByText(/El pagador y el receptor deben ser personas distintas/i),
    ).toBeInTheDocument()
  })
})