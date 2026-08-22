export interface Investment {
  id: string
  name: string
  ticker?: string
  type: 'stocks' | 'funds' | 'crypto' | 'bonds' | 'other'
  purchaseDate: string
  quantity: number
  investedAmount: number
  currency: string
  currentValue?: number
  gainLoss?: number
  /**
   * Id of the group this investment belongs to. `undefined` (or null) means a
   * **personal** investment fully owned by the user who created it. Group
   * investments are shared assets with per-member ownership (HU-0.9).
   */
  groupId?: string
  /** Id of the user who created the investment (audit / ownership). */
  createdBy?: string
}

export interface InvestmentTransaction {
  id: string
  investmentId: string
  type: 'buy' | 'sell'
  date: string
  quantity: number
  amount: number
  currency: string
}

/**
 * Per-member share of a group investment. Percentages must sum to 100 across
 * all members (enforced at the service layer). Personal investments carry no
 * ownership rows: their owner holds 100%.
 */
export interface InvestmentOwnership {
  investmentId: string
  userId: string
  /** Percentage of the asset owned by this member (0 < pct <= 100). */
  percentage: number
}