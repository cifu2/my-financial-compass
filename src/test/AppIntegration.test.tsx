import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import App from '../App'
import { savePersistedState } from '../lib/storageService'

describe('App integration (MYF-4)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('renders the category management screen with predefined categories', () => {
    window.location.hash = '#/transactions'
    render(<App />)
    // Breadcrumb + section indicator for Transactions
    expect(
      screen.getByText(/Section: Transactions|Sección: Transacciones/i),
    ).toBeInTheDocument()

    // Category manager panel heading + predefined category present
    const categoryHeading = screen.getByRole('heading', {
      name: 'Categorías',
    })
    expect(categoryHeading).toBeInTheDocument()
    const managerPanel = categoryHeading.closest('.panel') as HTMLElement
    expect(within(managerPanel).getByText('Alimentación')).toBeInTheDocument()
    expect(within(managerPanel).getByText('Nómina')).toBeInTheDocument()
  })

  it('creates a transaction using a predefined category via the app', () => {
    window.location.hash = '#/transactions'
    render(<App />)

    // The transaction form is the first form on the page.
    const txForm = Array.from(document.querySelectorAll('form'))[0] as HTMLElement
    fireEvent.change(within(txForm).getByLabelText(/Descripción|Description/), {
      target: { value: 'Pan de molde' },
    })
    fireEvent.change(within(txForm).getByLabelText(/Importe|Amount/), {
      target: { value: '2,10' },
    })

    // With 16 predefined categories the picker is a searchable combobox.
    const combobox = within(txForm).getByRole('combobox', {
      name: /Categor/i,
    }) as HTMLInputElement
    fireEvent.focus(combobox)
    fireEvent.change(combobox, { target: { value: 'Alimentación' } })
    const option = within(txForm)
      .getAllByRole('option')
      .find((o) => o.textContent === 'Alimentación')
    expect(option).toBeTruthy()
    fireEvent.keyDown(combobox, { key: 'Enter' })

    const typeSelect = txForm.querySelector(
      'select[name="type"]',
    ) as HTMLSelectElement
    fireEvent.change(typeSelect, { target: { value: 'expense' } })

    fireEvent.click(
      within(txForm).getByRole('button', { name: /Guardar|Save/ }),
    )

    expect(screen.getByRole('cell', { name: /Pan de molde/ })).toBeInTheDocument()
  })

  it('persists transactions across a refresh (unmount + rerender)', () => {
    window.location.hash = '#/transactions'
    const { unmount } = render(<App />)

    const txForm = Array.from(document.querySelectorAll('form'))[0] as HTMLElement
    fireEvent.change(within(txForm).getByLabelText(/Descripción|Description/), {
      target: { value: 'Café de especialidad' },
    })
    fireEvent.change(within(txForm).getByLabelText(/Importe|Amount/), {
      target: { value: '4,5' },
    })
    const combobox = within(txForm).getByRole('combobox', {
      name: /Categor/i,
    }) as HTMLInputElement
    fireEvent.focus(combobox)
    fireEvent.change(combobox, { target: { value: 'Alimentación' } })
    const option = within(txForm)
      .getAllByRole('option')
      .find((o) => o.textContent === 'Alimentación')
    expect(option).toBeTruthy()
    fireEvent.keyDown(combobox, { key: 'Enter' })

    const typeSelect = txForm.querySelector(
      'select[name="type"]',
    ) as HTMLSelectElement
    fireEvent.change(typeSelect, { target: { value: 'expense' } })

    fireEvent.click(
      within(txForm).getByRole('button', { name: /Guardar|Save/ }),
    )

    // The save effect runs synchronously after the click in act().
    expect(
      localStorage.getItem('my-financial-compass:v1'),
    ).toContain('Café de especialidad')

    // "Refresh" the app: unmount and render a fresh <App />.
    unmount()
    render(<App />)
    expect(
      screen.getAllByRole('cell', { name: /Café de especialidad/ }).length,
    ).toBeGreaterThan(0)
  })

  it('loads a persisted snapshot when localStorage already has data', () => {
    savePersistedState({
      locale: 'es',
      transactions: [
        {
          id: 'persisted-tx',
          concept: 'Gasto del semestre',
          amount: 89.99,
          date: '2026-08-01',
          type: 'expense',
          categoryId: 'cat-salud',
        },
      ],
      categories: [],
      investments: [],
      budgets: [],
      recurrings: [],
    })

    window.location.hash = '#/transactions'
    render(<App />)
    expect(
      screen.getAllByRole('cell', { name: /Gasto del semestre/ }).length,
    ).toBeGreaterThan(0)
  })
})