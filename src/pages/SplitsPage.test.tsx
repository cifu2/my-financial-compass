import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { AppStateProvider } from '../state/AppState'
import { AuthProvider } from '../features/auth/state/AuthContext'
import TransactionsPage from '../pages/TransactionsPage'
import { savePersistedState, STORAGE_KEY } from '../lib/storageService'
import { persistGroupSnapshot, clearGroupSnapshot } from '../features/groups/services/groupStore'
import { seedGroupSnapshot } from '../features/groups/data/seeds'
import { PREDEFINED_CATEGORIES } from '../features/categories/data/predefined'
import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'

/**
 * Group expense split flow (HU-0.7 / MYF-27). Renders TransactionsPage
 * isolated (with the real AppState boot → persistence path) so it asserts the
 * persisted localStorage contract without depending on the shell.
 */

const USER_ID = 'usr-ana'

function seedAuthAsMember() {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(
      buildSeededSnapshot({ id: USER_ID, email: 'ana@example.com', name: 'Ana', password: 'pass1234' }),
    ),
  )
}

function seedStore() {
  savePersistedState({
    locale: 'es',
    transactions: [],
    categories: PREDEFINED_CATEGORIES,
    investments: [],
    investmentOwnerships: [],
    budgets: [],
    recurrings: [],
  })
}

async function renderPage() {
  render(
    <AuthProvider>
      <AppStateProvider bootDelayMs={0}>
        <TransactionsPage />
      </AppStateProvider>
    </AuthProvider>,
  )
  const desc = await screen.findByLabelText(/Descripción|Description/, {}, { timeout: 8000 })
  return desc.closest('form') as HTMLElement
}

function pickCategory(form: HTMLElement, name: string) {
  const select = form.querySelector('select[name="categoryId"]') as HTMLSelectElement | null
  if (select) {
    const option = Array.from(select.options).find((o) => o.textContent === name)
    if (option) fireEvent.change(select, { target: { value: option.value } })
    return
  }
  const combobox = within(form).getByRole('combobox', {
    name: /Categor/i,
  }) as HTMLInputElement
  fireEvent.focus(combobox)
  fireEvent.change(combobox, { target: { value: name } })
  fireEvent.keyDown(combobox, { key: 'Enter' })
}

describe('TransactionsPage shared expense split (HU-0.7 / MYF-27)', () => {
  beforeEach(() => {
    localStorage.clear()
    seedAuthAsMember()
    persistGroupSnapshot(seedGroupSnapshot())
    seedStore()
  })
  afterEach(() => {
    localStorage.clear()
    clearGroupSnapshot()
  })

  it('shows the balances link and the group context selector on the form', async () => {
    const form = await renderPage()
    expect(await screen.findByRole('link', { name: /balances de deudas/i })).toBeInTheDocument()
    expect(form.querySelector('select[name="groupId"]')).toBeInTheDocument()
  })

  it('creates a shared expense split in equal parts and persists it', async () => {
    const form = await renderPage()

    await waitFor(() => {
      const option = Array.from(form.querySelectorAll('option')).find((o) => o.textContent === 'Hogar')
      expect(option).toBeDefined()
    })
    fireEvent.change(form.querySelector('select[name="groupId"]') as HTMLSelectElement, {
      target: { value: 'grp-hogar' },
    })
    const shareBox = form.querySelector('input[name="shared"]') as HTMLInputElement
    expect(shareBox).toBeTruthy()
    fireEvent.click(shareBox)
    expect(await screen.findByText(/Reparto:/i)).toBeInTheDocument()

    fireEvent.change(within(form).getByLabelText(/Descripción|Description/), {
      target: { value: 'Cena hogar' },
    })
    fireEvent.change(within(form).getByLabelText(/Importe|Amount/), {
      target: { value: '45' },
    })
    fireEvent.change(form.querySelector('select[name="type"]') as HTMLSelectElement, {
      target: { value: 'expense' },
    })
    pickCategory(form, 'Alimentación')

    fireEvent.click(within(form).getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => {
      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      expect(persisted.expenseSplits).toHaveLength(1)
    })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const split = stored.expenseSplits[0]
    expect(split.method).toBe('equal')
    expect(split.groupId).toBe('grp-hogar')
    expect(split.paidBy).toBe(USER_ID)
    const sum = split.shares.reduce((a: number, s: { amount: number }) => a + s.amount, 0)
    expect(sum).toBeCloseTo(45, 2)
  })

  it('blocks saving while the split sum does not match the total', async () => {
    const form = await renderPage()
    await waitFor(() => {
      const option = Array.from(form.querySelectorAll('option')).find((o) => o.textContent === 'Hogar')
      expect(option).toBeDefined()
    })
    fireEvent.change(form.querySelector('select[name="groupId"]') as HTMLSelectElement, {
      target: { value: 'grp-hogar' },
    })
    const shareBox = form.querySelector('input[name="shared"]') as HTMLInputElement
    fireEvent.click(shareBox)
    await screen.findByText(/Reparto:/i)

    fireEvent.change(within(form).getByLabelText(/Descripción|Description/), {
      target: { value: 'Cena parcial' },
    })
    fireEvent.change(within(form).getByLabelText(/Importe|Amount/), {
      target: { value: '45' },
    })
    fireEvent.change(form.querySelector('select[name="type"]') as HTMLSelectElement, {
      target: { value: 'expense' },
    })
    pickCategory(form, 'Alimentación')

    // Switch to fixed amounts (Ana + José = 2 members), fill too little.
    fireEvent.change(form.querySelector('select[name="splitMethod"]') as HTMLSelectElement, {
      target: { value: 'amounts' },
    })
    const amountInputs = form.querySelectorAll('input[name^="share-"]')
    expect(amountInputs.length).toBe(2)
    fireEvent.change(amountInputs[0], { target: { value: '10' } })
    fireEvent.change(amountInputs[1], { target: { value: '10' } })

    fireEvent.click(within(form).getByRole('button', { name: /Guardar|Save/ }))
    expect(await screen.findByText(/Los importes deben sumar/i)).toBeInTheDocument()
    // Nothing gets persisted.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.expenseSplits ?? []).toHaveLength(0)
  })
})