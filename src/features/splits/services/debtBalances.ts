import { toCents, fromCents } from './splitCalculator'
import type { DebtBalance, ExpenseSplit, Settlement } from '../types'
import type { Transaction } from '../../../state/AppState'

/**
 * Per-group debt computation (HU-0.7).
 *
 * Balances are derived (never stored) from two inputs:
 *
 * 1. **Split expenses** (`expenseLedger`): each participant owes its share of
 *    a transaction; the payer has bankrolled the full amount, so the payer's
 *    net position improves by `total − ownShare` while each other participant
 *    must reimburse their share. The resulting ledger is a signed per-member
 *    net: positive = party is owed, negative = party is in the red.
 * 2. **Settlements** (`settleLedger`): a settlement from A to B of X reduces
 *    A's debt to B by X (both edges move by the settled amount).
 *
 * `computeBalances` simplifica the net ledger into a minimal set of pairwise
 * debts: the largest debtor pays the largest creditor until everyone is zero,
 * which keeps the graph acyclic ("Ana debe 45 € a Luis").
 */

/** Net ledger for the group's split expenses (cents, per user). */
export function expenseLedger(
  transactions: Transaction[],
  splits: ExpenseSplit[],
  groupId: string,
): Map<string, number> {
  const ledger = new Map<string, number>()
  const byId = new Map(transactions.map((t) => [t.id, t]))

  for (const split of splits) {
    if (split.groupId !== groupId) continue
    const tx = byId.get(split.transactionId)
    if (!tx || !(tx.amount > 0)) continue
    const totalCents = toCents(tx.amount)
    const payerShare = split.shares.find((s) => s.userId === split.paidBy)?.amount ?? 0
    // The payer fronts the whole amount but keeps their own share.
    ledger.set(split.paidBy, (ledger.get(split.paidBy) ?? 0) + totalCents - toCents(payerShare))
    // Every other participant owes their share.
    for (const share of split.shares) {
      if (share.userId === split.paidBy) continue
      ledger.set(share.userId, (ledger.get(share.userId) ?? 0) - toCents(share.amount))
    }
  }
  return ledger
}

/** Apply settlement rows on top of an expense ledger (same group only). */
export function settleLedger(
  ledger: Map<string, number>,
  settlements: Settlement[],
  groupId: string,
): Map<string, number> {
  const next = new Map(ledger)
  for (const settlement of settlements) {
    if (settlement.groupId !== groupId) continue
    const amount = toCents(settlement.amount)
    next.set(settlement.fromUserId, (next.get(settlement.fromUserId) ?? 0) + amount)
    next.set(settlement.toUserId, (next.get(settlement.toUserId) ?? 0) - amount)
  }
  return next
}

/**
 * Simplify the net ledger into pairwise debts using a greedy largest-first
 * match. Returns a list of "debtor must pay creditor" edges.
 */
export function simplifyBalances(
  groupId: string,
  net: Map<string, number>,
): DebtBalance[] {
  const debtors: Array<{ id: string; cents: number }> = []
  const creditors: Array<{ id: string; cents: number }> = []
  for (const [userId, cents] of net) {
    if (cents < 0) debtors.push({ id: userId, cents: -cents })
    else if (cents > 0) creditors.push({ id: userId, cents })
  }
  debtors.sort((a, b) => b.cents - a.cents)
  creditors.sort((a, b) => b.cents - a.cents)

  const balances: DebtBalance[] = []
  let d = 0
  let c = 0
  while (d < debtors.length && c < creditors.length) {
    const transfer = Math.min(debtors[d].cents, creditors[c].cents)
    if (transfer === 0) break
    balances.push({
      groupId,
      debtorId: debtors[d].id,
      creditorId: creditors[c].id,
      amount: fromCents(transfer),
    })
    debtors[d].cents -= transfer
    creditors[c].cents -= transfer
    if (debtors[d].cents === 0) d += 1
    if (creditors[c].cents === 0) c += 1
  }
  return balances
}

export interface DebtView {
  /** Simplified pairwise debts: "Ana debe 45 € a Luis". */
  balances: DebtBalance[]
  /** Per-member net position in euros (positive = they are owed). */
  positions: LedgerPositions
}

export type LedgerPositions = Map<string, number>

/** Complete debt view for a group (expenses + settlements simplified). */
export function computeBalances(
  groupId: string,
  transactions: Transaction[],
  splits: ExpenseSplit[],
  settlements: Settlement[],
): DebtView {
  const settled = settleLedger(expenseLedger(transactions, splits, groupId), settlements, groupId)
  const positions = new Map<string, number>()
  for (const [userId, cents] of settled) positions.set(userId, fromCents(cents))
  return {
    balances: simplifyBalances(groupId, settled),
    positions,
  }
}

/** Sum of the payer + shares consistency for the UI header previews. */
export function splitTotalMatches(
  txAmount: number,
  shares: Array<{ amount: number }>,
): boolean {
  return shares.reduce((a, b) => a + toCents(b.amount), 0) === toCents(txAmount)
}