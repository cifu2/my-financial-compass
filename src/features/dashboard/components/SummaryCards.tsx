import type { Locale } from '../../../lib/dates'
import { formatMoney } from '../../../lib/money'
import type { MonthComparison } from '../types/index'
import { translate, type UIKey } from '../../../lib/i18n'
import { useAppCurrency } from '../../auth/state/AuthContext'

export interface SummaryMetric {
  key: 'income' | 'expenses' | 'cashFlow'
  label: string
  value: number
  comparison?: MonthComparison
}

interface DeltaBadgeProps {
  comparison: MonthComparison
  locale: Locale
  /** Expenses rising is bad; income/cash-flow rising is good. */
  goodWhenDown: boolean
}

function DeltaBadge({ comparison, locale, goodWhenDown }: DeltaBadgeProps) {
  const t = (key: UIKey) => translate(locale, key)
  if (comparison.percent === null) {
    return (
      <span className="summary-card__delta summary-card__delta--flat">
        {t('dash.vsPrev')}
      </span>
    )
  }
  const up = comparison.delta > 0
  const positive = up !== goodWhenDown
  const cls = `summary-card__delta ${
    comparison.delta === 0
      ? 'summary-card__delta--flat'
      : positive
        ? 'summary-card__delta--good'
        : 'summary-card__delta--bad'
  }`
  const label = comparison.delta === 0 ? t('dash.noChange') : up ? t('dash.upAlt') : t('dash.downAlt')
  return (
    <span className={cls} aria-label={`${label}: ${comparison.percent}% ${t('dash.vsPrev')}`}>
      {up ? '↑' : comparison.delta < 0 ? '↓' : '·'} {Math.abs(comparison.percent)}% · {t('dash.vsPrev')}
    </span>
  )
}

export interface SummaryCardsProps {
  month: string
  metrics: readonly SummaryMetric[]
  locale: Locale
}

/**
 * KPI cards for one month: total income, total expenses and cash flow, each
 * with its percentage change against the previous month.
 */
export function SummaryCards({ month, metrics, locale }: SummaryCardsProps) {
  const currency = useAppCurrency()
  return (
    <div className="summary-cards" aria-label={month}>
      {metrics.map((metric) => (
        <div key={metric.key} className="panel summary-card">
          <h2 className="summary-card__label">{metric.label}</h2>
          <p className="summary-card__value">
            {formatMoney(metric.value, locale, currency)}
          </p>
          {metric.comparison && (
            <DeltaBadge
              comparison={metric.comparison}
              locale={locale}
              goodWhenDown={metric.key === 'expenses'}
            />
          )}
        </div>
      ))}
    </div>
  )
}