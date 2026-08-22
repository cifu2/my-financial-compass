import type {
  RecurrenceFrequency,
  RecurringTransaction,
} from '../types'
import { MONTHLY_FREQUENCIES, FREQUENCY_META } from '../types'

const MS_DAY = 24 * 60 * 60 * 1000

/** Parses an ISO yyyy-MM-dd string into a UTC Date. */
export function parseIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/** Renders a UTC Date as an ISO yyyy-MM-dd string. */
export function isoOf(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0')
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const d = date.getUTCDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso)
  return isoOf(new Date(date.getTime() + days * MS_DAY))
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

/**
 * Moves `months` forward from `iso`, keeping `intentDay` when possible and
 * clamping to the last day of the target month otherwise (e.g. day 31 in a
 * 30-day month becomes day 30).
 */
export function addMonthsClamped(
  iso: string,
  months: number,
  intentDay: number,
): string {
  const [year, month] = iso.split('-').map(Number)
  const total = (year - 1) * 12 + (month - 1) + months
  const targetYear = Math.floor(total / 12) + 1
  const targetMonth = (total % 12) + 1
  const day = Math.min(intentDay, daysInMonth(targetYear, targetMonth - 1))
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Days per step for day-based frequencies (0 when month-based). */
export function daysStep(frequency: RecurrenceFrequency): number {
  const meta = FREQUENCY_META.find((f) => f.value === frequency)
  return meta?.days ?? 0
}

/** Months per step for month-based frequencies (0 when day-based). */
export function monthsStep(frequency: RecurrenceFrequency): number {
  const meta = FREQUENCY_META.find((f) => f.value === frequency)
  return meta?.months ?? 0
}

function dayOf(iso: string): number {
  return Number(iso.slice(8, 10))
}

/**
 * Applies `executionDay` within the month of `iso`. A `0` means "last day of
 * the month"; out-of-range days are clamped to the last day (31 -> 30, etc.).
 */
export function applyExecutionDay(iso: string, executionDay: number): string {
  const [year, month] = iso.split('-').map(Number)
  const last = daysInMonth(year, month - 1)
  const day = executionDay === 0 ? last : Math.min(executionDay, last)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export interface ScheduleConfig {
  startDate: string
  endDate?: string
  frequency: RecurrenceFrequency
  executionDay?: number
}

/**
 * Returns the sorted ISO dates on which the recurrence fires, from `startDate`
 * (the first date >= startDate honoring the execution day) up to `endDate`
 * (inclusive when provided) or `maxCount` (preferred when set).
 */
export function scheduledDates(
  config: ScheduleConfig,
  options: { maxCount?: number; from?: string } = {},
): string[] {
  const { startDate, endDate, frequency, executionDay } = config
  const monthBased = MONTHLY_FREQUENCIES.has(frequency)
  const stepMonths = monthsStep(frequency)
  const stepDays = daysStep(frequency)
  const intentDay = monthBased ? executionDay ?? dayOf(startDate) : dayOf(startDate)

  // Roll the cursor forward so the first occurrence is never before `from`.
  let cursor = monthBased ? applyExecutionDay(startDate, intentDay) : startDate
  const from = options.from ?? startDate
  const maxCount = options.maxCount ?? 12
  {
    let guard2 = 0
    while (cursor < from && guard2++ < 10000) {
      cursor = monthBased
        ? addMonthsClamped(cursor, stepMonths, intentDay)
        : addDays(cursor, stepDays)
    }
  }

  const dates: string[] = []
  let guard = 0
  while (guard++ < 10000) {
    if (cursor < from) break
    if (endDate && cursor > endDate) break
    dates.push(cursor)
    if (dates.length >= maxCount) break
    cursor = monthBased ? addMonthsClamped(cursor, stepMonths, intentDay) : addDays(cursor, stepDays)
  }
  return dates
}

/** Occurrences on/before `today` (used to materialize due transactions). */
export function dueDates(
  config: ScheduleConfig,
  today: string,
  maxCount = 999,
): string[] {
  const all = scheduledDates(config, { from: config.startDate, maxCount })
  const due: string[] = []
  for (const date of all) {
    if (date > today) break
    due.push(date)
  }
  return due
}

/** The first occurrence on/after `today`, or `` when none remain. */
export function nextExecution(
  config: ScheduleConfig,
  today: string,
): string {
  const all = scheduledDates(config, { from: today, maxCount: 1 })
  return all[0] ?? ''
}

/** Full schedule of an entire recurrence (capped). */
export function scheduleFor(recurring: RecurringTransaction, from: string, maxCount = 24): string[] {
  return scheduledDates(
    {
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      frequency: recurring.frequency,
      executionDay: recurring.executionDay,
    },
    { from, maxCount },
  )
}