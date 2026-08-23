import type { RecurringTransaction } from '../types'
import type { Locale } from '../../../lib/dates'
import { formatDate } from '../../../lib/dates'
import { isMonthBased } from '../services/recurrenceService'
import { executionDayText, frequencyLabel } from './frequencyText'

export interface RecurringListStrings {
  conceptHeader: string
  frequencyHeader: string
  executionHeader: string
  nextHeader: string
  statusHeader: string
  actionsHeader: string
  edit: string
  pause: string
  resume: string
  delete: string
  active: string
  paused: string
  none: string
}

/**
 * Table of configured recurrences with per-row management actions.
 * Frequency / execution day / next run are rendered from the schedule
 * settings, and each row exposes Edit, Pause/Resume and Delete.
 */
export function RecurringList({
  recurrings,
  strings,
  locale,
  categoryNameFor,
  onEdit,
  onToggleActive,
  onDelete,
  canManage,
}: {
  recurrings: readonly RecurringTransaction[]
  strings: RecurringListStrings
  locale: Locale
  categoryNameFor: (id: string) => string | null
  onEdit: (r: RecurringTransaction) => void
  onToggleActive: (r: RecurringTransaction) => void
  onDelete: (r: RecurringTransaction) => void
  /**
   * Optional per-row permission check (HU-0.10). When it returns false the
   * management actions are hidden; the row stays visible in read-only mode.
   */
  canManage?: (r: RecurringTransaction) => boolean
}) {
  if (recurrings.length === 0) {
    return <p className="text-muted">{strings.none}</p>
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">{strings.conceptHeader}</th>
          <th scope="col">{strings.frequencyHeader}</th>
          <th scope="col">{strings.nextHeader}</th>
          <th scope="col">{strings.statusHeader}</th>
          <th scope="col"><span className="visually-hidden">{strings.actionsHeader}</span></th>
        </tr>
      </thead>
      <tbody>
        {recurrings.map((r) => {
          const frequency = frequencyLabel(locale, r.frequency)
          const day = executionDayText(locale, isMonthBased(r.frequency), r.executionDay)
          const next =
            r.nextExecution !== '' && r.isActive
              ? formatDate(r.nextExecution, locale)
              : '—'
          return (
            <tr key={r.id}>
              <td>
                <div className="recurring-concept">
                  <span className="recurring-concept__name">
                    {r.template.concept}
                  </span>
                  <span className="recurring-concept__meta">
                    {categoryNameFor(r.template.categoryId) ?? '—'}
                    {' · '}
                    <span className={r.template.type === 'income' ? 'text-income' : 'text-expense'}>
                      {r.template.type === 'income' ? '+' : '−'} €
                      {Math.abs(r.template.amount).toFixed(2)}
                    </span>
                  </span>
                </div>
              </td>
              <td>
                <span>{frequency}</span>
                {day && <span className="recurring-day"> · {day}</span>}
              </td>
              <td>{next}</td>
              <td>
                <span
                  className={`badge ${
                    r.isActive ? 'badge--active' : 'badge--muted'
                  }`}
                >
                  {r.isActive ? strings.active : strings.paused}
                </span>
              </td>
              <td>
                <div className="recurring-actions">
                  {(!canManage || canManage(r)) && (
                    <>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => onEdit(r)}
                      >
                        {strings.edit}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => onToggleActive(r)}
                      >
                        {r.isActive ? strings.pause : strings.resume}
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger"
                        onClick={() => onDelete(r)}
                      >
                        {strings.delete}
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}