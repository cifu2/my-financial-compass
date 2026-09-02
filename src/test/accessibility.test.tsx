import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import App from '../App'
import { savePersistedState } from '../lib/storageService'
import { seedAuthSession } from './authSeed'
import { PREDEFINED_CATEGORIES } from '../features/categories/data/predefined'

/**
 * Automated accessibility smoke test (WCAG 2.1 AA, transversal requirement).
 *
 * Renders the real <App /> on every main section and runs axe against the
 * rendered DOM. jsdom cannot compute layout, so color-contrast is reported as
 * "incomplete" rather than a violation; the structural rules that matter for
 * keyboard/screen-reader users (labels, landmarks, ARIA, names, focus) still
 * run and must be clean.
 */

const ROUTES: Array<{ key: string; hash: string }> = [
  { key: 'dashboard', hash: '#/' },
  { key: 'transactions', hash: '#/transactions' },
  { key: 'recurring', hash: '#/recurring' },
  { key: 'budgets', hash: '#/budgets' },
  { key: 'investments', hash: '#/investments' },
  { key: 'balances', hash: '#/balances' },
  { key: 'settings', hash: '#/settings' },
]

const GUEST_ROUTES: Array<{ key: string; hash: string }> = [
  { key: 'login', hash: '#/login' },
  { key: 'register', hash: '#/register' },
  { key: 'forgot-password', hash: '#/forgot-password' },
]

async function assertNoViolations(hash: string) {
  const results = await axe(document.body)
  const ids = results.violations.map((v) => `${v.id}: ${v.help}`)
  expect(ids, `WCAG 2.1 AA axe violations on ${hash}`).toEqual([])
}

describe('Accessibility (WCAG 2.1 AA) — axe smoke test', () => {
  it.each(ROUTES)('renders $key without axe violations', async ({ hash }) => {
    window.location.hash = hash
    seedAuthSession({ name: 'Ana', currency: 'EUR' })
    savePersistedState({
      locale: 'es',
      transactions: [],
      categories: PREDEFINED_CATEGORIES,
      investments: [],
      investmentOwnerships: [],
      budgets: [],
      recurrings: [],
    })
    render(<App />)
    await screen.findByRole('heading', { level: 1 }, { timeout: 6000 })
    await assertNoViolations(hash)
  })

  it.each(GUEST_ROUTES)('renders guest auth screen $key without axe violations', async ({ hash }) => {
    window.location.hash = hash
    localStorage.clear()
    render(<App />)
    await screen.findByRole('heading', { level: 1 }, { timeout: 6000 })
    await assertNoViolations(hash)
  })
})