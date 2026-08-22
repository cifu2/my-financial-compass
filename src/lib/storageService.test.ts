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
  investmentOwnerships: [],
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

    it('round-trips group context fields (HU-0.8)', () => {
      const state = JSON.parse(JSON.stringify(validState)) as PersistedState
      state.recurrings[0] = {
        ...state.recurrings[0],
        groupId: 'grp-hogar',
        createdBy: 'usr-ana',
      }
      state.transactions.push({
        id: 'tx-grp',
        concept: 'Hipoteca compartida',
        amount: 900,
        date: '2026-08-01',
        type: 'expense',
        categoryId: 'cat-1',
        isRecurring: true,
        recurringId: 'rec-1',
        groupId: 'grp-hogar',
      })
      const parsed = parsePersistedState(JSON.stringify(state))
      expect(parsed).not.toBeNull()
      expect(parsed!.recurrings[0].groupId).toBe('grp-hogar')
      expect(parsed!.recurrings[0].createdBy).toBe('usr-ana')
      const groupTx = parsed!.transactions.find((t) => t.id === 'tx-grp')
      expect(groupTx?.groupId).toBe('grp-hogar')
    })

    it('treats missing groupId as undefined for personal data', () => {
      const parsed = parsePersistedState(JSON.stringify(validState))
      expect(parsed!.recurrings[0].groupId).toBeUndefined()
      expect(parsed!.transactions[0].groupId).toBeUndefined()
    })

    it('round-trips investment ownership rows and group meta', () => {
      const state = JSON.parse(JSON.stringify(validState))
      state.investments[0].groupId = 'grp-hogar'
      state.investments[0].createdBy = 'usr-ana'
      state.investmentOwnerships = [
        { investmentId: 'inv-1', userId: 'usr-ana', percentage: 60 },
        { investmentId: 'inv-1', userId: 'usr-jose', percentage: 40 },
      ]
      delete state.version
      delete state.savedAt
      const error = savePersistedState(state)
      expect(error).toBeNull()
      const loaded = loadPersistedState()!
      expect(loaded.investments[0].groupId).toBe('grp-hogar')
      expect(loaded.investments[0].createdBy).toBe('usr-ana')
      expect(loaded.investmentOwnerships).toHaveLength(2)
      expect(loaded.investmentOwnerships[0].percentage).toBe(60)
    })

    it('round-trips expense splits and settlements alongside existing data', () => {
      const state = JSON.parse(JSON.stringify(validState)) as PersistedState
      state.transactions.push({
        id: 'tx-grp',
        concept: 'Cena hogar',
        amount: 45,
        date: '2026-08-20',
        type: 'expense',
        categoryId: 'cat-1',
        groupId: 'grp-hogar',
      })
      state.expenseSplits = [
        {
          transactionId: 'tx-grp',
          groupId: 'grp-hogar',
          paidBy: 'usr-ana',
          method: 'equal',
          shares: [
            { userId: 'usr-ana', amount: 15 },
            { userId: 'usr-jose', amount: 15 },
            { userId: 'usr-lucia', amount: 15 },
          ],
        },
      ]
      state.settlements = [
        {
          id: 'set-1',
          groupId: 'grp-hogar',
          fromUserId: 'usr-jose',
          toUserId: 'usr-ana',
          amount: 15,
          date: '2026-08-21',
          createdAt: '2026-08-21T10:00:00.000Z',
          note: 'cena',
        },
      ]
      const error = savePersistedState(state)
      expect(error).toBeNull()
      const loaded = loadPersistedState()!
      expect(loaded.expenseSplits).toHaveLength(1)
      expect(loaded.expenseSplits![0].method).toBe('equal')
      expect(loaded.expenseSplits![0].paidBy).toBe('usr-ana')
      expect(loaded.settlements).toHaveLength(1)
      expect(loaded.settlements![0].note).toBe('cena')
    })

    it('defaults to empty splits and settlements on legacy snapshots', () => {
      const legacy = JSON.parse(JSON.stringify(validState))
      const parsed = parsePersistedState(JSON.stringify(legacy))
      expect(parsed?.expenseSplits).toEqual([])
      expect(parsed?.settlements).toEqual([])
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