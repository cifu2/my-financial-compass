import type { Investment, InvestmentOwnership } from '../types'

/** Current value of one holding, preferring `currentValue` over invested. */
export function nativeValue(investment: Investment): number {
  return investment.currentValue ?? investment.investedAmount
}

/**
 * Portfolio context support (HU-0.9).
 *
 * An investment is **personal** when it carries no `groupId`; it is a
 * **group** asset when it references one. Group assets can be owned by
 * several members with explicit percentages (`InvestmentOwnership` rows whose
 * sum is 100). Depending on the context being rendered, the portfolio shows
 * either the full asset value (group context) or only the proportional share
 * that belongs to the current user (personal context).
 */

export type PortfolioContext =
  | { kind: 'personal'; userId: string }
  | { kind: 'group'; groupId: string }

/**
 * A holding as seen from one context: the raw investment, the fraction of its
 * value that belongs to the context owner (`0..1`), and (for group assets)
 * the full ownership breakdown for display.
 */
export interface PortfolioHolding {
  investment: Investment
  nativeValue: number
  /** Fraction (0..1) of the asset attributed to the context viewer. */
  share: number
  /** Ownership rows of a group asset (empty for personal assets). */
  ownership: InvestmentOwnership[]
}

/** Percentage row that a user owns in an investment (100 when personal). */
export function ownershipPercentage(
  investment: Investment,
  ownerships: readonly InvestmentOwnership[],
  userId: string,
): number {
  if (investment.groupId === undefined) return 100
  return ownerships.find(
    (o) => o.investmentId === investment.id && o.userId === userId,
  )?.percentage ?? 0
}

/** Accounting tolerance for ownership percentages summing to 100. */
export const OWNERSHIP_TOLERANCE = 0.001

/** Whether an ownership list accounts for the full asset (sum ≈ 100). */
export function isFullOwnership(rows: readonly InvestmentOwnership[]): boolean {
  const total = rows.reduce((acc, row) => acc + row.percentage, 0)
  return Math.abs(total - 100) <= OWNERSHIP_TOLERANCE
}

/**
 * Holdings visible from the active context:
 *
 * - **personal**: personal assets (100 % owner) plus group assets where the
 *   user holds a share, each valued at the user's percentage.
 * - **group**: every asset of that group at full value, with ownership rows.
 */
export function holdingsForContext(
  investments: readonly Investment[],
  ownerships: readonly InvestmentOwnership[],
  context: PortfolioContext,
): PortfolioHolding[] {
  if (context.kind === 'group') {
    return investments
      .filter((inv) => inv.groupId === context.groupId)
      .map((inv) => ({
        investment: inv,
        nativeValue: nativeValue(inv),
        share: 1,
        ownership: ownerships.filter((o) => o.investmentId === inv.id),
      }))
  }

  const userOwnedGroupAssets = new Set(
    ownerships
      .filter((o) => o.userId === context.userId)
      .map((o) => o.investmentId),
  )
  return investments
    .filter((inv) => {
      if (inv.groupId !== undefined) return userOwnedGroupAssets.has(inv.id)
      // Personal assets belong to the user that created them. Legacy rows
      // without a creator are treated as owned by any authenticated user.
      return inv.createdBy === undefined || inv.createdBy === context.userId
    })
    .map((inv) => {
      const percentage = ownershipPercentage(inv, ownerships, context.userId)
      return {
        investment: inv,
        nativeValue: nativeValue(inv),
        share: percentage / 100,
        ownership: ownerships.filter((o) => o.investmentId === inv.id),
      }
    })
    .filter((holding) => holding.share > 0)
}

/** Total native (unconverted) value of the holdings in a context. */
export function contextNativeValue(holdings: readonly PortfolioHolding[]): number {
  return holdings.reduce(
    (acc, holding) => acc + holding.nativeValue * holding.share,
    0,
  )
}

/** Convenience: converts holdings to their proportional values in place. */
export function shareValue(holding: PortfolioHolding): number {
  return Math.round((holding.nativeValue * holding.share + Number.EPSILON) * 100) / 100
}