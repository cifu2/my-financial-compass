import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { AppStateProvider, type Category, type Transaction } from '../state/AppState'
import TransactionsPage from '../pages/TransactionsPage'
import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'
import { seedGroupSnapshot, SEED_USERS } from '../features/groups/data/seeds'
import { GROUP_STORAGE_KEY } from '../features/groups/services/groupStore'

const CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Alimentación', type: 'expense', isActive: true },
  { id: 'cat-home', name: 'Hogar', type: 'expense', isActive: true },
]

function anasGroupLedger(): Transaction[] {
  return [
    { id: 'p1', concept: 'Pan', amount: 30, date: '2026-06-02', type: 'expense', categoryId: 'cat-food', userId: SEED_USERS.ana.id },
    { id: 'p2', concept: 'Nómina', amount: 2500, date: '2026-06-01', type: 'income', categoryId: 'cat-food', userId: SEED_USERS.ana.id },
    { id: 'g1', concept: 'Alquiler', amount: 780, date: '2026-06-01', type: 'expense', categoryId: 'cat-home', groupId: 'grp-hogar', userId: SEED_USERS.ana.id },
    { id: 'g2', concept: 'Luz', amount: 80, date: '2026-06-05', type: 'expense', categoryId: 'cat-home', groupId: 'grp-hogar', userId: SEED_USERS.jose.id },
  ]
}

/** Seeds Ana as the session user with José as a co-member of "Hogar". */
function seedAnasGroups() {
  const auth = buildSeededSnapshot({ id: SEED_USERS.ana.id, email: 'ana@example.com', name: 'Ana', password: 'pass1234' })
  auth.users.push({
    id: SEED_USERS.jose.id,
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

function renderPage(initialStore?: { categories?: Category[]; transactions?: Transaction[] }) {
  return render(
    <AppStateProvider
      initialStore={{
        categories: initialStore?.categories ?? CATEGORIES,
        transactions: initialStore?.transactions,
      }}
    >
      <TransactionsPage />
    </AppStateProvider>,
  )
}

describe('TransactionsPage group context (HU-0.6, MYF-22)', () => {
  afterEach(() => localStorage.clear())

  it('shows a context filter and hides group rows in the personal view by default', async () => {
    seedAnasGroups()
    renderPage({ transactions: anasGroupLedger() })

    const filter = await screen.findByLabelText('Filtrar por contexto')
    expect(filter).toHaveValue('personal')

    // Personal view: group rows are hidden.
    expect(screen.queryByRole('cell', { name: 'Alquiler' })).toBeNull()
    expect(screen.queryByRole('cell', { name: 'Luz' })).toBeNull()
    expect(screen.getByRole('cell', { name: 'Pan' })).toBeInTheDocument()
  })

  it('switching the context to a group reveals its rows with origin tags', async () => {
    seedAnasGroups()
    renderPage({ transactions: anasGroupLedger() })

    const filter = (await screen.findByLabelText('Filtrar por contexto')) as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'grp-hogar' } })

    const alquiler = await screen.findByRole('cell', { name: /Alquiler/ })
    expect(alquiler).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /Luz/ })).toBeInTheDocument()
    // Personal rows disappear in a group context.
    expect(screen.queryByRole('cell', { name: /Pan/ })).toBeNull()

    // Group rows carry the group origin tag.
    const row = alquiler.closest('tr') as HTMLElement
    expect(row.querySelector('.origin-tag')?.textContent).toBe('Hogar')
  })

  it('marks a transaction as created by another member', async () => {
    seedAnasGroups()
    renderPage({ transactions: anasGroupLedger() })

    const filter = (await screen.findByLabelText('Filtrar por contexto')) as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'grp-hogar' } })

    const luz = await screen.findByRole('cell', { name: /Luz/ })
    const row = luz.closest('tr') as HTMLElement
    expect(within(row).getByText(/Añadido por José/)).toBeInTheDocument()
    // Rows the viewer created carry no "added by" annotation.
    const alquiler = screen.getByRole('cell', { name: /Alquiler/ })
    const alquilerRow = alquiler.closest('tr') as HTMLElement
    expect(within(alquilerRow).queryByText(/Añadido por/)).toBeNull()
  })

  it('creates a group transaction through the context selector', async () => {
    seedAnasGroups()
    const r = renderPage({ transactions: anasGroupLedger() })

    // The form offers "Personal" plus Ana's groups.
    const ctxSelect = (await screen.findByLabelText('Contexto')) as HTMLSelectElement
    const options = within(ctxSelect).getAllByRole('option').map((o) => (o as HTMLOptionElement).textContent)
    expect(options).toContain('Personal')
    expect(options).toContain('Hogar')

    // Switch the list filter to the group so the form proposes it by default.
    const filter = screen.getByLabelText('Filtrar por contexto') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'grp-hogar' } })

    const form = formsOf(r.container)[0]
    fireEvent.change(within(form).getByLabelText(/Descripción|Description/), {
      target: { value: 'Compra común' },
    })
    fireEvent.change(within(form).getByLabelText(/Importe|Amount/), {
      target: { value: '120' },
    })
    fireEvent.change(form.querySelector('select[name="type"]') as HTMLSelectElement, {
      target: { value: 'expense' },
    })
    fireEvent.change(
      within(form).getByLabelText(/Categoría|Category/) as HTMLSelectElement,
      { target: { value: 'cat-home' } },
    )
    fireEvent.click(within(form).getByRole('button', { name: /^Guardar$/ }))

    await waitFor(() => {
      const cell = screen.getByRole('cell', { name: /Compra común/ })
      expect(cell.closest('tr')?.textContent).toContain('Hogar')
    })
  })

  it('reassigns an existing transaction to a different context', async () => {
    seedAnasGroups()
    const r = renderPage({ transactions: anasGroupLedger() })

    // Personal view: Pan is visible and editable.
    const pan = await screen.findByRole('cell', { name: 'Pan' })
    const editButtons = within(pan.closest('tr') as HTMLElement).getAllByRole('button', { name: /Editar/ })
    fireEvent.click(editButtons[0])

    const ctxSelect = (screen.getByLabelText('Contexto')) as HTMLSelectElement
    fireEvent.change(ctxSelect, { target: { value: 'grp-hogar' } })
    fireEvent.click(
      within(formsOf(r.container)[0]).getByRole('button', { name: /Guardar cambios/ }),
    )

    // The row is no longer personal: switching the list to the group shows it.
    const filter = screen.getByLabelText('Filtrar por contexto') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'grp-hogar' } })
    const moved = await screen.findByRole('cell', { name: /Pan/ })
    expect(moved.closest('tr')?.querySelector('.origin-tag')?.textContent).toBe('Hogar')
  })
})

function formsOf(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('form'))
}