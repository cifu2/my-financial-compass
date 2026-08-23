import type { ExpenseSplitShare, SplitMethod } from '../types'

/**
 * Pure distribution logic for expense splits (HU-0.7).
 *
 * All math is done in integer cents so the distributed shares always add up
 * to the exact expense total (acceptance: "la suma del reparto debe cuadrar
 * con el importe total antes de guardar"). No float drift, no rounding loss.
 *
 * Supported methods:
 * - `equal`: every participant pays the same (the cent remainder is given to
 *   the participants one-by-one).
 * - `percentages`: each participant provides a % of the total (must add up to
 *   100%); shares are the matching fraction of the total.
 * - `amounts`: each participant provides a fixed amount; the amounts must add
 *   up to the total exactly.
 * - `weights`: each participant provides a weight; shares are proportional to
 *   the weight (share = total × weight / Σweight).
 */

export type SplitErrorCode =
  | 'no-participants'
  | 'invalid-input'
  | 'percentages-sum'
  | 'amounts-sum'

export interface SplitInput {
  userId: string
  /** User-provided number: percentage, fixed amount or weight. */
  value?: number
}

export type SplitResult =
  | { ok: true; shares: ExpenseSplitShare[] }
  | { ok: false; error: SplitErrorCode }

export const CENT = 100

/** Convert a euro amount to exact cents. */
export function toCents(value: number): number {
  return Math.round(value * CENT)
}

/** Convert cents back to a euro amount (keeps 2-decimal rounding). */
export function fromCents(cents: number): number {
  return Math.round(cents) / CENT
}

/** Cents of a single amount, truncating the sub-cent remainder. */
function centsOf(euros: number): number {
  return Math.floor(euros * CENT + Number.EPSILON)
}

/**
 * Distribute leftover cents cyclically so the shares always match the total.
 */
function redistributeCents(shares: number[], totalCents: number): void {
  let left = totalCents - shares.reduce((a, b) => a + b, 0)
  let i = 0
  while (left > 0) {
    shares[i % shares.length] += 1
    left -= 1
    i += 1
  }
}

/**
 * Pure split computation. Returns typed shares with exact cent sum, or a
 * machine-readable error code the UI maps to a localized message.
 */
export function computeSplit(
  total: number,
  method: SplitMethod,
  inputs: SplitInput[],
): SplitResult {
  if (!Number.isFinite(total) || total <= 0) return { ok: false, error: 'invalid-input' }
  const members = inputs.filter((p) => p.userId !== '')
  if (members.length === 0) return { ok: false, error: 'no-participants' }
  const totalCents = toCents(total)
  const ids = members.map((m) => m.userId)

  switch (method) {
    case 'equal': {
      const base = Math.floor(totalCents / members.length)
      const cents = new Array<number>(members.length).fill(base)
      redistributeCents(cents, totalCents)
      return { ok: true, shares: toShares(ids, cents) }
    }

    case 'percentages': {
      const values = members.map((m) => m.value)
      if (values.some((v) => v === undefined || !Number.isFinite(v) || (v as number) < 0)) {
        return { ok: false, error: 'invalid-input' }
      }
      const sum = values.reduce((a, b) => (a as number) + (b as number), 0) as number
      if (Math.abs(sum - 100) > 0.001) return { ok: false, error: 'percentages-sum' }
      const cents = values.map((v) => Math.floor(totalCents * ((v as number) / 100)))
      redistributeCents(cents, totalCents)
      return { ok: true, shares: toShares(ids, cents) }
    }

    case 'amounts': {
      const values = members.map((m) => m.value)
      if (values.some((v) => v === undefined || !Number.isFinite(v) || (v as number) < 0)) {
        return { ok: false, error: 'invalid-input' }
      }
      const cents = values.map((v) => centsOf(v as number))
      const sum = cents.reduce((a, b) => a + b, 0)
      if (sum !== totalCents) return { ok: false, error: 'amounts-sum' }
      return { ok: true, shares: toShares(ids, cents) }
    }

    case 'weights': {
      const values = members.map((m) => m.value)
      if (values.some((v) => v === undefined || !Number.isFinite(v) || (v as number) <= 0)) {
        return { ok: false, error: 'invalid-input' }
      }
      const sum = values.reduce((a, b) => (a as number) + (b as number), 0) as number
      if (sum <= 0) return { ok: false, error: 'invalid-input' }
      const cents = values.map((v) => Math.floor(totalCents * ((v as number) / sum)))
      redistributeCents(cents, totalCents)
      return { ok: true, shares: toShares(ids, cents) }
    }
  }
}

function toShares(ids: string[], cents: number[]): ExpenseSplitShare[] {
  return ids.map((id, i) => ({ userId: id, amount: fromCents(cents[i]) }))
}