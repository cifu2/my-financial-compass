import type { Locale } from '../../../lib/dates'
import { formatDate } from '../../../lib/dates'
import type { UpcomingOccurrence } from '../services/recurrenceService'

export interface UpcomingStrings {
  heading: string
  empty: string
  dateHeader: string
  descriptionHeader: string
  amountHeader: string
  edit: string
  overridden: string
}

/** Upcoming executions across all recurrences, honoring one-off overrides. */
export function UpcomingList({
  rows,
  strings,
  locale,
  categoryNameFor,
  onEdit,
}: {
  rows: readonly UpcomingOccurrence[]
  strings: UpcomingStrings
  locale: Locale
  categoryNameFor: (id: string) => string | null
  onEdit: (row: UpcomingOccurrence) => void
}) {
  if (rows.length === 0) {
    return <p className="text-muted">{strings.empty}</p>
  }
  return (
    <div className="upcoming-list">
      {rows.slice(0, 12).map((row) => (
        <div
          className={`upcoming-item${row.hasOverride ? ' upcoming-item--overridden' : ''}`}
          key={`${row.recurringId}:${row.scheduledDate}`}
        >
          <span className="upcoming-item__date">
            {formatDate(row.date, locale)}
          </span>
          <span className="upcoming-item__body">
            <strong>{row.template.concept}</strong>
            <span className="text-muted upcoming-item__meta">
              {categoryNameFor(row.template.categoryId) ?? '—'}
              {row.hasOverride && (
                <span className="badge badge--muted">{strings.overridden}</span>
              )}
            </span>
          </span>
          <span
            className={`upcoming-item__amount ${
              row.template.type === 'income' ? 'text-income' : 'text-expense'
            }`}
          >
            {row.template.type === 'income' ? '+' : '−'} €
            {Math.abs(row.template.amount).toFixed(2)}
          </span>
          <button
            type="button"
            className="btn btn--secondary upcoming-item__edit"
            onClick={() => onEdit(row)}
          >
            {strings.edit}
          </button>
        </div>
      ))}
    </div>
  )
}