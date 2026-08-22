import type { Locale } from '../../../lib/dates'
import { formatMoney } from '../../../lib/money'
import type { CategoryExpense } from '../types/index'
import { useAppCurrency } from '../../auth/state/AuthContext'

export interface ExpenseBreakdownProps {
  items: readonly CategoryExpense[]
  emptyText: string
  locale: Locale
  /**
   * Accessible label for the labelled sub-totals of each row (per member or
   * per origin). Only rendered when the rows carry `shares` (HU-0.5).
   */
  sharesLabel?: string
}

/**
 * Expense breakdown by category for a period: sorted rows with a compact
 * proportional bar. Values are read as text (accessible), the bar is purely
 * decorative (`role="presentation"`). Rows with `shares` show the labelled
 * sub-totals below the category so the user can see who/where the spending
 * belongs to (group members or personal/group origins in "Todo").
 */
export function ExpenseBreakdown({
  items,
  emptyText,
  locale,
  sharesLabel,
}: ExpenseBreakdownProps) {
  const currency = useAppCurrency()
  if (items.length === 0) {
    return <p className="text-muted mt-0">{emptyText}</p>
  }

  return (
    <ul className="breakdown-list">
      {items.map((item) => {
        const width = Math.max(0, Math.min(100, item.percentage))
        return (
          <li key={item.categoryId} className="breakdown-row">
            <div className="breakdown-row__top">
              <span className="breakdown-row__name">{item.categoryName}</span>
              <span className="breakdown-row__figures">
                {formatMoney(item.amount, locale, currency)}
                <span className="text-note"> · {item.percentage} %</span>
              </span>
            </div>
            <div
              className="breakdown-track"
              role="presentation"
              aria-hidden="true"
            >
              <div className="breakdown-fill" style={{ width: `${width}%` }} />
            </div>
            {item.shares && item.shares.length > 0 && (
              <ul className="share-chips" aria-label={sharesLabel}>
                {item.shares.map((share) => (
                  <li key={share.key} className="share-chips__chip">
                    <span className="share-chips__name">{share.label}</span>
                    <span className="share-chips__amount">
                      {formatMoney(share.amount, locale, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}