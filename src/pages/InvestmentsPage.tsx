import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { TextField, SelectField } from '../components/FormField'
import { ConfirmDialog, type ConfirmStrings } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from '../hooks/useUndo'
import { useAppState } from '../state/AppState'
import { useAuth } from '../features/auth/state/AuthContext'
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
import { formatMoney } from '../lib/money'
import { translate, type UIKey } from '../lib/i18n'
import { ownershipPercentage } from '../features/investments/services/portfolio'
import {
  investmentGroupsFor,
  investmentGroupMembers,
  scopeCurrency as scopeCurrencyFor,
} from '../features/investments/services/investmentGroupContext'
import type { InvestmentOwnership } from '../features/investments/types'
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

interface UndoInvestment {
  id: string
  item: import('../state/AppState').Investment
  ownership: InvestmentOwnership[]
}

export default function InvestmentsPage() {
  const { locale, store, addInvestment, remove, restore } = useAppState()
  const { user } = useAuth()
  const t = (key: UIKey) => translate(locale, key)
  const userId = user?.id ?? ''

  const groups = useMemo(() => (userId ? investmentGroupsFor(userId) : []), [userId])
  const [scope, setScope] = useState<string>('')
  const [shares, setShares] = useState<Record<string, string>>({})

  // When the scope changes to a group we default to an even ownership split.
  function selectScope(next: string) {
    setScope(next)
    if (!next) {
      setShares({})
      return
    }
    const members = investmentGroupMembers(next)
    if (members.length === 0) {
      setShares({})
      return
    }
    const split: Record<string, string> = {}
    const plainShare = Math.floor(100 / members.length)
    const lastMemberIndex = members.length - 1
    for (const [index, member] of members.entries()) {
      const share = index === lastMemberIndex ? 100 - plainShare * lastMemberIndex : plainShare
      split[member.userId] = String(share)
    }
    setShares(split)
  }

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

  function shareRows(): InvestmentOwnership[] {
    return Object.entries(shares)
      .map(([memberId, raw]) => ({
        investmentId: '',
        userId: memberId,
        percentage: Number(String(raw).replace(',', '.')),
      }))
      .filter((row) => !Number.isNaN(row.percentage))
  }

  function ownershipError(): string | undefined {
    if (scope === '') return undefined
    const rows = shareRows()
    if (rows.some((row) => row.percentage <= 0)) return t('investment.ownershipRules')
    const total = rows.reduce((acc, row) => acc + row.percentage, 0)
    if (Math.abs(total - 100) > 0.001) return t('investment.ownershipMismatch')
    return undefined
  }

  const groupMembers = useMemo(
    () => (scope ? investmentGroupMembers(scope) : []),
    [scope],
  )

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
    const ownershipErr = ownershipError()
    if (anyError || ownershipErr !== undefined) return
    addInvestment(
      {
        name: inv.name.trim(),
        ticker: inv.ticker.trim() || undefined,
        type: inv.type as 'stocks' | 'funds' | 'crypto' | 'bonds' | 'other',
        purchaseDate: toIsoDate(inv.purchaseDate),
        quantity: 1,
        investedAmount: Number(inv.investedAmount.replace(',', '.')),
        currency: scopeCurrencyFor(userId, scope === '' ? undefined : scope),
        groupId: scope === '' ? undefined : scope,
        createdBy: userId,
      },
      scope === '' ? undefined : shareRows(),
    )
    setInv(initial)
    setInvTouched({})
    setInvAttempted(false)
    setShares({})
  }

  const undo = useUndo<UndoInvestment>(8000)
  const [confirming, setConfirming] = useState<{ id: string; label: string } | null>(null)

  const confirmStrings: ConfirmStrings = {
    title: t('confirm.deleteTitle'),
    message: t('investment.deleteTitle'),
    confirmLabel: t('confirm.delete'),
    cancelLabel: t('confirm.cancel'),
  }

  const visible = useMemo(
    () =>
      store.investments.filter((item) => {
        if (scope === '') {
          if (item.groupId === undefined) return true
          return ownershipPercentage(item, store.investmentOwnerships, userId) > 0
        }
        return item.groupId === scope
      }),
    [store.investments, store.investmentOwnerships, scope, userId],
  )

  return (
    <Page title={t('section.investments')}>
      <div className="stack">
        <div className="dash-toolbar">
          <div className="dash-toolbar__label">
            <span className="section-indicator">{t('investment.scope')}</span>
          </div>
          <div className="dash-toolbar__select">
            <SelectField
              label={t('investment.scope')}
              name="investmentScope"
              value={scope}
              onChange={(e) => selectScope(e.target.value)}
              options={[
                { value: '', label: t('investment.personal') },
                ...groups.map((g) => ({
                  value: g.id,
                  label: t('investment.groupMine').replace('{name}', g.name),
                })),
              ]}
            />
          </div>
        </div>

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

            {scope !== '' && groupMembers.length > 0 && (
              <fieldset className="ownership-editor">
                <legend>{t('investment.ownershipTitle')}</legend>
                <p className="text-note">{t('investment.ownershipHint')}</p>
                <div className="form-row">
                  {groupMembers.map((member) => (
                    <TextField
                      key={member.userId}
                      label={member.name}
                      name={`share-${member.userId}`}
                      required
                      inputMode="decimal"
                      value={shares[member.userId] ?? ''}
                      onChange={(e) =>
                        setShares((p) => ({ ...p, [member.userId]: e.target.value }))
                      }
                      placeholder="%"
                    />
                  ))}
                </div>
                {invAttempted && ownershipError() !== undefined && (
                  <p className="form-field__error" role="alert">
                    {ownershipError()}
                  </p>
                )}
              </fieldset>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn--primary">
                {t('form.save')}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <h2>{scope ? t('investment.shared') : t('section.investments')}</h2>
          {visible.length === 0 ? (
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
                  <th scope="col">{t('investment.ownershipTitle')}</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const own = ownershipPercentage(item, store.investmentOwnerships, userId)
                  const value = item.currentValue ?? item.investedAmount
                  const shown = scope === '' && item.groupId !== undefined ? (value * own) / 100 : value
                  const sharesFor = item.groupId
                    ? store.investmentOwnerships
                        .filter((o) => o.investmentId === item.id)
                        .map((o) => o.percentage)
                        .sort((a, b) => b - a)
                        .join(' · ')
                    : ''
                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.ticker ?? '—'}</td>
                      <td>{item.type}</td>
                      <td>{formatDate(item.purchaseDate, locale)}</td>
                      <td>{formatMoney(shown, locale, scope === '' ? scopeCurrencyFor(userId, undefined) : scopeCurrencyFor(userId, scope))}</td>
                      <td>
                        {item.groupId ? (
                          <span className="text-note">{sharesFor || t('investment.shared')}</span>
                        ) : (
                          <span className="text-note">100%</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--danger"
                          onClick={() => setConfirming({ id: item.id, label: item.name })}
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
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
            const ownership = store.investmentOwnerships.filter((o) => o.investmentId === item.id)
            remove({ kind: 'investment', item, ownership })
            undo.push({ id: item.id, item, ownership }, confirming.label)
          }
          setConfirming(null)
        }}
        onCancel={() => setConfirming(null)}
      />

      {undo.snapshots.map((snap, index) => (
        <UndoToast
          key={snap.id}
          entry={{ id: snap.item.id, item: snap.item.item, label: snap.label, expiresAt: snap.expiresAt }}
          index={index}
          title={t('undo.title')}
          actionLabel={t('undo.action')}
          dismissLabel={t('undo.dismiss')}
          onUndo={(i) => {
            const s = undo.snapshots[i]
            if (s) {
              restore({ kind: 'investment', item: s.item.item, ownership: s.item.ownership })
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