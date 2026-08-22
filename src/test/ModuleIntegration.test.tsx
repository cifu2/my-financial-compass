import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App'
import { savePersistedState } from '../lib/storageService'
import { seedAuthSession as seedSession } from './authSeed'
import { PREDEFINED_CATEGORIES } from '../features/categories/data/predefined'
import type { Budget } from '../features/budgeting/types'

/**
 * Module-to-module integration flows (MYF-12 / MYF-14).
 *
 * Each test boots the real <App /> (hash router + AppStateProvider + boot
 * skeleton) and drives every step through the actual UI with Testing Library
 * queries, so the seams between the five modules are exercised end to end:
 *
 *   1. Transactions -> Dashboard (recent + KPIs) with budget impact
 *   2. Recurring -> auto-generation -> Transactions
 *   3. Investment -> Dashboard net worth (module 4 + module 5)
 *   4. Budget (created via UI) -> Transactions -> Budget progress
 *   5. Income transaction -> Dashboard summary + net worth
 *
 * The app hydrates state from localStorage asynchronously after a boot
 * skeleton, so every content assertion goes through async `findBy*` queries,
 * and in-app navigation waits for the target page's form/label to mount.
 */

const SEED_BUDGETS: Budget[] = [
  { id: 'bg-menu', categoryId: 'cat-alimentacion', limit: 100, period: 'monthly' },
]

function seedStore(budgets: Budget[] = []) {
  savePersistedState({
    locale: 'es',
    transactions: [],
    categories: PREDEFINED_CATEGORIES,
    investments: [],
    investmentOwnerships: [],
    budgets,
    recurrings: [],
  })
}

async function renderAt(hash: string) {
  window.location.hash = hash
  render(<App />)
  // Wait for the boot skeleton to resolve and the page content to mount.
  await screen.findByRole('heading', { level: 1 }, { timeout: 6000 })
}

function nav(name: string) {
  fireEvent.click(screen.getByRole('link', { name }))
}

/** Waits until the dashboard has finished rendering its widgets. */
async function awaitDashboard() {
  await screen.findByRole('heading', { name: 'Patrimonio neto' }, { timeout: 6000 })
}

/** Waits until the transactions description field is interactive again. */
async function awaitTxForm() {
  await screen.findByLabelText(/Descripción|Description/, {}, { timeout: 6000 })
}

/** Locates the KPI card for a given summary metric by its heading. */
function kpiCard(label: string) {
  const heading = screen.getAllByRole('heading', { name: label }).find(
    (h) => h.classList.contains('summary-card__label'),
  )
  expect(heading).toBeTruthy()
  return heading!.parentElement as HTMLElement
}

/**
 * Fills the transactions form, saves the row, navigates to the dashboard and
 * runs `action` (which receives the created transaction's concept) once the
 * dashboard widgets are on screen.
 */
async function fillTransaction(opts: {
  label: string
  amount: string
  category: string
  type: 'income' | 'expense'
  /** Assertions run on the dashboard after the transaction is saved. */
  action: () => Promise<void>
}) {
  await fillAndSave(opts)
  nav('Dashboard')
  await awaitDashboard()
  await opts.action()
}

