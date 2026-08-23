import type { Budget, BudgetRow, BudgetSummary } from '../types/index'
import { BudgetProgressBar } from './BudgetProgressBar'
import { useAppCurrency } from '../../auth/state/AuthContext'
import { formatMoney } from '../../../lib/money'
import type { Locale } from '../../../lib/dates'

export interface BudgetDashboardProps {
  rows: readonly BudgetRow[]
  summary: BudgetSummary
  /** Optional previous-month spending keyed by budget id, for comparison. */
  previousSpentByBudgetId?: ReadonlyMap<string, number>
  monthLabel?: string
  /** When true the rows are group-shared budgets (HU-0.8). */
  isGroup?: boolean
  breakdownLabel?: string
  emptyText?: string
  onEdit?: (budget: Budget) => void
  onDelete?: (budget: Budget) => void
}

function money(n: number, currency: string, locale: Locale): string {
  return formatMoney(n, locale, currency)
}

/**
 * Budget dashboard: per-category name, limit, spent and remaining figures
 * with a threshold-colored progress bar, plus a total summary line. Group
 * budgets also show an expandable per-member spend breakdown (HU-0.8).
 */
export function BudgetDashboard({
  rows,
  summary,
  previousSpentByBudgetId,
  monthLabel,
  isGroup = false,
  breakdownLabel = 'Breakdown by member',
  emptyText = 'No budgets configured yet. Create a budget to start tracking your monthly spending.',
  onEdit,
  onDelete,
}: BudgetDashboardProps) {
  const currency = useAppCurrency()

  if (rows.length === 0) {
    return (
      <div className="panel panel--muted" role="status">
        <p className="text-muted mt-0">{emptyText}</p>
      </div>
    )
  }

  return (
    <>
      <div className="panel panel--muted" aria-live="polite">
        <p className="text-muted mt-0">
          You have spent <strong>{money(summary.totalSpent, currency, 'es')}</strong> of{' '}
          <strong>{money(summary.totalLimit, currency, 'es')}</strong> total
          {summary.budgetCount > 0 && (
            <span className="text-note"> across {summary.budgetCount} budgets</span>
          )}
          {monthLabel ? <span className="text-note"> · {monthLabel}</span> : null}
        </p>
      </div>

      <ul className="budget-list">
        {rows.map((row) => {
          const previous = previousSpentByBudgetId?.get(row.budget.id)
          return (
            <li key={row.budget.id} className="panel budget-card">
              <div className="budget-card__header">
                <span className="budget-card__name">
                  {row.categoryName}
                  {isGroup && (
                    <span className="badge badge--muted">{breakdownLabel}</span>
                  )}
                  {previous !== undefined && (
                    <span className="budget-card__prev">
                      prev month: {money(previous, currency, 'es')}
                    </span>
                  )}
                </span>
                <span className="budget-card__percent">
                  {Math.round(row.percentage)}%
                </span>
              </div>
              <BudgetProgressBar percentage={row.percentage} level={row.level} />
              <dl className="budget-card__figures">
                <div>
                  <dt>Limit</dt>
                  <dd>{money(row.budget.limit, currency, 'es')}</dd>
                </div>
                <div>
                  <dt>Spent</dt>
                  <dd>{money(row.spent, currency, 'es')}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd className={row.remaining < 0 ? 'is-negative' : undefined}>
                    {money(row.remaining, currency, 'es')}
                  </dd>
                </div>
              </dl>

              {row.memberSpend && row.memberSpend.length > 0 && (
                <details className="budget-card__breakdown">
                  <summary>{breakdownLabel}</summary>
                  <ul className="budget-breakdown-list">
                    {row.memberSpend.map((share) => (
                      <li key={share.userId} className="budget-breakdown-row">
                        <span className="budget-breakdown-name">{share.name}</span>
                        <span className="budget-breakdown-value">
                          {money(share.spent, currency, 'es')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {(onEdit || onDelete) && (
                <div className="budget-card__actions">
                  {onEdit && (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => onEdit(row.budget)}
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => onDelete(row.budget)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}