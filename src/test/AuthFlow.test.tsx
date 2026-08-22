import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { seedAuthSession } from './authSeed'

/**
 * End-to-end authentication flows (MYF-20): the session gate in a real <App />.
 */
describe('Auth flows (MYF-20)', () => {
  beforeEach(() => {
    localStorage.clear()
    window.sessionStorage.clear()
    window.location.hash = '#/'
  })
  afterEach(() => {
    localStorage.clear()
    window.sessionStorage.clear()
  })

  it('shows the login screen to an anonymous visitor (no dashboard)', async () => {
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
  })

  it('registers a new account and reaches the dashboard', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Iniciar sesión' })
    fireEvent.click(screen.getByRole('link', { name: 'Regístrate' }))

    await screen.findByRole('heading', { name: 'Crear cuenta' })
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Carla' } })
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'carla@test.local' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'segura123' } })
    fireEvent.change(screen.getByLabelText(/Repite la contraseña/), {
      target: { value: 'segura123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    // Auto-login lands on the dashboard.
    expect(
      await screen.findByRole('link', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    // The new identity appears in the header.
    expect(screen.getByText('Carla')).toBeInTheDocument()
    // The session is persisted.
    expect(localStorage.getItem('my-financial-compass:auth:v1')).toContain('carla@test.local')
  })

  it('logs out from the header and requires login again', async () => {
    seedAuthSession({ email: 'ana@test.local', name: 'Ana' })
    render(<App />)
    await screen.findByRole('link', { name: 'Dashboard' })
    const logout = screen.getByRole('button', { name: /Salir|Logout/ })
    fireEvent.click(logout)
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
  })

  it('rejects wrong credentials with a clear error', async () => {
    // Create an account first, then sign out.
    await registerThenLogout()
    render(<App />)
    await screen.findByRole('heading', { name: 'Iniciar sesión' })
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: 'carla@test.local' },
    })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: 'incorrecta' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Email o contraseña incorrectos.')
  })

  it('validates a weak password on registration', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Iniciar sesión' })
    fireEvent.click(screen.getByRole('link', { name: 'Regístrate' }))
    await screen.findByRole('heading', { name: 'Crear cuenta' })
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Carla' } })
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: 'carla@test.local' },
    })
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText(/Repite la contraseña/), {
      target: { value: 'abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(
      await screen.findByText(/la contraseña debe tener al menos 8 caracteres/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
  })
})

/** Registers + logs out so a later test can exercise bad credentials. */
async function registerThenLogout() {
  const { unmount } = render(<App />)
  await screen.findByRole('heading', { name: 'Iniciar sesión' })
  fireEvent.click(screen.getByRole('link', { name: 'Regístrate' }))
  await screen.findByRole('heading', { name: 'Crear cuenta' })
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Carla' } })
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: 'carla@test.local' },
  })
  fireEvent.change(screen.getByLabelText(/^Contraseña/), {
    target: { value: 'segura123' },
  })
  fireEvent.change(screen.getByLabelText(/Repite la contraseña/), {
    target: { value: 'segura123' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
  await screen.findByRole('link', { name: 'Dashboard' })
  fireEvent.click(screen.getByRole('button', { name: /Salir|Logout/ }))
  await screen.findByRole('heading', { name: 'Iniciar sesión' })
  unmount()
}