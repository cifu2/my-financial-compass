import type { Budget, BudgetRow, BudgetSummary } from '../types/index'
import { BudgetProgressBar } from './BudgetProgressBar'
import { useAppCurrency } from '../../auth/state/AuthContext'
import { formatMoney } from '../../../lib/money'
import { translate, type UIKey } from '../../../lib/i18n'
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
  /** Locale for i18n lookups. Defaults to 'es'. */
  locale?: Locale
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
  breakdownLabel,
  emptyText,
  onEdit,
  onDelete,
  locale = 'es',
}: BudgetDashboardProps) {
  const currency = useAppCurrency()
  const t = (key: UIKey) => translate(locale, key)
  const effectiveBreakdownLabel = breakdownLabel ?? t('budget.breakdownByMember')
  const effectiveEmptyText = emptyText ?? t('budget.noBudgets')

  const totalSpent = money(summary.totalSpent, currency, locale)
  const totalLimit = money(summary.totalLimit, currency, locale)

  const acrossLabel = summary.budgetCount > 0
    ? t('budget.acrossBudgets').replace('{count}', String(summary.budgetCount))
    : ''

  if (rows.length === 0) {
    return (
      <div className="panel panel--muted" role="status">
        <p className="text-muted mt-0">{effectiveEmptyText}</p>
      </div>
    )
  }

  return (
    <>
      <div className="panel panel--muted" aria-live="polite">
        <p className="text-muted mt-0">
          {t('budget.youHaveSpent')}
          {' '}
          <strong>{totalSpent}</strong>
          {' '}
          {t('budget.of')}
          {' '}
          <strong>{totalLimit}</strong>
          {acrossLabel ? (
            <span className="text-note"> {acrossLabel}</span>
          ) : null}
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
                    <span className="badge badge--muted">{effectiveBreakdownLabel}</span>
                  )}
                  {previous !== undefined && (
                    <span className="budget-card__prev">
                      {t('budget.prevMonth')}: {money(previous, currency, locale)}
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
                      {t('budget.edit')}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => onDelete(row.budget)}
                    >
                      {t('budget.delete')}
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