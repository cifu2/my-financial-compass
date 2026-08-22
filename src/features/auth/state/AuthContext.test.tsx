import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { buildSeededSnapshot } from '../services/authService'

function Probe() {
  const { status, user, currency, register, login } = useAuth()
  return (
    <div>
      <div data-testid="probe">
        {status}|{user?.email ?? ''}|{currency}
      </div>
      <button
        type="button"
        onClick={() => register({ email: 'ana@test.local', name: 'Ana', password: 'pass1234' })}
      >
        register
      </button>
      <button
        type="button"
        onClick={() => login('ana@test.local', 'pass1234')}
      >
        login
      </button>
    </div>
  )
}

describe('AuthContext (MYF-20)', () => {
  beforeEach(() => localStorage.clear())

  it('resolves a persisted session synchronously from initialSnapshot', () => {
    render(
      <AuthProvider
        initialSnapshot={buildSeededSnapshot({
          email: 'ana@test.local',
          name: 'Ana',
          password: 'pass1234',
        })}
      >
        <Probe />
      </AuthProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('user|ana@test.local|EUR')
  })

  it('boots as guest when no session is persisted', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('guest'))
  })

  it('exposes the primary currency from the profile', () => {
    const snapshot = buildSeededSnapshot({
      email: 'ana@test.local',
      name: 'Ana',
      password: 'pass1234',
    })
    snapshot.users[0].currency = 'USD'
    render(
      <AuthProvider initialSnapshot={snapshot}>
        <Probe />
      </AuthProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('user|ana@test.local|USD')
  })
})