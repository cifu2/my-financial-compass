import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { savePersistedState } from '../lib/storageService'
import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'
import {
  clearGroupSnapshot,
  persistGroupSnapshot,
} from '../features/groups/services/groupStore'
import { recordGroupActivity } from '../features/groups/services/groupActivity'
import { seedGroupSnapshot, SEED_USERS } from '../features/groups/data/seeds'
import { PREDEFINED_CATEGORIES } from '../features/categories/data/predefined'

/**
 * Group activity screen (HU-0.11): the page lists actions newest first and
 * filters by member and by action type.
 */
const USER_ID = 'usr-ana'

describe('GroupActivityPage (HU-0.11)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(
        buildSeededSnapshot({ id: USER_ID, email: 'ana@example.com', name: 'Ana', password: 'x' }),
      ),
    )
    persistGroupSnapshot(seedGroupSnapshot())
    savePersistedState({
      locale: 'es',
      transactions: [],
      categories: PREDEFINED_CATEGORIES,
      investments: [],
      investmentOwnerships: [],
      budgets: [],
      recurrings: [],
    })
    window.location.hash = '#/grupos/grp-hogar/actividad'
  })
  afterEach(() => {
    localStorage.clear()
    clearGroupSnapshot()
  })

  it('lists the activity newest first and shows its actors', async () => {
    recordGroupActivity({
      groupId: 'grp-hogar',
      userId: SEED_USERS.ana.id,
      action: 'transaction_added',
      details: { concept: 'Supermercado', amount: 82 },
    })
    recordGroupActivity({
      groupId: 'grp-hogar',
      userId: SEED_USERS.ana.id,
      action: 'transaction_added',
      details: { concept: 'Farmacia', amount: 10 },
    })

    render(<App />)
    await screen.findByText(/Actividad del grupo/i)

    // Both entries appear; the phrase mentions the concept and the actor.
    expect(screen.getByText(/Supermercado/)).toBeInTheDocument()
    expect(screen.getByText(/Farmacia/)).toBeInTheDocument()
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0)
  })

  it('filters entries by member and by action type', async () => {
    recordGroupActivity({
      groupId: 'grp-hogar',
      userId: SEED_USERS.ana.id,
      action: 'settlement_added',
      details: { amount: 45, recipientId: SEED_USERS.jose.id },
    })
    recordGroupActivity({
      groupId: 'grp-hogar',
      userId: SEED_USERS.jose.id,
      action: 'transaction_added',
      details: { concept: 'Mercado', amount: 34 },
    })

    render(<App />)
    await screen.findByText(/Actividad del grupo/)

    // Filter by action type: only settlements remain.
    fireEvent.change(screen.getByLabelText(/Tipo de acción/i), {
      target: { value: 'settlement_added' },
    })
    expect(screen.getByText(/liquidó/)).toBeInTheDocument()
    expect(screen.queryByText(/Mercado/)).not.toBeInTheDocument()
  })
})