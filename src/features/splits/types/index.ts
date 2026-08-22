/**
 * Expense splitting and debt settlement (HU-0.7 / MYF-27).
 *
 * A shared expense is a group transaction (transaction.groupId set) with a
 * companion `ExpenseSplit` row that describes how that expense is distributed
 * among members and who fronted the money. Splits are stored per transaction
 * (one split per group transaction) and drive the per-member debt balance.
 *
 * Accounting model: when a split expense is recorded, the payer has paid the
 * full amount and every participant (including the payer) owes their share.
 * The group debt is the aggregation of those shares across the whole group,
 * reduced by any registered settlement and then simplified into a minimal
 * set of pairwise debts.
 */

/** How the total is distributed among the participants. */
export type SplitMethod = 'equal' | 'percentages' | 'amounts' | 'weights'

/** One row of a split: the share a participant is responsible for. */
export interface ExpenseSplitShare {
  userId: string
  /** Amount in the group currency (positive, rounded to cents). */
  amount: number
}

/**
 * Splitting definition of a single group expense. `paidBy` is the member who
 * fronted the money; `participants` lists the members included in the split
 * (must match the group membership at save time). A split is created together
 * with the transaction that produces it.
 */
export interface ExpenseSplit {
  /** Owning group ledger transaction id. */
  transactionId: string
  /** Group the expense belongs to (must equal transaction.groupId). */
  groupId: string
  /** Id of the member who paid the full amount. */
  paidBy: string
  /** Which distribution rule produced the shares. */
  method: SplitMethod
  /** Per-participant responsibility; the sum equals the expense total. */
  shares: ExpenseSplitShare[]
}

/**
 * A recorded payment between two members of a group that reduces the debt
 * computed from split expenses. Settlements are kept as an append-only
 * history (HU-0.7 acceptance: "las liquidaciones quedan en el histórico").
 */
export interface Settlement {
  id: string
  groupId: string
  /** Member who hands the money. */
  fromUserId: string
  /** Member who receives the money. */
  toUserId: string
  /** Amount settled in the group currency (positive). */
  amount: number
  /** ISO yyyy-mm-dd date of the payment. */
  date: string
  /** Optional free-text note (e.g. "cena del sábado"). */
  note?: string
  createdAt: string
}

/**
 * Computed pairwise simplified debt. "Ana debe 45 € a Luis" is rendered as
 * { debtorId: 'ana', creditorId: 'luis', amount: 45 }. These rows are never
 * stored: they derive from splits + settlements via `computeBalances`.
 */
export interface DebtBalance {
  groupId: string
  debtorId: string
  creditorId: string
  amount: number
}

/** Valid values for {@link DebtBalance.groupId} / {@link ExpenseSplit.groupId}. */
export const SPLIT_METHODS: readonly SplitMethod[] = [
  'equal',
  'percentages',
  'amounts',
  'weights',
] as const

export function isSplitMethod(value: unknown): value is SplitMethod {
  return typeof value === 'string' && (SPLIT_METHODS as readonly string[]).includes(value)
}