/** Fills the transactions form with the given values and saves it. */
async function fillAndSave(opts: {
  label: string
  amount: string
  category: string
  type: 'income' | 'expense'
}) {
  const txForm = Array.from(document.querySelectorAll('form'))[0] as HTMLElement
  fireEvent.change(within(txForm).getByLabelText(/Descripción|Description/), {
    target: { value: opts.label },
  })
  fireEvent.change(within(txForm).getByLabelText(/Importe|Amount/), {
    target: { value: opts.amount },
  })

  // Select the category first (the picker shows every active category while
  // the type is still unset), then the type so the picker re-scopes.
  const combobox = within(txForm).getByRole('combobox', {
    name: /Categor/i,
  }) as HTMLInputElement
  fireEvent.focus(combobox)
  fireEvent.change(combobox, { target: { value: opts.category } })
  const option = within(txForm)
    .getAllByRole('option')
    .find((o) => o.textContent === opts.category)
  expect(option).toBeTruthy()
  fireEvent.keyDown(combobox, { key: 'Enter' })
  fireEvent.blur(combobox)

  fireEvent.change(
    txForm.querySelector('select[name="type"]') as HTMLSelectElement,
    { target: { value: opts.type } },
  )

  fireEvent.click(within(txForm).getByRole('button', { name: /Guardar|Save/ }))
  const cellName = new RegExp(opts.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  await screen.findByRole('cell', { name: cellName }, { timeout: 6000 })
}

describe('Module-to-module integration (MYF-14)', () => {
  beforeEach(() => {
    localStorage.clear()
    // The app now gates data behind a signed-in session; seed one so these
    // cross-module flows boot into the app instead of the login screen.
    seedSession()
    window.location.hash = ''
  })
  afterEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('creates a transaction that shows on the dashboard and drives budget progress', async () => {
    seedStore(SEED_BUDGETS)
    await renderAt('#/transactions')

    await fillTransaction({
      label: 'Compra mercado',
      amount: '30,00',
      category: 'Alimentación',
      type: 'expense',
      action: async () => {
        // Dashboard: the new transaction appears in recent transactions.
        expect(
          await screen.findByRole('cell', { name: /Compra mercado/ }, { timeout: 6000 }),
        ).toBeInTheDocument()

        // Expenses KPI reflects the 30,00 spent.
        expect(within(kpiCard('Gastos')).getByText(/30,00/)).toBeInTheDocument()

        // Budget snapshot: Alimentación now shows 30,00 / 100,00.
        const snapshot = screen
          .getByRole('heading', { name: 'Estado de presupuestos' })
          .closest('.panel') as HTMLElement
        expect(await within(snapshot).findByText('Alimentación', {}, { timeout: 6000 })).toBeInTheDocument()
        expect(within(snapshot).getByText(/30,00/)).toBeInTheDocument()
        expect(within(snapshot).getByText(/100,00/)).toBeInTheDocument()
      },
    })
  })

  it('configures a recurring that auto-generates into the ledger and dashboard', async () => {
    seedStore()
    await renderAt('#/recurring')

    const form = Array.from(document.querySelectorAll('form'))[0] as HTMLElement
    fireEvent.change(within(form).getByLabelText(/Descripción|Description/), {
      target: { value: 'Netflix' },
    })
    fireEvent.change(within(form).getByLabelText(/Importe|Amount/), {
      target: { value: '13,99' },
    })

    const combobox = within(form).getByRole('combobox', {
      name: /Categor/i,
    }) as HTMLInputElement
    fireEvent.focus(combobox)
    fireEvent.change(combobox, { target: { value: 'Suscripciones' } })
    const option = within(form)
      .getAllByRole('option')
      .find((o) => o.textContent === 'Suscripciones')
    expect(option).toBeTruthy()
    fireEvent.keyDown(combobox, { key: 'Enter' })
    fireEvent.blur(combobox)

    fireEvent.change(form.querySelector('select[name="type"]') as HTMLSelectElement, {
      target: { value: 'expense' },
    })
    fireEvent.change(within(form).getByRole('combobox', { name: /Frecuencia/ }), {
      target: { value: 'monthly' },
    })

    fireEvent.click(within(form).getByRole('button', { name: /Guardar/ }))

    // Saved toast + the recurrence shows up in the recurring list.
    expect(
      await screen.findByText('Transacción recurrente guardada', {}, { timeout: 6000 }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('cell', { name: /Netflix/ }, { timeout: 6000 }),
    ).toBeInTheDocument()

    // The due occurrence (today) was auto-generated into the ledger.
    nav('Transactions')
    await awaitTxForm()
    expect(
      await screen.findByRole('cell', { name: /Netflix/ }, { timeout: 6000 }),
    ).toBeInTheDocument()

    // And the dashboard expenses reflect the generated amount.
    nav('Dashboard')
    await awaitDashboard()
    expect(await within(kpiCard('Gastos')).findByText(/13,99/, {}, { timeout: 6000 })).toBeInTheDocument()
  })

  it('creates an investment that increases the dashboard net worth panel', async () => {
    seedStore([])
    await renderAt('#/investments')

    const form = Array.from(document.querySelectorAll('form'))[0] as HTMLElement
    fireEvent.change(within(form).getByLabelText(/Nombre|Name/), {
      target: { value: 'ETF MSCI World' },
    })
    fireEvent.change(within(form).getByLabelText(/Valor|Value/), {
      target: { value: '1200,00' },
    })
    fireEvent.change(form.querySelector('select[name="invType"]') as HTMLSelectElement, {
      target: { value: 'funds' },
    })
    fireEvent.change(within(form).getByLabelText(/Fecha|Date/), {
      target: { value: '01/01/2026' },
    })
    fireEvent.click(within(form).getByRole('button', { name: /Guardar/ }))
    expect(
      await screen.findByRole('cell', { name: /ETF MSCI World/ }, { timeout: 6000 }),
    ).toBeInTheDocument()

    // Net worth = liquid (0,00) + investments (1200,00).
    nav('Dashboard')
    await awaitDashboard()
    const panel = screen
      .getByRole('heading', { name: 'Patrimonio neto' })
      .closest('.panel') as HTMLElement
    expect(await within(panel).findByText('ETF MSCI World', {}, { timeout: 6000 })).toBeInTheDocument()
    expect(within(panel).getAllByText(/1\.?200,00/).length).toBeGreaterThan(0)
  })

  it('lets a budget defined in the app move progress bars as expenses arrive', async () => {
    seedStore([])
    await renderAt('#/budgets')

    // Create budget via the UI for Alimentación (250 €).
    const form = Array.from(document.querySelectorAll('form'))[0] as HTMLElement
    fireEvent.change(screen.getByRole('combobox', { name: /Categor/i }), {
      target: { value: 'cat-alimentacion' },
    })
    fireEvent.change(screen.getByLabelText(/Límite mensual/), {
      target: { value: '250' },
    })
    fireEvent.click(within(form).getByRole('button', { name: /Guardar/ }))

    // Progress bar shows 0% before spending.
    const budgetCard = () =>
      Array.from(document.querySelectorAll('.budget-card')).find((c) =>
        c.textContent?.includes('Alimentación'),
      )
    await waitFor(() => {
      expect(budgetCard()?.textContent).toMatch(/0%/)
    })

    // Spend via the transactions module.
    nav('Transactions')
    await awaitTxForm()
    await fillAndSave({
      label: 'Supermercado semana',
      amount: '25,00',
      category: 'Alimentación',
      type: 'expense',
    })

    // Return to budgets: the card now shows 10% spent of 250,00.
    nav('Budgets')
    await waitFor(() => {
      const card = budgetCard()
      expect(card?.textContent).toMatch(/10%/)
      expect(card?.textContent).toMatch(/25,00/)
    })

    // And the dashboard budget status reflects it too.
    nav('Dashboard')
    await awaitDashboard()
    const snapshot = screen
      .getByRole('heading', { name: 'Estado de presupuestos' })
      .closest('.panel') as HTMLElement
    expect(
      await within(snapshot).findByText(/25,00/, {}, { timeout: 6000 }),
    ).toBeInTheDocument()
  })

  it('records an income transaction reflected in the monthly summary and net worth', async () => {
    seedStore([])
    await renderAt('#/transactions')

    await fillTransaction({
      label: 'Nómina Acme',
      amount: '1500,00',
      category: 'Nómina',
      type: 'income',
      action: async () => {
        // Monthly summary card: income grows to 1500,00.
        expect(within(kpiCard('Ingresos')).getByText(/1\.?500,00/)).toBeInTheDocument()

        // Net worth: liquid assets are now 1500,00 (no investments).
        const panel = screen
          .getByRole('heading', { name: 'Patrimonio neto' })
          .closest('.panel') as HTMLElement
        expect(
          await within(panel).findAllByText(/1\.?500,00/, {}, { timeout: 6000 }),
        ).toHaveLength(2)
      },
    })
  })
})