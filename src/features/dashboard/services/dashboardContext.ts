import type { Transaction } from '../../transactions/types'

/**
 * Dashboard view context (HU-0.5).
 *
 * The dashboard renders the same widgets for three scopes:
 *
 * - **`personal`** (default): the viewer's own ledger. Transactions signed to
 *   a group are hidden; legacy rows without an owner count as the viewer's.
 * - **`group`**: one of the viewer's groups. Data of the whole group
 *   aggregates: transactions of the group's shared ledger plus rows owned by
 *   any of its members.
 * - **`all`**: consolidated view of every scope, with origin labels so the
 *   user can tell personal rows from each group's rows.
 *
 * The scoping rules intentionally mirror `budgetCalculator.isInScope` so the
 * whole app answers "which rows does this context see?" in exactly one way.
 */

export type DashboardContext =
  | { kind: 'personal' }
  | { kind: 'all' }
  | { kind: 'group'; groupId: string }

/** Select value for the personal context. */
export const DASHBOARD_CONTEXT_PERSONAL = 'personal'
/** Select value for the consolidated view. */
export const DASHBOARD_CONTEXT_ALL = 'all'

/** Maps a select value to a {@link DashboardContext} ('personal' by default). */
export function parseDashboardContext(value: string): DashboardContext {
  if (value === DASHBOARD_CONTEXT_ALL) return { kind: 'all' }
  if (value === DASHBOARD_CONTEXT_PERSONAL || value === '') return { kind: 'personal' }
  return { kind: 'group', groupId: value }
}

/**
 * Whether a single transaction belongs to the active context. `memberIds`
 * must be the member user ids of `context.groupId` for group contexts; it is
 * ignored otherwise.
 */
export function transactionInContext(
  transaction: Transaction,
  context: DashboardContext,
  currentUserId: string | null,
  memberIds?: ReadonlySet<string>,
): boolean {
  switch (context.kind) {
    case 'all':
      return true
    case 'group': {
      if (transaction.groupId === context.groupId) return true
      // Rows stamped with another group never count toward this group view
      // (they would double-count in the consolidated "all" context).
      if (transaction.groupId != null) return false
      if (memberIds === undefined || memberIds.size === 0) return false
      const owner = transaction.userId ?? currentUserId ?? null
      return owner !== null && memberIds.has(owner)
    }
    case 'personal': {
      if (transaction.groupId != null) return false
      const owner = transaction.userId ?? currentUserId ?? null
      return owner === null || owner === currentUserId
    }
  }
}

/**
 * Transactions visible from the active context (see {@link transactionInContext}).
 * The ledger passed in is the full store; the result feeds every dashboard
 * widget so they stay consistent with the selected context.
 */
export function transactionsInContext(
  transactions: readonly Transaction[],
  context: DashboardContext,
  currentUserId: string | null,
  memberIds?: ReadonlySet<string>,
): Transaction[] {
  return transactions.filter((t) =>
    transactionInContext(t, context, currentUserId, memberIds),
  )
}

/**
 * Stable, plain-string key of the row a transaction belongs to, used to tag
 * the consolidated view ("origin"). `personal` for personal rows, the group
 * id otherwise. Absent `groupId` always means the row is personal.
 */
export function transactionOriginKey(transaction: Transaction): string {
  return transaction.groupId ?? DASHBOARD_CONTEXT_PERSONAL
}