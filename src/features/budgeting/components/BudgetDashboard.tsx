import type { Budget, BudgetRow, BudgetSummary } from '../types/index'
import { BudgetProgressBar } from './BudgetProgressBar'

export interface BudgetDashboardProps {
  rows: readonly BudgetRow[]
  summary: BudgetSummary
  /** Optional previous-month spending keyed by budget id, for comparison. */
  previousSpentByBudgetId?: ReadonlyMap<string, number>
  monthLabel?: string
  onEdit?: (budget: Budget) => void
  onDelete?: (budget: Budget) => void
}

function money(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}

/**
 * Budget dashboard: per-category name, limit, spent and remaining figures
 * with a threshold-colored progress bar, plus a total summary line.
 */
export function BudgetDashboard({
  rows,
  summary,
  previousSpentByBudgetId,
  monthLabel,
  onEdit,
  onDelete,
}: BudgetDashboardProps) {
  if (rows.length === 0) {
    return (
      <div className="panel panel--muted" role="status">
        <p className="text-muted mt-0">
          No budgets configured yet. Create a budget to start tracking your
          monthly spending.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="panel panel--muted" aria-live="polite">
        <p className="text-muted mt-0">
          You have spent <strong>{money(summary.totalSpent)}</strong> of{' '}
          <strong>{money(summary.totalLimit)}</strong> total
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
                  {previous !== undefined && (
                    <span className="budget-card__prev">
                      prev month: {money(previous)}
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
                  <dd>{money(row.budget.limit)}</dd>
                </div>
                <div>
                  <dt>Spent</dt>
                  <dd>{money(row.spent)}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd className={row.remaining < 0 ? 'is-negative' : undefined}>
                    {money(row.remaining)}
                  </dd>
                </div>
              </dl>
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