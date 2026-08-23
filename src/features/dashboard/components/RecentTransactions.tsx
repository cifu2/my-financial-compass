import type { Locale } from '../../../lib/dates'
import type { Transaction } from '../../../features/transactions/types'
import type { Category } from '../../../features/categories/types'
import { formatDate } from '../../../lib/dates'
import { formatSignedMoney } from '../../../lib/money'
import { translate, type UIKey } from '../../../lib/i18n'
import { useAppCurrency } from '../../auth/state/AuthContext'

export interface RecentTransactionsProps {
  transactions: readonly Transaction[]
  categories: readonly Category[]
  locale: Locale
  emptyText: string
  viewAllLabel: string
  /**
   * When true, a leading "Origen" column tags each row (personal or group).
   * Used by the consolidated "Todo" dashboard context (HU-0.5).
   */
  showOrigin?: boolean
  originFor?: (transaction: Transaction) => string
  originHeader?: string
}

/**
 * The 5–10 most recent transactions (the page passes a pre-sliced list).
 * Mirrors the Transactions table layout for consistency.
 */
export function RecentTransactions({
  transactions,
  categories,
  locale,
  emptyText,
  viewAllLabel,
  showOrigin = false,
  originFor,
  originHeader,
}: RecentTransactionsProps) {
  const categoryName = new Map<string, string>(
    categories.map((c) => [c.id, c.name]),
  )
  const t = (key: UIKey) => translate(locale, key)
  const currency = useAppCurrency()

  if (transactions.length === 0) {
    return <p className="text-muted mt-0">{emptyText}</p>
  }

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            {showOrigin && originHeader && <th scope="col">{originHeader}</th>}
            <th scope="col">{t('fld.date')}</th>
            <th scope="col">{t('fld.description')}</th>
            <th scope="col">{t('fld.category')}</th>
            <th scope="col" className="data-table__amount">
              {t('fld.amount')}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((item) => (
            <tr key={item.id}>
              {showOrigin && (
                <td>
                  <span className="origin-tag">
                    {originFor ? originFor(item) : '—'}
                  </span>
                </td>
              )}
              <td>{formatDate(item.date, locale)}</td>
              <td>{item.concept}</td>
              <td>{categoryName.get(item.categoryId) ?? '—'}</td>
              <td>
                <span
                  className={
                    item.type === 'income' ? 'text-income' : 'text-expense'
                  }
                >
                  {formatSignedMoney(item.amount, locale, currency)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="panel-actions">
        <a className="btn btn--secondary" href="#/transactions">
          {viewAllLabel}
        </a>
      </div>
    </>
  )
}