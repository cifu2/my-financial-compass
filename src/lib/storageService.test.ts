import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  parsePersistedState,
  savePersistedState,
  loadPersistedState,
  clearPersistedState,
  STORAGE_KEY,
  StorageError,
  isQuotaError,
} from './storageService'
import type { PersistedState } from './storageService'

const validState: PersistedState = {
  version: 1,
  savedAt: '2026-08-22T00:00:00.000Z',
  locale: 'es',
  transactions: [
    {
      id: 'tx-1',
      concept: 'Pan de pan',
      amount: 2.1,
      date: '2026-08-20',
      type: 'expense',
      categoryId: 'cat-1',
    },
  ],
  categories: [
    { id: 'cat-1', name: 'Alimentación', type: 'expense', isActive: true },
  ],
  investments: [
    {
      id: 'inv-1',
      name: 'Fondo',
      type: 'funds',
      purchaseDate: '2026-01-01',
      quantity: 10,
      investedAmount: 100,
      currency: 'EUR',
    },
  ],
  budgets: [{ id: 'bg-1', categoryId: 'cat-1', limit: 300, period: 'monthly' }],
  recurrings: [
    {
      id: 'rec-1',
      frequency: 'monthly',
      startDate: '2026-01-01',
      nextExecution: '2026-09-01',
      isActive: true,
      template: {
        concept: 'Cuota gimnasio',
        amount: 40,
        type: 'expense',
        categoryId: 'cat-1',
      },
    },
  ],
}

/** Snapshot accepted by savePersistedState (no version/savedAt). */
const snapshot = (() => {
  const { version: _v, savedAt: _s, ...rest } = validState
  void _v
  void _s
  return rest as Omit<PersistedState, 'version' | 'savedAt'>
})()

describe('storageService', () => {
  afterEach(() => localStorage.clear())

  describe('parsePersistedState', () => {
    it('parses a full valid payload', () => {
      const parsed = parsePersistedState(JSON.stringify(validState))
      expect(parsed).not.toBeNull()
      expect(parsed!.version).toBe(1)
      expect(parsed!.transactions).toHaveLength(1)
      expect(parsed!.transactions[0].concept).toBe('Pan de pan')
      expect(parsed!.categories).toHaveLength(1)
      expect(parsed!.investments).toHaveLength(1)
      expect(parsed!.budgets).toHaveLength(1)
      expect(parsed!.recurrings).toHaveLength(1)
    })

    it('returns null on invalid JSON', () => {
      expect(parsePersistedState('{ not json')).toBeNull()
    })

    it('returns null on incompatible schema version', () => {
      const badVersion = { ...validState, version: 99 }
      expect(parsePersistedState(JSON.stringify(badVersion))).toBeNull()
    })

    it('returns empty collections when arrays are missing', () => {
      const partial = JSON.parse(JSON.stringify(validState))
      delete partial.transactions
      delete partial.categories
      const parsed = parsePersistedState(JSON.stringify(partial))
      expect(parsed).not.toBeNull()
      expect(parsed!.transactions).toEqual([])
      expect(parsed!.categories).toEqual([])
    })

    it('drops individual corrupt records without failing the whole payload', () => {
      const state = JSON.parse(JSON.stringify(validState))
      state.transactions.push({ id: 'bad', concept: 42, amount: 'nope' })
      state.transactions.push({
        id: 'tx-2',
        concept: 'Cena',
        amount: 12.5,
        date: '2026-07-01',
        type: 'expense',
        categoryId: 'cat-1',
      })
      const parsed = parsePersistedState(JSON.stringify(state))
      expect(parsed!.transactions).toHaveLength(2)
      expect(parsed!.transactions.some((t) => t.id === 'tx-2')).toBe(true)
    })

    it('falls back to es locale for unknown locales', () => {
      const state = JSON.parse(JSON.stringify(validState))
      state.locale = 'fr'
      const parsed = parsePersistedState(JSON.stringify(state))
      expect(parsed!.locale).toBe('es')
    })
  })

  describe('loadPersistedState / savePersistedState / clearPersistedState', () => {
    it('returns null when nothing is stored', () => {
      expect(loadPersistedState()).toBeNull()
    })

    it('round-trips a saved snapshot', () => {
      const error = savePersistedState(snapshot)
      expect(error).toBeNull()
      const loaded = loadPersistedState()
      expect(loaded).not.toBeNull()
      expect(loaded!.transactions).toHaveLength(1)
      expect(loaded!.locale).toBe('es')
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    })

    it('recovers after clearing', () => {
      savePersistedState(snapshot)
      clearPersistedState()
      expect(loadPersistedState()).toBeNull()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('error handling', () => {
    it('reports quota errors without throwing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = function () {
        const err = new Error('quota') as Error & Record<string, unknown>
        err.name = 'QuotaExceededError'
        throw err
      }
      try {
        const error = savePersistedState(snapshot)
        expect(error).toBeInstanceOf(StorageError)
        expect(isQuotaError(error!.cause)).toBe(true)
      } finally {
        Storage.prototype.setItem = originalSetItem
        warnSpy.mockRestore()
      }
    })
  })
})

// Keep TS happy about the unused helper used above.
export { validState }