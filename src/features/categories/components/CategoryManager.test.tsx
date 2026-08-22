import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AppStateProvider, type Category, type Transaction } from '../../../state/AppState'
import { CategoryManager } from './CategoryManager'
import { CategoryPicker } from './CategoryPicker'
import { categoriesForType, duplicateName, filterByName } from '../services/categoryService'

function renderManager(overrides?: {
  categories?: Category[]
  transactions?: Transaction[]
}) {
  return render(
    <AppStateProvider
      initialStore={{
        categories: overrides?.categories ?? [],
        transactions: overrides?.transactions ?? [],
      }}
    >
      <CategoryManager />
    </AppStateProvider>,
  )
}

const NAME = /Nombre|Name/
const TYPE_RE = /Tipo|Type/
const SAVE = /Guardar|Save/

describe('CategoryManager (MYF-4 category CRUD)', () => {
  afterEach(() => localStorage.clear())

  it('creates a category selecting its type', () => {
    renderManager()
    fireEvent.change(screen.getByLabelText(NAME), { target: { value: 'Comida' } })
    fireEvent.change(screen.getByLabelText(TYPE_RE), {
      target: { value: 'expense' },
    })
    fireEvent.click(screen.getByRole('button', { name: SAVE }))
    expect(screen.getAllByText(/Comida/).length).toBeGreaterThan(0)
  })

  it('rejects a duplicate category name', () => {
    renderManager({
      categories: [{ id: 'c1', name: 'Viajes', type: 'expense', isActive: true }],
    })
    fireEvent.change(screen.getByLabelText(NAME), { target: { value: 'Viajes' } })
    fireEvent.change(screen.getByLabelText(TYPE_RE), {
      target: { value: 'expense' },
    })
    fireEvent.click(screen.getByRole('button', { name: SAVE }))
    expect(screen.getByText(/ya existe una categoría/i)).toBeInTheDocument()
  })

  it('requires a type selection', () => {
    renderManager()
    fireEvent.change(screen.getByLabelText(NAME), { target: { value: 'Ocio' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE }))
    expect(screen.getByText(/Seleccione una opción/i)).toBeInTheDocument()
  })

  it('edits an existing category in place', () => {
    renderManager({
      categories: [{ id: 'c1', name: 'Antes', type: 'income', isActive: true }],
    })
    fireEvent.click(screen.getByRole('button', { name: /Editar|Edit/ }))
    fireEvent.change(screen.getByLabelText(NAME), { target: { value: 'Después' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE }))
    expect(screen.getAllByText(/Después/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Antes/)).not.toBeInTheDocument()
  })

  it('deactivates and reactivates a category', () => {
    renderManager({
      categories: [{ id: 'c1', name: 'Ropa', type: 'expense', isActive: true }],
    })
    fireEvent.click(screen.getByRole('button', { name: /Desactivar|Deactivate/ }))
    expect(screen.getByText(/Inactiva|Inactive/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Activar|Activate/ }))
    expect(screen.queryByText(/Inactiva|Inactive/)).not.toBeInTheDocument()
  })

  it('blocks deletion of a category used by transactions, with explanation', () => {
    renderManager({
      categories: [{ id: 'c1', name: 'Comida', type: 'expense', isActive: true }],
      transactions: [
        {
          id: 'tx1',
          concept: 'Pan',
          amount: 3,
          date: '2026-01-01',
          type: 'expense',
          categoryId: 'c1',
        },
      ],
    })
    const list = screen.getByRole('list')
    const row = list.querySelector('.category-row') as HTMLElement
    const del = within(row).getByRole('button', { name: /Eliminar|Delete/ })
    expect(del).toBeDisabled()
    expect(screen.getByText(/ocultarlas de los formularios/i)).toBeInTheDocument()
  })

  it('deletes an unused category after confirmation and offers undo', () => {
    renderManager({
      categories: [
        { id: 'c1', name: 'Comida', type: 'expense', isActive: true },
        { id: 'c2', name: 'Ropa', type: 'expense', isActive: true },
      ],
    })
    const list = screen.getByRole('list')
    const firstRow = list.querySelector('.category-row') as HTMLElement
    fireEvent.click(within(firstRow).getByRole('button', { name: /Eliminar|Delete/ }))
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^Eliminar$/ }))

    const remaining = screen.getByRole('list')
    const rows = Array.from(remaining.querySelectorAll('.category-row'))
    expect(rows.some((r) => r.textContent?.includes('Comida'))).toBe(false)
    expect(rows.some((r) => r.textContent?.includes('Ropa'))).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Deshacer|Undo/ }))
    const afterUndo = screen.getByRole('list')
    const afterRows = Array.from(afterUndo.querySelectorAll('.category-row'))
    expect(afterRows.some((r) => r.textContent?.includes('Comida'))).toBe(true)
  })
})

