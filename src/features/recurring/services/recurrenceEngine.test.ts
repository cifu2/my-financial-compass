import { describe, expect, it } from 'vitest'
import {
  addMonthsClamped,
  applyExecutionDay,
  dueDates,
  nextExecution,
  scheduledDates,
} from './recurrenceEngine'

describe('recurrenceEngine.addMonthsClamped', () => {
  it('keeps the intent day when the target month is long enough', () => {
    expect(addMonthsClamped('2026-01-15', 1, 15)).toBe('2026-02-15')
  })

  it('clamps day 31 to the last day of short months', () => {
    expect(addMonthsClamped('2026-01-31', 1, 31)).toBe('2026-02-28')
    expect(addMonthsClamped('2025-11-30', 1, 31)).toBe('2025-12-31')
  })

  it('handles year boundaries', () => {
    expect(addMonthsClamped('2026-11-01', 2, 1)).toBe('2027-01-01')
  })
})

describe('scheduleEngine.applyExecutionDay', () => {
  it('maps a 0 day to the last day of the month', () => {
    expect(applyExecutionDay('2026-02-10', 0)).toBe('2026-02-28')
    expect(applyExecutionDay('2026-04-10', 0)).toBe('2026-04-30')
  })

  it('clamps overflow days', () => {
    expect(applyExecutionDay('2026-04-10', 31)).toBe('2026-04-30')
  })
})

describe('recurrenceEngine.scheduledDates', () => {
  it('generates weekly dates from the start date', () => {
    const dates = scheduledDates(
      { startDate: '2026-01-05', frequency: 'weekly' },
      { maxCount: 4 },
    )
    expect(dates).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
    ])
  })

  it('generates biweekly dates', () => {
    const dates = scheduledDates(
      { startDate: '2026-01-05', frequency: 'biweekly' },
      { maxCount: 3 },
    )
    expect(dates).toEqual(['2026-01-05', '2026-01-19', '2026-02-02'])
  })

  it('honors the execution day for monthly recurrences', () => {
    const dates = scheduledDates(
      {
        startDate: '2026-01-10',
        frequency: 'monthly',
        executionDay: 15,
      },
      { maxCount: 3 },
    )
    expect(dates).toEqual(['2026-01-15', '2026-02-15', '2026-03-15'])
  })

  it('does not emit an occurrence before the start date', () => {
    // Start day 20, execution day 15 -> first execution is next month.
    const dates = scheduledDates(
      {
        startDate: '2026-01-20',
        frequency: 'monthly',
        executionDay: 15,
      },
      { maxCount: 3 },
    )
    expect(dates[0]).toBe('2026-02-15')
  })

  it('supports quarterly and annual step sizes', () => {
    const quarterly = scheduledDates(
      { startDate: '2026-03-01', frequency: 'quarterly' },
      { maxCount: 2 },
    )
    expect(quarterly).toEqual(['2026-03-01', '2026-06-01'])

    const annual = scheduledDates(
      { startDate: '2026-03-01', frequency: 'annual' },
      { maxCount: 2 },
    )
    expect(annual).toEqual(['2026-03-01', '2027-03-01'])
  })

  it('stops at the end date', () => {
    const dates = scheduledDates(
      {
        startDate: '2026-01-10',
        endDate: '2026-03-10',
        frequency: 'monthly',
        executionDay: 10,
      },
      { maxCount: 12 },
    )
    expect(dates).toEqual(['2026-01-10', '2026-02-10', '2026-03-10'])
  })

  it('respects the from boundary for day-based recurrences', () => {
    const dates = scheduledDates(
      { startDate: '2026-01-01', frequency: 'weekly' },
      { from: '2026-01-10', maxCount: 2 },
    )
    expect(dates).toEqual(['2026-01-15', '2026-01-22'])
  })
})

describe('recurrenceEngine.dueDates', () => {
  it('returns only occurrences on or before today', () => {
    const due = dueDates(
      { startDate: '2026-01-01', frequency: 'weekly' },
      '2026-01-15',
    )
    expect(due).toEqual(['2026-01-01', '2026-01-08', '2026-01-15'])
  })

  it('returns an empty list when nothing has come due', () => {
    const due = dueDates(
      { startDate: '2026-02-01', frequency: 'weekly' },
      '2026-01-15',
    )
    expect(due).toEqual([])
  })
})

describe('recurrenceEngine.nextExecution', () => {
  it('returns the first date on or after today', () => {
    expect(
      nextExecution({ startDate: '2026-01-01', frequency: 'monthly', executionDay: 1 }, '2026-03-15'),
    ).toBe('2026-04-01')
  })

  it('returns today when the occurrence is due today', () => {
    expect(
      nextExecution({ startDate: '2026-01-01', frequency: 'monthly', executionDay: 15 }, '2026-03-15'),
    ).toBe('2026-03-15')
  })

  it('returns an empty string when the schedule has finished', () => {
    expect(
      nextExecution(
        { startDate: '2025-01-01', endDate: '2025-12-01', frequency: 'monthly', executionDay: 1 },
        '2026-01-01',
      ),
    ).toBe('')
  })
})