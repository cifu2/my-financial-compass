import { describe, it, expect } from 'vitest'
import type { ExpenseSplit, Settlement } from '../types'
import type { Transaction } from '../../../state/AppState'
import { computeBalances, expenseLedger } from './debtBalances'

const GID = 'grp-hogar'

function tx(id: string, amount: number): Transaction {
  return { id, concept: 'x', amount, date: '2026-07-01', type: 'expense', categoryId: 'c1', groupId: GID }
}

function split(transactionId: string, paidBy: string, shares: Array<[string, number]>, groupId = GID): ExpenseSplit {
  return { transactionId, groupId, paidBy, method: 'amounts', shares: shares.map(([userId, amount]) => ({ userId, amount })) }
}

function settlement(fromUserId: string, toUserId: string, amount: number, groupId = GID): Settlement {
  return { id: 's', groupId, fromUserId, toUserId, amount, date: '2026-07-02', createdAt: '2026-07-02T00:00:00Z' }
}

describe('expenseLedger', () => {
  it('builds the net ledger for split expenses', () => {
    const transactions = [tx('t1', 60)]
    const splits = [split('t1', 'ana', [['ana', 20], ['jose', 20], ['lucia', 20]])]
    const ledger = expenseLedger(transactions, splits, GID)
    // Ana fronted 60, owns 20 → net +40; the others owe 20 each.
    expect(ledger.get('ana')).toBe(4000)
    expect(ledger.get('jose')).toBe(-2000)
    expect(ledger.get('lucia')).toBe(-2000)
  })

  it('skips transactions not in the group', () => {
    const ledger = expenseLedger([tx('t1', 60)], [split('t1', 'ana', [['ana', 60]], 'grp-other')], GID)
    expect(ledger.size).toBe(0)
  })
})

describe('computeBalances', () => {
  it('"Ana debe 45 € a Luis" example', () => {
    // Ana, José and Lucía go out. Ana paid 45 and the cost is split equally:
    // 45/3 = 15 each. Ana's share is 15, so Lucía and José owe Ana 15 each.
    const transactions = [tx('t1', 45)]
    const splits = [split('t1', 'ana', [['ana', 15], ['jose', 15], ['lucia', 15]])]
    const view = computeBalances(GID, transactions, splits, [])
    // Because greedy pairs largest debtor (<-> largest creditor) it simplifies.
    const totalOwed = view.balances.reduce((a, b) => a + b.amount, 0)
    expect(totalOwed).toBeCloseTo(30, 2)
    expect(view.positions.get('ana')).toBeCloseTo(30, 2)
    expect(view.positions.get('jose')).toBeCloseTo(-15, 2)
    expect(view.positions.get('lucia')).toBeCloseTo(-15, 2)
  })

  it('simplifies to a single edge when the topology allows', () => {
    // Two expenses: Ana fronted 60 (3×20) and José fronted 30 (2×15).
    // Net: Ana +40 (60 − 20), José −5 (−20 −15 +30), Lucía −35 (−20 −15).
    const transactions = [tx('t1', 60), tx('t2', 30)]
    const splits = [
      split('t1', 'ana', [['ana', 20], ['jose', 20], ['lucia', 20]]),
      split('t2', 'jose', [['jose', 15], ['lucia', 15]]),
    ]
    const view = computeBalances(GID, transactions, splits, [])
    const totalDebt = view.balances.reduce((a, b) => a + b.amount, 0)
    expect(totalDebt).toBeCloseTo(40, 2)
    const luciaEdge = view.balances.find((b) => b.debtorId === 'lucia')
    const joseEdge = view.balances.find((b) => b.debtorId === 'jose')
    expect(luciaEdge?.creditorId).toBe('ana')
    expect(luciaEdge?.amount).toBeCloseTo(35, 2)
    expect(joseEdge?.creditorId).toBe('ana')
    expect(joseEdge?.amount).toBeCloseTo(5, 2)
  })

  it('applies settlements to reduce the debt', () => {
    const transactions = [tx('t1', 90)]
    const splits = [split('t1', 'ana', [['ana', 30], ['jose', 30], ['lucia', 30]])]
    const settled = [settlement('jose', 'ana', 30)]
    const view = computeBalances(GID, transactions, splits, settled)
    const totalDebt = view.balances.reduce((a, b) => a + b.amount, 0)
    // José paid his 30 back; only Lucía still owes Ana 30.
    expect(totalDebt).toBeCloseTo(30, 2)
    expect(view.positions.get('jose')).toBeCloseTo(0, 2)
    expect(view.positions.get('lucia')).toBeCloseTo(-30, 2)
  })
})