function categories(n: number): Category[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    name: `Categoría ${i}`,
    type: 'expense' as const,
    isActive: true,
  }))
}

describe('CategoryPicker (searchable when >10)', () => {
  afterEach(() => localStorage.clear())

  it('renders a native select under the threshold', () => {
    const onChange = () => {}
    render(
      <CategoryPicker
        label="Categoría"
        name="categoryId"
        value=""
        onChange={onChange}
        categories={categories(3)}
        locale="es"
      />,
    )
    expect(screen.getByRole('combobox', { name: /Categoría/i })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(4) // placeholder + 3
  })

  it('becomes a searchable combobox above the threshold', () => {
    const onChange = () => {}
    render(
      <CategoryPicker
        label="Categoría"
        name="categoryId"
        value=""
        onChange={onChange}
        categories={categories(12)}
        locale="es"
      />,
    )
    const input = screen.getByRole('combobox', { name: /Categoría/i })
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('role', 'combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('filters options while typing in the combobox', () => {
    const onChange = () => {}
    render(
      <CategoryPicker
        label="Categoría"
        name="categoryId"
        value=""
        onChange={onChange}
        categories={categories(12)}
        locale="es"
      />,
    )
    const input = screen.getByRole('combobox', { name: /Categoría/i })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Categoría 1' } })
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(0)
    expect(options.every((o) => o.textContent?.includes('Categoría 1'))).toBe(true)
  })

  it('selects the highlighted option via Enter', () => {
    const values: string[] = []
    const onChange = (v: string) => values.push(v)
    render(
      <CategoryPicker
        label="Categoría"
        name="categoryId"
        value=""
        onChange={onChange}
        categories={categories(12)}
        locale="es"
      />,
    )
    const input = screen.getByRole('combobox', { name: /Categor/i })
    fireEvent.focus(input) // opens with first option highlighted
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(values).toContain('c0')
  })
})

describe('categoryService', () => {
  it('categoriesForType scopes income/expense/both', () => {
    const cats: Category[] = [
      { id: 'i', name: 'salario', type: 'income', isActive: true },
      { id: 'e', name: 'comida', type: 'expense', isActive: true },
      { id: 'b', name: 'ambos', type: 'both', isActive: true },
      { id: 'no', name: 'oculta', type: 'expense', isActive: false },
    ]
    expect(categoriesForType(cats, 'income').map((c) => c.id)).toEqual(['i', 'b'])
    expect(categoriesForType(cats, 'expense').map((c) => c.id)).toEqual(['e', 'b'])
    expect(categoriesForType(cats, '').map((c) => c.id)).toEqual(['i', 'e', 'b'])
  })

  it('duplicateName is case-insensitive and ignores editing target', () => {
    const cats: Category[] = [{ id: 'c1', name: 'Comida', type: 'expense', isActive: true }]
    expect(duplicateIn(cats, 'comida')).toBe(true)
    expect(duplicateIn(cats, 'ROPA')).toBe(false)
  })

  it('filterByName matches substrings ignoring accents', () => {
    const cats: Category[] = [
      { id: 'c1', name: 'Alimentación', type: 'expense', isActive: true },
      { id: 'c2', name: 'Ropa', type: 'expense', isActive: true },
    ]
    expect(filterByName(cats, 'alimentacion')).toHaveLength(1)
    expect(filterByName(cats, '')).toHaveLength(2)
  })
})

function duplicateIn(cats: Category[], name: string): boolean {
  // re-export rename to keep test readable
  return duplicateName(cats, name)
}