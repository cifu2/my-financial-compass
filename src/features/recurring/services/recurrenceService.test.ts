import { describe, expect, it } from 'vitest'
import { materializeDue, upcomingOccurrences } from './recurrenceService'
import type { RecurringTransaction } from '../types'

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

describe('recurrenceService.upcomingOccurrences', () => {
  it('lists the next occurrences sorted by date', () => {
    const items = upcomingOccurrences(
      [recurring({ id: 'rec-1', frequency: 'weekly', startDate: '2026-03-01' })],
      TODAY,
      3,
    )
    expect(items.map((i) => i.date)).toEqual([
      '2026-03-15',
      '2026-03-22',
      '2026-03-29',
    ])
  })

  it('marks single-occurrence overrides', () => {
    const items = upcomingOccurrences(
      [
        recurring({
          id: 'rec-1',
          exceptions: { '2026-04-01': { date: '2026-04-05' } },
        }),
      ],
      TODAY,
      4,
    )
    const overridden = items.find((i) => i.date === '2026-04-05')
    expect(overridden?.hasOverride).toBe(true)
    const regular = items.find((i) => i.date === '2026-05-01')
    expect(regular?.hasOverride).toBe(false)
  })
})