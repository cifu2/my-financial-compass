import type { Locale } from '../../../lib/dates'
import { formatMoney } from '../../../lib/money'
import type { BudgetRow } from '../../budgeting/types/index'
import { BudgetProgressBar } from '../../budgeting/components/BudgetProgressBar'

export interface BudgetSnapshotProps {
  rows: readonly BudgetRow[]
  emptyText: string
  locale: Locale
}

/**
 * Compact budget summary for the dashboard: one row per budget with a thin
 * threshold-colored progress bar plus spent/limit figures.
 */
export function BudgetSnapshot({ rows, emptyText, locale }: BudgetSnapshotProps) {
  if (rows.length === 0) {
    return <p className="text-muted mt-0">{emptyText}</p>
  }

  return (
    <ul className="budget-snapshot">
      {rows.map((row) => (
        <li key={row.budget.id} className="budget-snapshot__row">
          <div className="budget-snapshot__head">
            <span className="budget-snapshot__name">{row.categoryName}</span>
            <span className="budget-snapshot__figures">
              {formatMoney(row.spent, locale)} /{' '}
              {formatMoney(row.budget.limit, locale)}
            </span>
          </div>
          <BudgetProgressBar percentage={row.percentage} level={row.level} />
        </li>
      ))}
    </ul>
  )
}