import { describe, expect, it } from 'vitest'
import {
  buildBudgetRows,
  memberBreakdown,
  spentForCategory,
  type BudgetRowsOptions,
  type SpendingInput,
} from './budgetCalculator'
import type { Budget, BudgetContext, MemberSpend } from '../types'

const isExpense = (t: SpendingInput) => t.amount < 0

const month = '2026-08'

/** Personal and shared budgets for the same category (HU-0.8). */
const budgets: Budget[] = [
  { id: 'bg-personal', categoryId: 'cat-food', limit: 200, period: 'monthly' },
  { id: 'bg-group', categoryId: 'cat-food', limit: 400, period: 'monthly', groupId: 'grp-hogar' },
]

function input(
  userId: string | undefined,
  amount: number,
  groupId?: string,
): SpendingInput {
  return {
    amount,
    date: `${month}-05`,
    categoryId: 'cat-food',
    userId,
    groupId,
  }
}

function groupContext(groupId: string): BudgetContext {
  return { kind: 'group', groupId }
}

function personalContext(): BudgetContext {
  return { kind: 'personal', groupId: null }
}

function options(
  context: BudgetContext,
  currentUserId: string | null = 'usr-ana',
  memberIds: readonly string[] = ['usr-ana', 'usr-jose'],
): BudgetRowsOptions {
  return {
    context,
    currentUserId,
    memberIds: new Set(memberIds),
    memberNames: new Map([
      ['usr-ana', 'Ana'],
      ['usr-jose', 'José'],
    ]),
  }
}

describe('group budget consumption (HU-0.8)', () => {
  it('personal context only counts own expenses and ignores group rows', () => {
    const inputs = [
      input('usr-ana', -50), // own
      input('usr-jose', -90), // other member, not mine
      input(undefined, -20), // legacy -> mine
    ]
    const rows = buildBudgetRows(budgets, inputs, isExpense, month, () => 'Food', {
      context: personalContext(),
      currentUserId: 'usr-ana',
    })
    expect(rows.map((r) => [r.budget.id, r.spent])).toEqual([
      ['bg-personal', 70],
    ])
  })

  it('group context aggregates the spending of every member', () => {
    const tx = [
      input('usr-ana', -50),
      input('usr-jose', -120),
      input(undefined, -30, 'grp-hogar'),
    ]
    const rows = buildFor(tx)
    const groupRow = rows.find((r) => r.budget.id === 'bg-group')
    expect(groupRow?.spent).toBe(200)
    expect(groupRow?.percentage).toBe(50)
    expect(groupRow?.level).toBe('healthy')
  })

  it('hides personal budgets when viewing a group context', () => {
    const rows = buildFor([
      input('usr-ana', -50),
      input('usr-jose', -30),
    ])
    expect(rows.map((r) => r.budget.id)).toEqual(['bg-group'])
    expect(rows.length).toBe(1)
  })

  it('breaks the group consumption down per member', () => {
    const tx = [
      input('usr-ana', -50),
      input('usr-jose', -80),
      input('usr-jose', -20),
      input('usr-lucia', -99), // not a member -> excluded
      input(undefined, -10), // legacy -> attributed to viewer (Ana)
    ]
    const shares = memberBreakdown(tx, budgets[1], month, isExpense, options(groupContext('grp-hogar')))
    expect(shares.map((s) => s.userId)).toEqual(['usr-jose', 'usr-ana'])
    expect(shares.find((s) => s.userId === 'usr-jose')?.spent).toBe(100)
    expect(shares.find((s) => s.userId === 'usr-ana')?.spent).toBe(60)
    expect(shares.reduce((acc, s) => acc + s.spent, 0)).toBe(160)
  })

  it('excludes non-member rows from a group budget entirely', () => {
    const tx = [
      input('usr-lucia', -99),
      input('usr-paco', -40),
    ]
    const rows = buildFor(tx)
    expect(rows.find((r) => r.budget.id === 'bg-group')?.spent).toBe(0)
  })

  it('keeps legacy (no-owner) rows in a group when the viewer is a member', () => {
    const tx = [input(undefined, -25)]
    const rows = buildFor(tx)
    expect(rows.find((r) => r.budget.id === 'bg-group')?.spent).toBe(25)
  })

  it('spentForCategory honors the same scope through the options', () => {
    const tx = [input('usr-ana', -50), input('usr-jose', -80)]
    const opts = options(groupContext('grp-hogar'))
    expect(spentForCategory(tx, 'cat-food', month, isExpense, opts)).toBe(130)
    const personal = options(personalContext())
    expect(spentForCategory(tx, 'cat-food', month, isExpense, personal)).toBe(50)
  })
})

function buildFor(tx: SpendingInput[]) {
  return buildBudgetRows(
    budgets,
    tx,
    isExpense,
    month,
    () => 'Food',
    options(groupContext('grp-hogar')),
  )
}

// Ensure memberBreakdown matches the row breakdown.
describe('memberBreakdown', () => {
  it('produces member shares summed from the scoped consumption', () => {
    const tx = [
      input('usr-ana', -50),
      input('usr-jose', -80),
      input(undefined, -10),
    ]
    const opts = options(groupContext('grp-hogar'))
    const shares: MemberSpend[] = memberBreakdown(
      tx,
      budgets[1],
      month,
      isExpense,
      opts,
    )
    expect(shares.reduce((acc, s) => acc + s.spent, 0)).toBe(140)
  })
})