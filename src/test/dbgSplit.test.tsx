import { describe, it } from 'vitest'
import { render, fireEvent, waitFor as wait, within, screen } from '@testing-library/react'
import App from '../App'
import { savePersistedState, STORAGE_KEY } from '../lib/storageService'
import { persistGroupSnapshot } from '../features/groups/services/groupStore'
import { seedGroupSnapshot } from '../features/groups/data/seeds'
import { PREDEFINED_CATEGORIES } from '../features/categories/data/predefined'
import { buildSeededSnapshot } from '../features/auth/services/authService'
import { AUTH_STORAGE_KEY } from '../features/auth/services/authStore'

describe('dbg', () => {
  it('debug split', async () => {
    localStorage.clear()
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(buildSeededSnapshot({ id: 'usr-ana', email: 'ana@example.com', name: 'Ana', password: 'pass1234' })))
    persistGroupSnapshot(seedGroupSnapshot())
    savePersistedState({ locale: 'es', transactions: [], categories: PREDEFINED_CATEGORIES, investments: [], investmentOwnerships: [], budgets: [], recurrings: [] })
    window.location.hash = '#/transactions'
    render(<App />)
    await wait(() => document.querySelectorAll('form').length > 0, { timeout: 8000 })
    const form = Array.from(document.querySelectorAll('form'))[0] as HTMLElement
    await within(form).findByRole('option', { name: 'Hogar' })
    fireEvent.change(form.querySelector('select[name="groupId"]') as HTMLSelectElement, { target: { value: 'grp-hogar' } })
    const cb = form.querySelector('input[name="shared"]') as HTMLInputElement
    fireEvent.click(cb)
    await screen.findByText(/Reparto:/i)
    fireEvent.change(within(form).getByLabelText(/Descripción|Description/), { target: { value: 'Cena hogar' } })
    fireEvent.change(within(form).getByLabelText(/Importe|Amount/), { target: { value: '45' } })
    fireEvent.change(form.querySelector('select[name="type"]') as HTMLSelectElement, { target: { value: 'expense' } })
    const combo = form.querySelector('input[role="combobox"]') as HTMLInputElement
    fireEvent.focus(combo); fireEvent.change(combo, { target: { value: 'Alimentación' } }); fireEvent.keyDown(combo, { key: 'Enter' })
    await new Promise((r) => setTimeout(r, 50))
    const alerts = Array.from(document.querySelectorAll('.form-field__error')).map((e) => e.textContent)
    console.log('DBG alerts', JSON.stringify(alerts))
    console.log('DBG split inputs', form.querySelectorAll('input[name^="share-"]').length)
    fireEvent.click(within(form).getByRole('button', { name: /Guardar|Save/ }))
    await new Promise((r) => setTimeout(r, 200))
    console.log('DBG stored', localStorage.getItem(STORAGE_KEY))
    console.log('DBG body', document.body.textContent.slice(-600))
  }, 60000)
})
