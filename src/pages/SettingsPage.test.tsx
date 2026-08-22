import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppStateProvider } from '../state/AppState'
import SettingsPage from './SettingsPage'

function renderSettings() {
  return render(
    <AppStateProvider>
      <SettingsPage />
    </AppStateProvider>,
  )
}

describe('SettingsPage (MYF-17)', () => {
  it('renders the language preference form', () => {
    renderSettings()
    expect(screen.getByRole('combobox', { name: /Language/ })).toBeInTheDocument()
  })

  it('links to the beta feedback form and switches text with language', () => {
    renderSettings()

    const link = screen.getByRole('link', { name: 'Enviar feedback' })
    expect(link).toHaveAttribute('href', '/feedback.html')

    fireEvent.change(screen.getByRole('combobox', { name: /Language/ }), {
      target: { value: 'en' },
    })
    expect(screen.getByRole('link', { name: 'Send feedback' })).toHaveAttribute(
      'href',
      '/feedback.html',
    )
  })
})