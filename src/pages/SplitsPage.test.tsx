import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import App from '../App'
import { savePersistedState } from '../lib/storageService'
import { seedAuthSession } from '../test/authSeed'
import { persistGroupSnapshot, clearGroupSnapshot } from '../features/groups/services/groupStore'
import { seedGroupSnapshot } from '../features/groups/data/seeds'
import { PREDEFINED_CATEGORIES } from '../features/categories/data/predefined'
import { STORAGE_KEY } from '../lib/storageService'
import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'

/**
 * Group expense split flow (HU-0.7 / MYF-27), exercised through the full app
 * so the persisted localStorage contract (expenseSplits) is asserted.
 */

const USER_ID = 'usr-ana'

function seedAuthAsMember() {
  const snapshot = buildSeededSnapshot({
    id: USER_ID,
    email: 'ana@example.com',
    name: 'Ana',
    password: 'pass1234',
  })
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot))
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

async function renderAt(hash: string) {
  window.location.hash = hash
  render(<App />)
  await screen.findByLabelText(/Descripción|Description/)
}

function pickCategory(form: HTMLElement, name: string) {
  const combobox = within(form).getByRole('combobox', {
    name: /Categor/i,
  }) as HTMLInputElement
  fireEvent.focus(combobox)
  fireEvent.change(combobox, { target: { value: name } })
  fireEvent.keyDown(combobox, { key: 'Enter' })
}

describe('Shared expense split (HU-0.7 / MYF-27)', () => {
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

  it('creates a shared expense split in equal parts and persists it', async () => {
    await renderAt('#/transactions')
    const form = Array.from(document.querySelectorAll('form'))[0] as HTMLElement

    // Wait for auth boot so the group context appears, then select it.
    await within(form).findByRole('option', { name: 'Hogar' })
    fireEvent.change(form.querySelector('select[name="groupId"]') as HTMLSelectElement, {
      target: { value: 'grp-hogar' },
    })
    const shareBox = form.querySelector('input[name="shared"]') as HTMLInputElement
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

    // The full save persists the split entry (contract asserted in storage).
    await waitFor(() => {
      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      expect(persisted.expenseSplits).toHaveLength(1)
    })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const split = stored.expenseSplits[0]
    expect(split.method).toBe('equal')
    expect(split.groupId).toBe('grp-hogar')
    expect(split.paidBy).toBe('usr-ana')
    const sum = split.shares.reduce((a: number, s: { amount: number }) => a + s.amount, 0)
    expect(sum).toBeCloseTo(45, 2)
  })

  it('rejects a split whose amounts do not match the total', async () => {
    await renderAt('#/transactions')
    const form = Array.from(document.querySelectorAll('form'))[0] as HTMLElement

    await within(form).findByRole('option', { name: 'Hogar' })
    fireEvent.change(form.querySelector('select[name="groupId"]') as HTMLSelectElement, {
      target: { value: 'grp-hogar' },
    })
    fireEvent.click(form.querySelector('input[name="shared"]') as HTMLInputElement)
    await screen.findByText(/Reparto:/i)

    fireEvent.change(within(form).getByLabelText(/Descripcion|Description/), {
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
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(persisted.expenseSplits ?? []).toHaveLength(0)
  })

  it('shows the balances link from the transactions page', async () => {
    await renderAt('#/transactions')
    expect(await screen.findByRole('link', { name: /balances de deudas/i })).toBeInTheDocument()
  })
})