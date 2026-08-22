import { useCallback, useMemo } from 'react'
import type { Locale } from '../../../lib/dates'
import { monthLabel } from '../../../lib/dates'
import { formatMoney, formatSignedMoney } from '../../../lib/money'
import { translate, type UIKey } from '../../../lib/i18n'
import type { CategoryExpense, MonthComparison, MonthSummary } from '../types/index'

export interface MonthlyHistoryRow {
  month: string
  summary: MonthSummary
  /** Cash-flow change against the previous month in the table. */
  cashFlowComparison?: MonthComparison
}

export interface MonthlyHistoryViewProps {
  rows: readonly MonthlyHistoryRow[]
  locale: Locale
}

function renderTopFive(
  categories: readonly CategoryExpense[],
  t: (key: UIKey) => string,
  locale: Locale,
) {
  if (categories.length === 0) {
    return <p className="text-muted mt-0">{t('dash.noExpenses')}</p>
  }
  return (
    <ul className="breakdown-list breakdown-list--compact">
      {categories.map((item) => (
        <li key={item.categoryId} className="breakdown-row">
          <span className="breakdown-row__name">{item.categoryName}</span>
          <span className="breakdown-row__figures">
            {formatMoney(item.amount, locale)}
            <span className="text-note"> · {item.percentage} %</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Historical monthly summary: one row per month with totals, cash-flow change
 * versus the previous month, the top expense categories (expandable), and
 * CSV/print export actions.
 */
export function MonthlyHistoryView({ rows, locale }: MonthlyHistoryViewProps) {
  const t = useCallback((key: UIKey) => translate(locale, key), [locale])
  const sep = locale === 'es' ? ';' : ','

  const csv = useMemo(() => {
    const header = [t('dash.month'), t('dash.income'), t('dash.expenses'), t('dash.cashFlow')]
    const lines = [header.join(sep)]
    for (const row of rows) {
      const s = row.summary
      const f = (n: number) =>
        n.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      lines.push([monthLabel(row.month, locale), f(s.totalIncome), f(s.totalExpenses), f(s.cashFlow)].join(sep))
    }
    return lines.join('\r\n')
  }, [rows, locale, t, sep])

  function downloadCsv() {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-financial-compass-mensual.${locale === 'es' ? 'csv' : 'csv'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) {
    return <p className="text-muted mt-0">{t('dash.noData')}</p>
  }

  return (
    <div className="monthly-history">
      <div className="monthly-history__actions">
        <p className="text-note mt-0">{t('dash.exportHint')}</p>
        <div className="monthly-history__buttons">
          <button type="button" className="btn btn--secondary" onClick={downloadCsv}>
            {t('dash.downloadCsv')}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => window.print()}
          >
            {t('dash.print')}
          </button>
        </div>
      </div>

      <table className="data-table">
        <caption className="visually-hidden">{t('dash.monthlyHistory')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('dash.month')}</th>
            <th scope="col">{t('dash.income')}</th>
            <th scope="col">{t('dash.expenses')}</th>
            <th scope="col">{t('dash.cashFlow')}</th>
            <th scope="col">{t('dash.change')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cmp = row.cashFlowComparison
            return (
              <tr key={row.month}>
                <th scope="row">
                  <details className="monthly-history__details">
                    <summary>{monthLabel(row.month, locale)}</summary>
                    <div className="monthly-history__top">
                      <strong>{t('dash.topFive')}</strong>
                      {renderTopFive(row.summary.topCategories, t, locale)}
                    </div>
                  </details>
                </th>
                <td>{formatMoney(row.summary.totalIncome, locale)}</td>
                <td>{formatMoney(row.summary.totalExpenses, locale)}</td>
                <td>{formatSignedMoney(row.summary.cashFlow, locale)}</td>
                <td>
                  {cmp && cmp.percent !== null ? (
                    <span
                      className={
                        cmp.delta >= 0
                          ? 'monthly-history__delta is-up'
                          : 'monthly-history__delta is-down'
                      }
                    >
                      {cmp.delta >= 0 ? '↑' : '↓'} {Math.abs(cmp.percent)} %
                    </span>
                  ) : (
                    <span className="text-note">·</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}