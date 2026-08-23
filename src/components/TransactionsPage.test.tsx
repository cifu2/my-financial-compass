import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, type RenderResult } from '@testing-library/react'
import { AppStateProvider, type Category } from '../state/AppState'
import { AuthProvider } from '../features/auth/state/AuthContext'
import TransactionsPage from '../pages/TransactionsPage'
import { formatDate, todayIso } from '../lib/dates'

/**
 * The shared-expense form (HU-0.7) reads the current session (useAuth) to
 * populate the group selector, so the page needs an auth context even in
 * isolated component tests. Without a session the page falls back to the
 * personal view, which is exactly what these MYF-3 cases exercise.
 */
function renderPage(initialStore?: { categories?: Category[] }) {
  return render(
    <AuthProvider>
      <AppStateProvider
        initialStore={{ categories: initialStore?.categories ?? [] }}
      >
        <TransactionsPage />
      </AppStateProvider>
    </AuthProvider>,
  )
}

function formsOf(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('form'))
}

function txForm(r: RenderResult): HTMLElement {
  return formsOf(r.container)[0]
}

function dateIso(iso: string): string {
  return formatDate(iso, 'es')
}

function futureDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const iso = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  return formatDate(iso, 'es')
}

describe('TransactionsPage (MYF-3 manual entry + validation + confirm + undo)', () => {
  afterEach(() => localStorage.clear())

  it('shows contextual errors when submitting an empty transaction form', () => {
    const r = renderPage()
    const form = txForm(r)
    fireEvent.click(
      within(form as HTMLElement).getByRole('button', { name: /Guardar|Save/ }),
    )
    // concept + amount are required; type + category need a selection.
    // Date is pre-filled with today, so it has no error.
    const requiredErrors = screen.getAllByText(/Este campo es obligatorio\./i)
    const selectErrors = screen.getAllByText(/Seleccione una opción\./i)
    expect(requiredErrors.length).toBeGreaterThanOrEqual(2)
    expect(selectErrors.length).toBeGreaterThanOrEqual(2)
  })

  it('defaults the date to today in DD/MM/YYYY', () => {
    renderPage()
    const dateInput = screen.getByLabelText(/Fecha|Date/) as HTMLInputElement
    expect(dateInput.value).toBe(dateIso(todayIso()))
  })

  it('shows a date error for an impossible date', () => {
    renderPage()
    const dateInput = screen.getByLabelText(/Fecha|Date/) as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '30/02/2026' } })
    fireEvent.blur(dateInput)
    expect(screen.getByText(/fecha válida \(DD\/MM\/AAAA\)/i)).toBeInTheDocument()
  })

  it('rejects a future date', () => {
    renderPage()
    const dateInput = screen.getByLabelText(/Fecha|Date/) as HTMLInputElement
    const tomorrow = futureDate()
    fireEvent.change(dateInput, { target: { value: tomorrow } })
    fireEvent.blur(dateInput)
    expect(screen.getByText(/no puede ser posterior a hoy/i)).toBeInTheDocument()
  })

  it('rejects a zero or negative amount', () => {
    renderPage()
    const amountInput = screen.getByLabelText(/Importe|Amount/) as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '0' } })
    fireEvent.blur(amountInput)
    expect(screen.getByText(/mayor que 0/i)).toBeInTheDocument()
    fireEvent.change(amountInput, { target: { value: '-5' } })
    fireEvent.blur(amountInput)
    expect(screen.getByText(/mayor que 0/i)).toBeInTheDocument()
  })

  it('shows a confirmation toast when a transaction is saved', () => {
    const r = renderPage({
      categories: [{ id: 'cat-food', name: 'Comida', type: 'both', isActive: true }],
    })
    const tx = txForm(r)
    fireEvent.change(within(tx).getByLabelText(/Descripción|Description/), {
      target: { value: 'Café' },
    })
    fireEvent.change(within(tx).getByLabelText(/Importe|Amount/), {
      target: { value: '2,20' },
    })
    fireEvent.change(tx.querySelector('select[name="type"]') as HTMLSelectElement, {
      target: { value: 'expense' },
    })
    fireEvent.change(
      within(tx).getByLabelText(/Categoría|Category/) as HTMLSelectElement,
      { target: { value: 'cat-food' } },
    )
    fireEvent.click(
      within(tx).getByRole('button', { name: /Guardar|Save/ }),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Transacción guardada')
    expect(screen.getByRole('cell', { name: /Café/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('cancel clears the transaction form back to defaults', () => {
    const r = renderPage()
    const form = txForm(r)
    fireEvent.change(within(form).getByLabelText(/Descripción|Description/), {
      target: { value: 'Cancel me' },
    })
    fireEvent.change(within(form).getByLabelText(/Importe|Amount/), {
      target: { value: '9,99' },
    })
    fireEvent.click(
      within(form).getByRole('button', { name: /^Cancelar$/ }),
    )
    expect(within(form).getByLabelText(/Descripción|Description/)).toHaveValue('')
    expect(within(form).getByLabelText(/Importe|Amount/)).toHaveValue('')
    expect(screen.queryByRole('cell', { name: /Cancel me/ })).not.toBeInTheDocument()
  })

  it('creates a transaction, asks for confirmation, and restores it via undo', () => {
    const r = renderPage()

    // 1) add a custom category so the transaction form has an option
    const forms = formsOf(r.container)
    const txForm_ = forms[0]
    const catForm = forms[1] as HTMLElement
    fireEvent.change(within(catForm).getByLabelText(/Nombre|Name/), {
      target: { value: 'Mascotas' },
    })
    fireEvent.change(catForm.querySelector('select[name="categoryType"]') as HTMLSelectElement, {
      target: { value: 'expense' },
    })
    fireEvent.click(within(catForm).getByRole('button', { name: /Guardar|Save/ }))
    expect(screen.getAllByText(/Mascotas/).length).toBeGreaterThan(0)

    // 2) add a transaction using that category
    fireEvent.change(within(txForm_).getByLabelText(/Descripción|Description/), {
      target: { value: 'Pan' },
    })
    fireEvent.change(within(txForm_).getByLabelText(/Importe|Amount/), {
      target: { value: '3,50' },
    })
    fireEvent.change(txForm_.querySelector('select[name="type"]') as HTMLSelectElement, {
      target: { value: 'expense' },
    })
    fireEvent.change(within(txForm_).getByLabelText(/Categoría|Category/), {
      target: {
        value: screen
          .getAllByRole('option')
          .find((o) => (o as HTMLOptionElement).text === 'Mascotas')
          ?.getAttribute('value') ?? 'x',
      },
    })
    fireEvent.change(within(txForm_).getByLabelText(/Fecha|Date/), {
      target: { value: dateIso(todayIso()) },
    })
    fireEvent.click(within(txForm_).getByRole('button', { name: /Guardar|Save/ }))
    expect(screen.getByText(/Pan/)).toBeInTheDocument()

    // 3) delete the transaction → confirmation dialog
    const deleteButtons = screen.getAllByRole('button', { name: /Eliminar|Delete/ })
    fireEvent.click(deleteButtons[0])
    const dialog = screen.getByRole('alertdialog', {
      name: /¿Confirmar eliminación\?/,
    })
    expect(dialog).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    // 4) confirm deletion → undo toast appears and row disappears
    fireEvent.click(deleteButtons[0])
    const dialog2 = screen.getByRole('alertdialog', {
      name: /¿Confirmar eliminación\?/,
    })
    fireEvent.click(within(dialog2).getByRole('button', { name: /^Eliminar$/ }))
    expect(screen.queryByRole('cell', { name: /Pan/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument()

    // 5) undo restores the row
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(screen.getByRole('cell', { name: /Pan/ })).toBeInTheDocument()
  })
})