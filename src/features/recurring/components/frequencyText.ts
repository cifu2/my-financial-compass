import type { Locale } from '../../../lib/dates'
import { translate, type UIKey } from '../../../lib/i18n'
import type { RecurrenceFrequency } from '../types'

/** Localized label for a frequency value. */
export function frequencyLabel(locale: Locale, frequency: RecurrenceFrequency): string {
  return translate(locale, `freq.${frequency}` as UIKey)
}

/** Localized execution-day text ("day 15" / "last day") or '' when n/a. */
export function executionDayText(
  locale: Locale,
  monthBased: boolean,
  executionDay: number | undefined,
): string {
  if (!monthBased || executionDay === undefined) return ''
  if (executionDay === 0) return translate(locale, 'execution.last')
  return translate(locale, 'recurring.onDay').replace('{day}', String(executionDay))
}