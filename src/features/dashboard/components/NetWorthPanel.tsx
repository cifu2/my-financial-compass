import type { Locale } from '../../../lib/dates'
import { formatMoney } from '../../../lib/money'
import { translate, type UIKey } from '../../../lib/i18n'
import type { NetWorth, NetWorthItem } from '../types/index'

export interface NetWorthPanelProps {
  worth: NetWorth
  items: readonly NetWorthItem[]
  /** ISO date of the exchange rate snapshot; shown as a footnote. */
  ratesAsOf: string
  locale: Locale
  noInvestmentsText: string
}

/**
 * Net worth = liquid assets + current investment value, both in the primary
 * currency. Prioritizes a simple formula readout, an optional per-holding
 * breakdown with native↔primary conversion, and the rates footnote.
 */
export function NetWorthPanel({
  worth,
  items,
  ratesAsOf,
  locale,
  noInvestmentsText,
}: NetWorthPanelProps) {
  const t = (key: UIKey) => translate(locale, key)

  return (
    <div className="networth">
      <dl className="networth__formula" aria-label={t('dash.netWorth')}>
        <div className="networth__term networth__term--liquid">
          <dt>{t('dash.liquid')}</dt>
          <dd>{formatMoney(worth.liquidAssets, locale)}</dd>
        </div>
        <span className="networth__op" aria-hidden="true">
          +
        </span>
        <div className="networth__term networth__term--investments">
          <dt>{t('dash.investmentsShort')}</dt>
          <dd>{formatMoney(worth.investments, locale)}</dd>
        </div>
        <span className="networth__op" aria-hidden="true">
          =
        </span>
        <div className="networth__term networth__term--total">
          <dt>{t('dash.netWorthEq')}</dt>
          <dd>{formatMoney(worth.total, locale)}</dd>
        </div>
      </dl>

      {items.length > 0 && (
        <div className="networth__breakdown">
          <h3 className="networth__breakdown-title">
            {t('dash.investmentsShort')}
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('fld.name')}</th>
                <th scope="col">{t('dash.nativeValue')}</th>
                <th scope="col">{t('dash.currentValue')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.name}
                    {item.ticker ? (
                      <span className="text-note"> · {item.ticker}</span>
                    ) : null}
                  </td>
                  <td>
                    {formatMoney(item.nativeValue, locale, item.nativeCurrency)}
                  </td>
                  <td>
                    {item.primaryValue === null ? (
                      <span className="text-note">—</span>
                    ) : (
                      formatMoney(item.primaryValue, locale)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-muted mt-0">{noInvestmentsText}</p>
      )}

      {worth.unconvertedCount > 0 && (
        <p className="networth__note" role="status">
          {t('dash.unconverted').replace(
            '{count}',
            String(worth.unconvertedCount),
          )}
        </p>
      )}

      <p className="networth__foot text-note">
        {t('dash.ratesAsOf').replace('{date}', ratesAsOf)}
      </p>
    </div>
  )
}