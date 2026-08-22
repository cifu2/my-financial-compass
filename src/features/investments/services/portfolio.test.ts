import { describe, it, expect } from 'vitest'
import type { Investment, InvestmentOwnership } from '../types'
import {
  holdingsForContext,
  ownershipPercentage,
  isFullOwnership,
  contextNativeValue,
  shareValue,
} from './portfolio'

function inv(
  id: string,
  overrides: Partial<Investment> = {},
): Investment {
  return {
    id,
    name: id,
    type: 'funds',
    purchaseDate: '2026-01-01',
    quantity: 1,
    investedAmount: 1000,
    currency: 'EUR',
    ...overrides,
  }
}

function own(investmentId: string, userId: string, percentage: number): InvestmentOwnership {
  return { investmentId, userId, percentage }
}

const PERSONAL = inv('p-1', { createdBy: 'usr-ana' })
const GROUP = inv('g-1', { groupId: 'grp-hogar', createdBy: 'usr-ana', currentValue: 2000 })
const GROUP_OTHER = inv('g-2', { groupId: 'grp-viaje', createdBy: 'usr-jose', investedAmount: 500 })
const ALL = [PERSONAL, GROUP, GROUP_OTHER]
const OWNERS = [own('g-1', 'usr-ana', 60), own('g-1', 'usr-jose', 40)]

describe('investment portfolio context (HU-0.9)', () => {
  describe('ownershipPercentage', () => {
    it('personal assets are always 100 % owned by the viewer', () => {
      expect(ownershipPercentage(PERSONAL, OWNERS, 'usr-ana')).toBe(100)
      expect(ownershipPercentage(PERSONAL, OWNERS, 'usr-jose')).toBe(100)
    })

    it('group assets return the member percentage (0 when no row)', () => {
      expect(ownershipPercentage(GROUP, OWNERS, 'usr-ana')).toBe(60)
      expect(ownershipPercentage(GROUP, OWNERS, 'usr-jose')).toBe(40)
      expect(ownershipPercentage(GROUP, OWNERS, 'usr-lucia')).toBe(0)
    })
  })

  describe('isFullOwnership', () => {
    it('accepts boards that account for exactly 100%', () => {
      expect(isFullOwnership(OWNERS)).toBe(true)
    })

    it('rejects over/to under 100 within tolerance', () => {
      expect(isFullOwnership([own('x', 'u1', 50), own('x', 'u2', 40)])).toBe(false)
      expect(isFullOwnership([own('x', 'u1', 99.9996)])).toBe(true)
    })
  })

  describe('holdingsForContext (personal)', () => {
    it('keeps personal assets and only the user share of owned group assets', () => {
      const holdings = holdingsForContext(ALL, OWNERS, { kind: 'personal', userId: 'usr-ana' })
      const map = new Map(holdings.map((h) => [h.investment.id, h]))
      // Personal asset: full value, share 1.
      expect(map.get('p-1')?.share).toBe(1)
      // Group asset Ana owns: full * 60%.
      expect(map.get('g-1')?.share).toBeCloseTo(0.6)
      expect(map.get('g-1')?.ownership).toHaveLength(2)
      // Group asset she does not own is hidden.
      expect(map.has('g-2')).toBe(false)
    })

    it('ads personal assets even without a creator row (legacy)', () => {
      const legacy = inv('p-2')
      const holdings = holdingsForContext([legacy], [], { kind: 'personal', userId: 'usr-ana' })
      expect(holdings).toHaveLength(1)
      expect(holdings[0].share).toBe(1)
    })

    it('hides personal assets created by another user', () => {
      const other = inv('p-3', { createdBy: 'usr-jose' })
      const holdings = holdingsForContext([other], [], { kind: 'personal', userId: 'usr-ana' })
      expect(holdings).toHaveLength(0)
    })
  })

  describe('holdingsForContext (group)', () => {
    it('returns every asset of the group at full value with ownership rows', () => {
      const holdings = holdingsForContext(ALL, OWNERS, { kind: 'group', groupId: 'grp-hogar' })
      expect(holdings.map((h) => h.investment.id)).toEqual(['g-1'])
      expect(holdings[0].share).toBe(1)
      expect(holdings[0].ownership).toHaveLength(2)
    })

    it('excludes assets of other groups and personal assets', () => {
      const holdings = holdingsForContext(ALL, OWNERS, { kind: 'group', groupId: 'grp-viaje' })
      expect(holdings.map((h) => h.investment.id)).toEqual(['g-2'])
    })
  })

  describe('holdingsForContext (all, HU-0.5)', () => {
    it('values every asset at full share with its ownership rows', () => {
      const holdings = holdingsForContext(ALL, OWNERS, { kind: 'all' })
      expect(holdings.map((h) => h.investment.id)).toEqual(['p-1', 'g-1', 'g-2'])
      for (const h of holdings) {
        expect(h.share).toBe(1)
        expect(h.ownership).toEqual(
          h.investment.groupId === undefined
            ? []
            : OWNERS.filter((o) => o.investmentId === h.investment.id),
        )
      }
    })
  })

  describe('context value helpers', () => {
    it('contextNativeValue weight each holding by the viewer share', () => {
      const holdings = holdingsForContext(ALL, OWNERS, { kind: 'personal', userId: 'usr-ana' })
      // 1000 (personal) + 2000 * 0.6 = 2200.
      expect(contextNativeValue(holdings)).toBeCloseTo(2200)
    })

    it('shareValue rounds a proportional holding value', () => {
      const holding = { investment: GROUP, nativeValue: 2000, share: 0.6, ownership: OWNERS }
      expect(shareValue(holding)).toBe(1200)
    })
  })
})