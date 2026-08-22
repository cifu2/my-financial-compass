import type {
  OccurrenceTemplate,
  RecurrenceFrequency,
  RecurringTransaction,
} from '../types'
import { MONTHLY_FREQUENCIES } from '../types'
import { dueDates, nextExecution, scheduleFor } from './recurrenceEngine'

/** Minimal shape of a stored transaction needed for deduplication. */
export interface ExistingTransaction {
  date: string
  recurringId?: string
}

/** A recurring occurrence materialized as a real transaction. */
export interface GeneratedTransaction extends OccurrenceTemplate {
  date: string
  isRecurring: true
  recurringId: string
}

/** Config used by the scheduling engine for one recurrence. */
export function scheduleConfigOf(r: RecurringTransaction) {
  return {
    startDate: r.startDate,
    endDate: r.endDate,
    frequency: r.frequency,
    executionDay: r.executionDay,
  }
}

export interface MaterializeResult {
  generated: GeneratedTransaction[]
  /** Recurrence id -> recomputed next execution date after materialization. */
  nextExecutions: Record<string, string>
}

/**
 * Generates one transaction per scheduled occurrence that has already come due
 * (`<= today`) and is not already represented in the ledger, honoring one-off
 * overrides for a single occurrence. Idempotent: runs can be replayed safely.
 */
export function materializeDue(
  recurrings: readonly RecurringTransaction[],
  existing: readonly ExistingTransaction[],
  today: string,
  maxCount = 60,
): MaterializeResult {
  const generated: GeneratedTransaction[] = []
  const nextExecutions: Record<string, string> = {}
  let generatedCount = 0

  for (const r of recurrings) {
    const cfg = scheduleConfigOf(r)
    if (!r.isActive) {
      nextExecutions[r.id] = r.nextExecution
      continue
    }

    const posted = new Set<string>()
    for (const tx of existing) {
      if (tx.recurringId === r.id) posted.add(tx.date)
    }

    for (const scheduledDate of dueDates(cfg, today)) {
      if (generatedCount >= maxCount) break
      const override = r.exceptions?.[scheduledDate]
      const template = override?.template ?? r.template
      const date = override?.date ?? scheduledDate
      if (posted.has(date)) continue
      posted.add(date)
      generated.push({ ...template, date, isRecurring: true, recurringId: r.id })
      generatedCount += 1
    }

    nextExecutions[r.id] = nextExecution(cfg, today)
  }

  return { generated, nextExecutions }
}

/** Upcoming occurrences for the list, honoring one-off overrides. */
export interface UpcomingOccurrence {
  recurringId: string
  /** Date the transaction will actually be posted. */
  date: string
  /** The canonical schedule date (before any single-occurrence override). */
  scheduledDate: string
  template: OccurrenceTemplate
  hasOverride: boolean
}

export function upcomingOccurrences(
  recurrings: readonly RecurringTransaction[],
  today: string,
  perRecurrence = 6,
): UpcomingOccurrence[] {
  const items: UpcomingOccurrence[] = []
  for (const r of recurrings) {
    const dates = scheduleFor(r, today, perRecurrence)
    for (const scheduledDate of dates) {
      const override = r.exceptions?.[scheduledDate]
      items.push({
        recurringId: r.id,
        scheduledDate,
        date: override?.date ?? scheduledDate,
        template: override?.template ?? r.template,
        hasOverride: Boolean(override),
      })
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date))
}

/** Number of month-based frequencies for select rendering (0 for weekly/biweekly). */
export function isMonthBased(frequency: RecurrenceFrequency): boolean {
  return MONTHLY_FREQUENCIES.has(frequency)
}