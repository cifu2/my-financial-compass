import { describe, expect, it, afterEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AppStateProvider, type Category } from '../../state/AppState'
import RecurringPage from '../../pages/RecurringPage'
import { formatDate } from '../../lib/dates'

const categories: Category[] = [
  { id: 'cat-book', name: 'Suscripción', type: 'expense', isActive: true },
  { id: 'cat-food', name: 'Comida', type: 'expense', isActive: true },
]

function renderPage() {
  return render(
    <AppStateProvider initialStore={{ categories }}>
      <RecurringPage />
    </AppStateProvider>,
  )
}

function configForm(): HTMLElement {
  return Array.from(document.querySelectorAll('form'))[0] as HTMLElement
}

function daysFromNow(days: number): string {
  return formatDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000), 'es')
}

function fillValidConfig(form: HTMLElement, concept: string, amount = '15,00') {
  fireEvent.change(within(form).getByLabelText(/Descripción/), {
    target: { value: concept },
  })
  fireEvent.change(within(form).getByLabelText(/Importe/), {
    target: { value: amount },
  })
  fireEvent.change(form.querySelector('select[name="type"]') as HTMLSelectElement, {
    target: { value: 'expense' },
  })
  fireEvent.change(
    within(form).getByLabelText(/Categoría/) as HTMLSelectElement,
    { target: { value: 'cat-book' } },
  )
  fireEvent.change(within(form).getByRole('combobox', { name: /Frecuencia/ }), {
    target: { value: 'monthly' },
  })
}

function createValidRecurrence(concept: string) {
  fillValidConfig(configForm(), concept)
  fireEvent.click(within(configForm()).getByRole('button', { name: /Guardar/ }))
  // the saved toast shows; dismiss it so later status roles are unambiguous
  const status = screen.queryByRole('status')
  if (status) {
    const close = within(status).queryByRole('button', { name: 'Cerrar' })
    if (close) fireEvent.click(close)
  }
}

describe('RecurringPage (MYF-9 recurring transactions)', () => {
  afterEach(() => localStorage.clear())

  it('renders the configuration panel with a frequency selector', () => {
    renderPage()
    const form = configForm()
    expect(
      within(form).getByRole('combobox', { name: /Frecuencia/ }),
    ).toBeInTheDocument()
    expect(
      within(form).getByLabelText(/Fecha de inicio/),
    ).toBeInTheDocument()
  })

  it('shows the execution day selector for month-based frequencies', () => {
    renderPage()
    const form = configForm()
    expect(
      within(form).queryByLabelText(/Día de ejecución/),
    ).not.toBeInTheDocument()
    fireEvent.change(within(form).getByRole('combobox', { name: /Frecuencia/ }), {
      target: { value: 'monthly' },
    })
    expect(
      within(form).getByLabelText(/Día de ejecución/),
    ).toBeInTheDocument()
  })

  it('creates a recurrence and lists it with an upcoming execution', () => {
    renderPage()
    fillValidConfig(configForm(), 'Netflix', '15,99')

    // live preview shows the next execution
    expect(screen.getByText(/Se repetirá cada Mensual/)).toBeInTheDocument()
    expect(screen.getByText(/Próxima ejecución:/)).toBeInTheDocument()

    fireEvent.click(within(configForm()).getByRole('button', { name: /Guardar/ }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Transacción recurrente guardada',
    )
    expect(screen.getByRole('cell', { name: /Netflix/ })).toBeInTheDocument()
    // upcoming list also surfaces the recurrence
    expect(screen.getAllByText(/Netflix/).length).toBeGreaterThan(1)
    // today's execution is due and got materialized into the ledger
    expect(screen.getAllByText(daysFromNow(0)).length).toBeGreaterThan(0)
  })

  it('shows validation errors for gaps in the config', () => {
    renderPage()
    fireEvent.click(within(configForm()).getByRole('button', { name: /Guardar/ }))
    expect(
      screen.getAllByText(/Este campo es obligatorio\./i).length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('deletes a recurrence after confirmation and offers undo', () => {
    renderPage()
    createValidRecurrence('Gimnasio')
    expect(screen.getByRole('cell', { name: /Gimnasio/ })).toBeInTheDocument()

    const row = screen.getByRole('row', { name: /Gimnasio/ })
    fireEvent.click(within(row).getByRole('button', { name: /Eliminar/ }))
    const dialog = screen.getByRole('alertdialog', {
      name: /¿Eliminar esta recurrencia\?/,
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /^Eliminar$/ }))

    expect(
      screen.queryByRole('cell', { name: /Gimnasio/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(screen.getByRole('cell', { name: /Gimnasio/ })).toBeInTheDocument()
  })

  it('pauses and resumes a recurrence', () => {
    renderPage()
    createValidRecurrence('Spotify')
    const row = () => screen.getByRole('row', { name: /Spotify/ })

    fireEvent.click(within(row()).getByRole('button', { name: /Pausar/ }))
    expect(within(row()).getByText('Pausada')).toBeInTheDocument()

    fireEvent.click(within(row()).getByRole('button', { name: /Reanudar/ }))
    expect(within(row()).getByText('Activa')).toBeInTheDocument()
  })

  it('opens the edit form for a recurrence', () => {
    renderPage()
    createValidRecurrence('Stock')
    const row = screen.getByRole('row', { name: /Stock/ })
    fireEvent.click(within(row).getByRole('button', { name: /Editar/ }))
    expect(screen.getByRole('heading', { name: 'Editar' })).toBeInTheDocument()
    expect(
      (within(configForm()).getByLabelText(/Descripción/) as HTMLInputElement)
        .value,
    ).toBe('Stock')
  })
})