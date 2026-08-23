import { describe, expect, it } from 'vitest'
import {
  materializeDue,
  upcomingOccurrences,
  ruleCanGenerate,
  recurringsInContext,
  ruleInContext,
  generationGuardFor,
} from './recurrenceService'
import type { RecurringTransaction } from '../types'
import { seedGroupSnapshot } from '../../groups/data/seeds'

function recurring(partial: Partial<RecurringTransaction> & { id: string }): RecurringTransaction {
  return {
    template: {
      concept: 'Suscripción',
      amount: 9.99,
      type: 'expense',
      categoryId: 'cat-sub',
    },
    frequency: 'monthly',
    startDate: '2026-01-01',
    executionDay: 1,
    isActive: true,
    nextExecution: '',
    ...partial,
  }
}

const TODAY = '2026-03-15'

describe('recurrenceService.materializeDue', () => {
  it('generates one transaction per due occurrence', () => {
    const { generated } = materializeDue(
      [recurring({ id: 'rec-1' })],
      [],
      TODAY,
    )
    expect(generated).toHaveLength(3) // Jan 1, Feb 1, Mar 1
    expect(generated[0]).toMatchObject({
      concept: 'Suscripción',
      amount: 9.99,
      date: '2026-01-01',
      isRecurring: true,
      recurringId: 'rec-1',
    })
  })

  it('does not duplicate transactions already in the ledger', () => {
    const existing = [
      { date: '2026-01-01', recurringId: 'rec-1' },
      { date: '2026-02-01', recurringId: 'rec-1' },
    ]
    const { generated } = materializeDue([recurring({ id: 'rec-1' })], existing, TODAY)
    expect(generated).toHaveLength(1)
    expect(generated[0].date).toBe('2026-03-01')
  })

  it('skips inactive (paused) recurrences', () => {
    const { generated } = materializeDue(
      [recurring({ id: 'rec-1', isActive: false })],
      [],
      TODAY,
    )
    expect(generated).toHaveLength(0)
  })

  it('applies a single-occurrence override template and date', () => {
    const { generated } = materializeDue(
      [
        recurring({
          id: 'rec-1',
          exceptions: {
            '2026-02-01': {
              template: { concept: 'Suscripción anual', amount: 99.9, type: 'expense', categoryId: 'cat-sub' },
              date: '2026-02-10',
            },
          },
        }),
      ],
      [],
      TODAY,
    )
    const upgraded = generated.find((g) => g.date === '2026-02-10')
    expect(upgraded).toBeTruthy()
    expect(upgraded?.amount).toBe(99.9)
    const ordinary = generated.filter((g) => g.recurringId === 'rec-1')
    expect(ordinary).toHaveLength(3) // Jan 1, Feb 10, Mar 1
  })

  it('is idempotent over repeated runs', () => {
    const first = materializeDue([recurring({ id: 'rec-1' })], [], TODAY)
    const second = materializeDue([recurring({ id: 'rec-1' })], first.generated, TODAY)
    expect(second.generated).toHaveLength(0)
  })

  it('computes the next execution for each recurrence', () => {
    const { nextExecutions } = materializeDue(
      [recurring({ id: 'rec-1' })],
      [],
      TODAY,
    )
    expect(nextExecutions['rec-1']).toBe('2026-04-01')
  })
})

describe('recurring group context (HU-0.8)', () => {
  const group = recurring({ id: 'rec-grp', groupId: 'grp-hogar', createdBy: 'usr-ana' })

  it('stamps the rule groupId onto generated transactions', () => {
    const { generated } = materializeDue([group], [], TODAY)
    expect(generated).toHaveLength(3)
    expect(generated.every((g) => g.groupId === 'grp-hogar')).toBe(true)
    expect(generated[0].recurringId).toBe('rec-grp')
  })

  it('keeps personal rules without a group context', () => {
    const { generated } = materializeDue([recurring({ id: 'rec-1' })], [], TODAY)
    expect(generated.length).toBeGreaterThan(0)
    expect(generated.every((g) => g.groupId === undefined)).toBe(true)
  })

  it('exposes the group context on upcoming occurrences', () => {
    const items = upcomingOccurrences([group], TODAY, 1)
    expect(items[0].groupId).toBe('grp-hogar')
  })
})

describe('recurring context filtering (HU-0.8)', () => {
  const personal = recurring({ id: 'rec-1' })
  const shared = recurring({ id: 'rec-grp', groupId: 'grp-hogar' })
  const group = shared

  it('filters rules by a group context', () => {
    expect(ruleInContext(group, { kind: 'group', groupId: 'grp-hogar' })).toBe(true)
    expect(ruleInContext(personal, { kind: 'group', groupId: 'grp-hogar' })).toBe(false)
  })

  it('isolates personal rules', () => {
    expect(ruleInContext(personal, { kind: 'personal' })).toBe(true)
    expect(ruleInContext(group, { kind: 'personal' })).toBe(false)
  })

  it('the all context keeps every rule', () => {
    const kept = recurringsInContext([personal, group], { kind: 'all' })
    expect(kept).toHaveLength(2)
  })

  it('filters a list by context', () => {
    const kept = recurringsInContext([personal, group], { kind: 'group', groupId: 'grp-hogar' })
    expect(kept).toEqual([group])
  })
})

describe('rule generation permissions (HU-0.8)', () => {
  const group = recurringGroup({ id: 'rec-grp' })

  it('always allows personal rules', () => {
    expect(ruleCanGenerate(recurring({ id: 'rec-1' }), seedGroupSnapshot(), 'usr-ana')).toBe(true)
  })

  it('allows a group rule while its creator keeps data.edit', () => {
    expect(ruleCanGenerate(group, seedGroupSnapshot(), 'usr-ana')).toBe(true)
  })

  it('blocks a readonly creator', () => {
    const snapshot = seedGroupSnapshot()
    snapshot.members = snapshot.members.map((m) =>
      m.groupId === 'grp-hogar' && m.userId === 'usr-ana'
        ? { ...m, role: 'readonly' as const }
        : m,
    )
    const guard = generationGuardFor(snapshot, 'usr-ana')
    expect(guard(group)).toBe(false)
  })

  it('blocks a creator that is no longer a member', () => {
    const snapshot = seedGroupSnapshot()
    snapshot.members = snapshot.members.filter(
      (m) => !(m.groupId === 'grp-hogar' && m.userId === 'usr-ana'),
    )
    expect(ruleCanGenerate(group, snapshot, 'usr-ana')).toBe(false)
  })

  it('uses the current user as fallback creator', () => {
    // A member-role user with a matching membership is allowed without an
    // explicit creator stamp.
    const rule = recurring({ id: 'rec-grp', groupId: 'grp-hogar' })
    expect(ruleCanGenerate(rule, seedGroupSnapshot(), 'usr-jose')).toBe(true)
  })
})

function recurringGroup(partial: Partial<RecurringTransaction> & { id: string }) {
  return recurring({ ...partial, groupId: 'grp-hogar', createdBy: 'usr-ana' })
}