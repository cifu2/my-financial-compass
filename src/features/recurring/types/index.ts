export type RecurrenceFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual'

/**
 * Frequency families. Day-based recurrences roll by calendar days; the rest
 * roll by whole months (and honor an execution day).
 */
export const MONTHLY_FREQUENCIES: ReadonlySet<RecurrenceFrequency> = new Set([
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual',
])

/** Descriptive (i18n-agnostic) metadata used to render the config selector. */
export const FREQUENCY_META: ReadonlyArray<{
  value: RecurrenceFrequency
  /** Number of months per step for month-based recurrences. */
  months: number
  /** Days per step for day-based recurrences (unused when `months > 0`). */
  days: number
}> = [
  { value: 'weekly', months: 0, days: 7 },
  { value: 'biweekly', months: 0, days: 14 },
  { value: 'monthly', months: 1, days: 0 },
  { value: 'bimonthly', months: 2, days: 0 },
  { value: 'quarterly', months: 3, days: 0 },
  { value: 'semiannual', months: 6, days: 0 },
  { value: 'annual', months: 12, days: 0 },
]

/** The transaction to be created every time the recurrence fires. */
export interface OccurrenceTemplate {
  concept: string
  amount: number
  /** Type of ledger the occurrence affects. */
  type: 'income' | 'expense'
  categoryId: string
}

/** One-off override applied to a single scheduled occurrence. */
export interface OccurrenceOverride {
  template?: OccurrenceTemplate
  /** When set, the occurrence is posted on a different date. */
  date?: string
}

export interface RecurringTransaction {
  id: string
  template: OccurrenceTemplate
  frequency: RecurrenceFrequency
  /** ISO yyyy-MM-dd, always present (required). */
  startDate: string
  /** ISO yyyy-MM-dd (optional); end of the recurring schedule. */
  endDate?: string
  /**
   * Day of the month for month-based frequencies (1..28 with 0 meaning
   * "last day of the month"). Ignored for weekly/biweekly.
   */
  executionDay?: number
  /** Paused recurrences keep their schedule but stop generating. */
  isActive: boolean
  /** First scheduled date >= today, or '' when the schedule is finished. */
  nextExecution: string
  /** Original scheduled date -> one-off override. */
  exceptions?: Record<string, OccurrenceOverride>
}

/** Editable fields of a recurrence (for the config form). */
export type RecurringInput = Pick<
  RecurringTransaction,
  'template' | 'frequency' | 'startDate' | 'endDate' | 'executionDay'
>