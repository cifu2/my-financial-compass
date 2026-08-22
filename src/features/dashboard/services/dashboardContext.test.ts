import { describe, it, expect } from 'vitest'
import type { Transaction } from '../../transactions/types'
import {
  DASHBOARD_CONTEXT_ALL,
  DASHBOARD_CONTEXT_PERSONAL,
  parseDashboardContext,
  transactionInContext,
  transactionsInContext,
  transactionOriginKey,
} from './dashboardContext'

const tx = (patch: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction => ({
  concept: 'Concepto',
  amount: -10,
  date: '2026-06-01',
  type: 'expense',
  categoryId: 'cat-food',
  ...patch,
})

const personalMine = tx({ id: 't1', concept: 'Nómina', amount: 2000, type: 'income', categoryId: 'cat-salary', userId: 'me' })
const personalLegacy = tx({ id: 't2', concept: 'Legacy' })
const groupTx = tx({ id: 't3', concept: 'Alquiler', amount: -780, categoryId: 'cat-home', groupId: 'grp-1', userId: 'member-a' })
const memberOwnedNoGroup = tx({ id: 't4', concept: 'Farmacia', userId: 'member-a' })
const otherMemberGroupTx = tx({ id: 't5', concept: 'Compra', groupId: 'grp-1', userId: 'member-b' })
const otherGroupTx = tx({ id: 't6', concept: 'Otro grupo', groupId: 'grp-2', userId: 'member-a' })

const FIXTURE: Transaction[] = [
  personalMine,
  personalLegacy,
  groupTx,
  memberOwnedNoGroup,
  otherMemberGroupTx,
  otherGroupTx,
]

const groupMemberIds = new Set(['member-a', 'member-b'])

describe('parseDashboardContext', () => {
  it('maps the personal/all keywords and accepts group ids', () => {
    expect(parseDashboardContext(DASHBOARD_CONTEXT_PERSONAL)).toEqual({ kind: 'personal' })
    expect(parseDashboardContext('')).toEqual({ kind: 'personal' })
    expect(parseDashboardContext(DASHBOARD_CONTEXT_ALL)).toEqual({ kind: 'all' })
    expect(parseDashboardContext('grp-1')).toEqual({ kind: 'group', groupId: 'grp-1' })
  })
})

describe('transactionInContext', () => {
  it('personal keeps own rows and drops every group-signed row', () => {
    expect(transactionInContext(personalMine, { kind: 'personal' }, 'me')).toBe(true)
    expect(transactionInContext(personalLegacy, { kind: 'personal' }, 'me')).toBe(true)
    expect(transactionInContext(groupTx, { kind: 'personal' }, 'me')).toBe(false)
  })

  it('personal hides rows owned by other members', () => {
    expect(transactionInContext(memberOwnedNoGroup, { kind: 'personal' }, 'me')).toBe(false)
  })

  it('all keeps every transaction', () => {
    for (const t of FIXTURE) {
      expect(transactionInContext(t, { kind: 'all' }, 'me')).toBe(true)
    }
  })

  it('group aggregates the group ledger and every member-owned row', () => {
    const inGroup = (t: Transaction) =>
      transactionInContext(t, { kind: 'group', groupId: 'grp-1' }, 'me', groupMemberIds)
    expect(inGroup(groupTx)).toBe(true)
    expect(inGroup(otherMemberGroupTx)).toBe(true)
    expect(inGroup(memberOwnedNoGroup)).toBe(true)
    expect(inGroup(personalMine)).toBe(false)
    expect(inGroup(otherGroupTx)).toBe(false)
  })

  it('group without a members set relies on the group ledger only', () => {
    expect(
      transactionInContext(memberOwnedNoGroup, { kind: 'group', groupId: 'grp-1' }, 'me'),
    ).toBe(false)
    expect(
      transactionInContext(groupTx, { kind: 'group', groupId: 'grp-1' }, 'me'),
    ).toBe(true)
  })
})

describe('transactionsInContext', () => {
  it('personal context returns the viewer-ledger rows', () => {
    const rows = transactionsInContext(FIXTURE, { kind: 'personal' }, 'me')
    expect(rows.map((r) => r.id).sort()).toEqual(['t1', 't2'])
  })

  it('group context sums its shared ledger and member-owned rows', () => {
    const rows = transactionsInContext(
      FIXTURE,
      { kind: 'group', groupId: 'grp-1' },
      'me',
      groupMemberIds,
    )
    expect(rows.map((r) => r.id).sort()).toEqual(['t3', 't4', 't5'])
  })

  it('all context returns the whole ledger', () => {
    expect(transactionsInContext(FIXTURE, { kind: 'all' }, 'me')).toHaveLength(FIXTURE.length)
  })
})

describe('transactionOriginKey', () => {
  it('tags personal and group rows with stable keys', () => {
    expect(transactionOriginKey(personalMine)).toBe(DASHBOARD_CONTEXT_PERSONAL)
    expect(transactionOriginKey(personalLegacy)).toBe(DASHBOARD_CONTEXT_PERSONAL)
    expect(transactionOriginKey(groupTx)).toBe('grp-1')
  })
})