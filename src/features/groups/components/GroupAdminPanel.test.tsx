import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import App from '../../../App'
import { savePersistedState, STORAGE_KEY } from '../../../lib/storageService'
import { buildSeededSnapshot } from '../../../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../../../features/auth/services/authStore'
import {
  clearGroupSnapshot,
  persistGroupSnapshot,
} from '../../../features/groups/services/groupStore'
import { seedGroupSnapshot } from '../../../features/groups/data/seeds'
import { PREDEFINED_CATEGORIES } from '../../../features/categories/data/predefined'

/**
 * Group deletion (HU-0.12): the settings panel exposes a double-confirmation
 * dialog where the admin chooses archive/delete, is reminded about member
 * notification, and must type the group name before the destruction happens.
 */
const USER_ID = 'usr-ana'

function seedAdmin() {
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
    transactions: [
      {
        id: 'tx-1',
        concept: 'Luz común',
        amount: 50,
        date: '2026-08-10',
        type: 'expense',
        categoryId: 'cat-hogar',
        groupId: 'grp-hogar',
        userId: USER_ID,
      },
    ],
    categories: PREDEFINED_CATEGORIES,
    investments: [],
    investmentOwnerships: [],
    budgets: [],
    recurrings: [],
  })
  window.location.hash = '#/settings'
}

async function renderSettings() {
  render(<App />)
  // The group-them panel lists the Hogar group once the settings page mounts.
  await screen.findByText('Hogar')
}

describe('GroupAdminPanel — borrado con doble confirmación (HU-0.12)', () => {
  beforeEach(() => {
    window.location.hash = ''
  })
  afterEach(() => {
    localStorage.clear()
    clearGroupSnapshot()
  })

  it('removes the group and its shared rows after the double confirmation', async () => {
    seedAdmin()
    await renderSettings()

    // Step 1: choose the destructive mode.
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('radio', { name: /Eliminar el grupo y sus datos/ }))
    expect(
      within(dialog).getByText(/no se puede deshacer/i),
    ).toBeInTheDocument()

    // The group has two members (Ana + José); the notice step is on by default.
    expect(within(dialog).getByText(/2 miembros/)).toBeInTheDocument()

    // Step 2: the final confirmation requires typing the group name.
    fireEvent.click(within(dialog).getByRole('button', { name: /Continuar/ }))
    const confirmButton = within(dialog).getByRole('button', {
      name: /Eliminar definitivamente/,
    }) as HTMLButtonElement
    expect(confirmButton.disabled).toBe(true)
    fireEvent.change(within(dialog).getByLabelText('Actividad del grupo — Nombre'), {
      target: { value: 'Hoga' },
    })
    expect(within(dialog).getByText(/El nombre no coincide/i)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Actividad del grupo — Nombre'), {
      target: { value: 'Hogar' },
    })
    expect(confirmButton.disabled).toBe(false)
    fireEvent.click(confirmButton)

    // The group is gone and its shared transaction was purged.
    await screen.findByText(/Grupo eliminado/i)
    expect(screen.queryByText('Hogar')).not.toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.transactions.some((t: { id: string }) => t.id === 'tx-1')).toBe(false)
  })

  it('archives the group keeping its data and offering restore', async () => {
    seedAdmin()
    await renderSettings()

    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }))
    const dialog = await screen.findByRole('alertdialog')
    // Archive is the default safe option; just continue.
    fireEvent.click(within(dialog).getByRole('button', { name: /Continuar/ }))
    fireEvent.change(within(dialog).getByLabelText('Actividad del grupo — Nombre'), {
      target: { value: 'Hogar' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /Archivar el grupo/ }))

    await screen.findByText(/Grupo archivado/i)
    // The group moves to the archived list and can be restored by an admin.
    expect(await screen.findByRole('button', { name: /Restaurar/ })).toBeInTheDocument()
    // Shared financial rows are untouched by an archive.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.transactions.some((t: { id: string }) => t.id === 'tx-1')).toBe(true)
  })
})