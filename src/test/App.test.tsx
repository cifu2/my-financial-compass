import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MainNav } from '../components/MainNav'
import { Breadcrumb } from '../components/Breadcrumb'
import { TextField, SelectField, FormField } from '../components/FormField'
import { matchRoute } from '../router'

describe('Navigation and cross-cutting requirements (MYF-7)', () => {
  it('renders the main navigation menu with all six sections', () => {
    render(<MainNav current={matchRoute('/')} />)
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    for (const label of [
      'Dashboard',
      'Transactions',
      'Recurring',
      'Budgets',
      'Investments',
      'Settings',
    ]) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('marks the active section with aria-current', () => {
    render(<MainNav current={matchRoute('/')} />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('link', { name: 'Transactions' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('updates the active section when the route changes via hash', () => {
    render(<MainNav current={matchRoute('/settings')} />)
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('renders breadcrumb and section indicator for a section', () => {
    render(<Breadcrumb route={matchRoute('/budgets')} />)
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('Home')).toBeInTheDocument()
    expect(within(breadcrumb).getByText('Budgets')).toBeInTheDocument()
    expect(screen.getAllByText(/Section: Budgets/i).length).toBeGreaterThan(0)
  })

  it('gives every form field a visible label wired to its control', () => {
    render(
      <form>
        <TextField label="Concept" name="concept" required />
        <TextField label="Amount" name="amount" type="number" />
        <SelectField
          label="Type"
          name="type"
          defaultValue="income"
          options={[
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
          ]}
        />
      </form>,
    )

    for (const labelText of ['Concept', 'Amount', 'Type']) {
      const label = screen.getByLabelText(new RegExp(labelText))
      expect(label).toBeInTheDocument()
      expect(label).toHaveAccessibleName()
    }

    for (const labelText of ['Concept', 'Amount', 'Type']) {
      const input = screen.getByLabelText(new RegExp(labelText))
      const label = input.closest('.form-field')?.querySelector('.form-field__label')
      expect(label?.textContent).toContain(labelText)
    }
  })

  it('ties required markers to explicit labels and exposes aria-invalid/describedby on errors', () => {
    render(
      <FormField label="Concept" required error="Concept is required">
        {({ id, ariaDescribedBy, ariaInvalid }) => (
          <input
            id={id}
            name="concept"
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
          />
        )}
      </FormField>,
    )
    const label = screen.getByText('Concept')
    expect(label).toBeInTheDocument()
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby')
    expect(screen.getByText('Concept is required')).toBeInTheDocument()
  })
})