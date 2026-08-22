import { useState } from 'react'
import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { TextField, SelectField } from '../components/FormField'
import { ConfirmDialog, type ConfirmStrings } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from '../hooks/useUndo'
import { useAppState } from '../state/AppState'
import {
  required,
  maxLength,
  mustBeNumber,
  minValue,
  requiredSelect,
  isValidDate,
  validateField,
  type Validator,
} from '../lib/validation'
import { formatDate } from '../lib/dates'
import { translate, type UIKey } from '../lib/i18n'
import '../components/layer.css'

interface InvestmentForm {
  name: string
  ticker: string
  type: string
  purchaseDate: string
  investedAmount: string
}

const NAME: Validator[] = [required(), maxLength(60)]
const TICKER: Validator[] = [maxLength(12)]
const TYPE: Validator[] = [requiredSelect()]
const PURCHASE_DATE: Validator[] = [required(), isValidDate()]
const INVESTED: Validator[] = [required(), mustBeNumber(), minValue(0)]

const VALIDATORS: Record<keyof InvestmentForm, Validator[]> = {
  name: NAME,
  ticker: TICKER,
  type: TYPE,
  purchaseDate: PURCHASE_DATE,
  investedAmount: INVESTED,
}

const ASSET_TYPES = [
  { value: '', label: '—' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'funds', label: 'Funds' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'bonds', label: 'Bonds' },
  { value: 'other', label: 'Other' },
]

export default function InvestmentsPage() {
  const { locale, store, addInvestment, remove, restore } = useAppState()
  const t = (key: UIKey) => translate(locale, key)

  const initial: InvestmentForm = {
    name: '',
    ticker: '',
    type: '',
    purchaseDate: '',
    investedAmount: '',
  }
  const [inv, setInv] = useState<InvestmentForm>(initial)
  const [invTouched, setInvTouched] = useState<Partial<Record<keyof InvestmentForm, boolean>>>({})
  const [invAttempted, setInvAttempted] = useState(false)

  function errShown(key: keyof InvestmentForm): string | undefined {
    const error = validateField(inv[key], VALIDATORS[key], locale)
    return (invAttempted || invTouched[key]) && error ? error : undefined
  }

  function saveInvestment(e: FormEvent) {
    e.preventDefault()
    setInvAttempted(true)
    setInvTouched({
      name: true,
      ticker: true,
      type: true,
      purchaseDate: true,
      investedAmount: true,
    })
    const anyError = (Object.keys(VALIDATORS) as (keyof InvestmentForm)[]).some(
      (key) => validateField(inv[key], VALIDATORS[key], locale),
    )
    if (anyError) return
    addInvestment({
      name: inv.name.trim(),
      ticker: inv.ticker.trim() || undefined,
      type: inv.type as 'stocks' | 'funds' | 'crypto' | 'bonds' | 'other',
      purchaseDate: toIsoDate(inv.purchaseDate),
      quantity: 1,
      investedAmount: Number(inv.investedAmount.replace(',', '.')),
      currency: 'EUR',
    })
    setInv(initial)
    setInvTouched({})
    setInvAttempted(false)
  }

  const undo = useUndo<import('../state/AppState').Investment>(8000)
  const [confirming, setConfirming] = useState<{
    id: string
    label: string
  } | null>(null)

  const confirmStrings: ConfirmStrings = {
    title: t('confirm.deleteTitle'),
    message: t('investment.deleteTitle'),
    confirmLabel: t('confirm.delete'),
    cancelLabel: t('confirm.cancel'),
  }

  return (
    <Page title={t('section.investments')}>
      <div className="stack">
        <div className="panel">
          <h2>{t('common.investment')}</h2>
          <form onSubmit={saveInvestment} noValidate>
            <div className="form-row">
              <TextField
                label={t('fld.name')}
                name="invName"
                required
                value={inv.name}
                error={errShown('name')}
                onChange={(e) => setInv((p) => ({ ...p, name: e.target.value }))}
                onBlur={() => setInvTouched((p) => ({ ...p, name: true }))}
              />
              <TextField
                label={t('fld.value')}
                name="investedAmount"
                required
                inputMode="decimal"
                value={inv.investedAmount}
                error={errShown('investedAmount')}
                onChange={(e) => setInv((p) => ({ ...p, investedAmount: e.target.value }))}
                onBlur={() => setInvTouched((p) => ({ ...p, investedAmount: true }))}
                placeholder="0,00"
              />
            </div>
            <div className="form-row">
              <SelectField
                label="Type"
                name="invType"
                required
                value={inv.type}
                error={errShown('type')}
                onChange={(e) => setInv((p) => ({ ...p, type: e.target.value }))}
                onBlur={() => setInvTouched((p) => ({ ...p, type: true }))}
                options={ASSET_TYPES}
              />
              <TextField
                label={t('fld.date')}
                name="purchaseDate"
                required
                inputMode="numeric"
                value={inv.purchaseDate}
                error={errShown('purchaseDate')}
                onChange={(e) => setInv((p) => ({ ...p, purchaseDate: e.target.value }))}
                onBlur={() => setInvTouched((p) => ({ ...p, purchaseDate: true }))}
                placeholder="DD/MM/YYYY"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn--primary">
                {t('form.save')}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <h2>{t('section.investments')}</h2>
          {store.investments.length === 0 ? (
            <p className="text-muted">{t('common.empty')}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Ticker</th>
                  <th scope="col">Type</th>
                  <th scope="col">{t('fld.date')}</th>
                  <th scope="col">{t('fld.value')}</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {store.investments.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.ticker ?? '—'}</td>
                    <td>{item.type}</td>
                    <td>{formatDate(item.purchaseDate, locale)}</td>
                    <td>€ {item.investedAmount.toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--danger"
                        onClick={() =>
                          setConfirming({ id: item.id, label: item.name })
                        }
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        strings={confirmStrings}
        onConfirm={() => {
          if (!confirming) return
          const item = store.investments.find((x) => x.id === confirming.id)
          if (item) {
            remove({ kind: 'investment', item })
            undo.push(item, confirming.label)
          }
          setConfirming(null)
        }}
        onCancel={() => setConfirming(null)}
      />

      {undo.snapshots.map((snap, index) => (
        <UndoToast
          key={snap.id}
          entry={snap}
          index={index}
          title={t('undo.title')}
          actionLabel={t('undo.action')}
          dismissLabel={t('undo.dismiss')}
          onUndo={(i) => {
            const s = undo.snapshots[i]
            if (s) {
              restore({ kind: 'investment', item: s.item })
              undo.clear(s.id)
            }
          }}
          onDismiss={(i) => {
            const s = undo.snapshots[i]
            if (s) undo.clear(s.id)
          }}
        />
      ))}
    </Page>
  )
}

function toIsoDate(ddmmYYYY: string): string {
  const [d, m, y] = ddmmYYYY.split('/').map((p) => (p || '').padStart(2, '0'))
  return `${y}-${m}-${d}`
}