import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { TextField, SelectField } from '../components/FormField'
import { ConfirmDialog, type ConfirmStrings } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from '../hooks/useUndo'
import { useAppState } from '../state/AppState'
import { useAuth } from '../features/auth/state/AuthContext'
import { splitGroupsFor, splitGroupMembers } from '../features/splits/services/splitsGroupContext'
import { computeBalances } from '../features/splits/services/debtBalances'
import type { Settlement } from '../features/splits/types'
import {
  validateField,
  required,
  mustBeNumber,
  greaterThan,
  requiredSelect,
  isValidDate,
  notInFuture,
  type Validator,
} from '../lib/validation'
import { formatDate, toIsoDate, type Locale } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { translate, type UIKey } from '../lib/i18n'
import { groupActivityHref } from '../router'

interface SettlementForm {
  fromUserId: string
  toUserId: string
  amount: string
  date: string
  note: string
}

const FROM: Validator[] = [requiredSelect()]
const TO: Validator[] = [requiredSelect()]
const AMOUNT: Validator[] = [required(), mustBeNumber(), greaterThan(0)]
const DATE: Validator[] = [required(), isValidDate(), notInFuture()]

function blankSettlementForm(locale: Locale): SettlementForm {
  return {
    fromUserId: '',
    toUserId: '',
    amount: '',
    date: formatDate(new Date(), locale),
    note: '',
  }
}

export default function BalancesPage() {
  const { locale, store, addSettlement, removeSettlement } = useAppState()
  const { user } = useAuth()
  const t = (key: UIKey) => translate(locale, key)
  const userId = user?.id ?? ''
  const currency = user?.currency ?? 'EUR'

  const groups = useMemo(() => (userId ? splitGroupsFor(userId) : []), [userId])
  const [groupId, setGroupId] = useState<string>('')

  const members = useMemo(() => (groupId ? splitGroupMembers(groupId) : []), [groupId])
  const nameFor = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.userId, m.name)
    return map
  }, [members])

  const view = useMemo(
    () =>
      groupId
        ? computeBalances(groupId, store.transactions, store.expenseSplits, store.settlements)
        : { balances: [], positions: new Map() },
    [groupId, store.transactions, store.expenseSplits, store.settlements],
  )

  const settlements = useMemo(
    () =>
      store.settlements
        .filter((s) => s.groupId === groupId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.settlements, groupId],
  )

  // ---- settlement form
  const [form, setForm] = useState<SettlementForm>(() => blankSettlementForm(locale))
  const [touched, setTouched] = useState<Partial<Record<keyof SettlementForm, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [sameUserError, setSameUserError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const savedTimer = useRef<number | undefined>(undefined)

  function showSaved() {
    setSavedToast(t('balances.settledToast'))
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSavedToast(null), 6000)
  }

  function fieldError(key: keyof SettlementForm): string | undefined {
    const validators = FIELD_VALIDATORS[key]
    const error = validators ? validateField(form[key], validators, locale) : null
    return error && (attempted || touched[key]) ? error : undefined
  }

  function submitSettlement(e: FormEvent) {
    e.preventDefault()
    setAttempted(true)
    setTouched({ fromUserId: true, toUserId: true, amount: true, date: true })
    const invalid =
      validateField(form.fromUserId, FROM, locale) ||
      validateField(form.toUserId, TO, locale) ||
      validateField(form.amount, AMOUNT, locale) ||
      validateField(form.date, DATE, locale)
    if (invalid || !groupId) return
    if (form.fromUserId === form.toUserId) {
      setSameUserError(t('balances.sameUser'))
      return
    }
    setSameUserError(null)
    addSettlement({
      groupId,
      fromUserId: form.fromUserId,
      toUserId: form.toUserId,
      amount: Number(form.amount.replace(',', '.')),
      date: toIsoDate(form.date),
      note: form.note.trim() || undefined,
    })
    setForm(blankSettlementForm(locale))
    setTouched({})
    setAttempted(false)
    showSaved()
  }

  // ---- delete settlement + undo
  const settlementUndo = useUndo<Settlement>(8000)
  const [confirming, setConfirming] = useState<Settlement | null>(null)

  const confirmStrings: ConfirmStrings = {
    title: t('balances.deleteTitle'),
    message: t('balances.deleteMessage'),
    confirmLabel: t('confirm.delete'),
    cancelLabel: t('confirm.cancel'),
  }

  function onConfirmed() {
    if (!confirming) return
    removeSettlement(confirming.id)
    settlementUndo.push(confirming, confirming.fromUserId)
    setConfirming(null)
  }

  function quickSettle(debt: { debtorId: string; creditorId: string; amount: number }) {
    setSameUserError(null)
    setForm({
      fromUserId: debt.debtorId,
      toUserId: debt.creditorId,
      amount: debt.amount.toFixed(2).replace('.', ','),
      date: formatDate(new Date(), locale),
      note: '',
    })
  }

  return (
    <Page title={t('balances.title')}>
      <div className="stack">
        <div className="dash-toolbar">
          <div className="dash-toolbar__label">
            <span className="section-indicator">{t('balances.contextLabel')}</span>
          </div>
          <div className="dash-toolbar__select">
            <SelectField
              label={t('balances.contextLabel')}
              name="balanceGroup"
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value)
                setForm(blankSettlementForm(locale))
                setSameUserError(null)
                setTouched({})
                setAttempted(false)
              }}
              options={[
                { value: '', label: '—' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
          </div>
          {groupId !== '' && (
            <a className="btn btn--secondary" href={groupActivityHref(groupId)}>
              {t('group.viewActivity')}
            </a>
          )}
        </div>

        {groupId === '' ? (
          <p className="text-muted">{t('balances.selectGroup')}</p>
        ) : (
          <>
            <div className="panel">
              <h2>{t('balances.debts')}</h2>
              {view.balances.length === 0 ? (
                <p className="text-muted">{t('balances.none')}</p>
              ) : (
                <>
                  <ul className="debt-list">
                    {view.balances.map((debt, i) => (
                      <li key={`${debt.debtorId}-${debt.creditorId}-${i}`} className="debt-row">
                        <span>
                          <strong>{nameFor.get(debt.debtorId) ?? debt.debtorId}</strong>
                          {' ' + t('balances.debtWord') + ' '}
                          {formatMoney(debt.amount, locale, currency)}
                          {' ' + t('balances.toWord') + ' '}
                          <strong>{nameFor.get(debt.creditorId) ?? debt.creditorId}</strong>
                        </span>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => quickSettle(debt)}
                        >
                          {t('balances.settleTitle')}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-note">{t('balances.tip')}</p>
                </>
              )}
            </div>

            <div className="panel">
              <h2>{t('balances.active')}</h2>
              {members.length === 0 ? (
                <p className="text-muted">{t('common.empty')}</p>
              ) : (
                <ul className="split-summary">
                  {members.map((m) => {
                    const net = view.positions.get(m.userId) ?? 0
                    if (net === 0) return null
                    return (
                      <li key={m.userId}>
                        {m.name}:{' '}
                        {net > 0
                          ? t('balances.inCredit').replace(
                              '{amount}',
                              formatMoney(net, locale, currency),
                            )
                          : t('balances.inDebt').replace(
                              '{amount}',
                              formatMoney(-net, locale, currency),
                            )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="panel">
              <h2>{t('balances.settleTitle')}</h2>
              <form onSubmit={submitSettlement} noValidate>
                <div className="form-row">
                  <SelectField
                    label={t('balances.fromLabel')}
                    name="fromUserId"
                    required
                    value={form.fromUserId}
                    error={fieldError('fromUserId')}
                    onChange={(e) => setForm((p) => ({ ...p, fromUserId: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, fromUserId: true }))}
                    options={members.map((m) => ({ value: m.userId, label: m.name }))}
                  />
                  <SelectField
                    label={t('balances.toLabel')}
                    name="toUserId"
                    required
                    value={form.toUserId}
                    error={fieldError('toUserId')}
                    onChange={(e) => setForm((p) => ({ ...p, toUserId: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, toUserId: true }))}
                    options={members.map((m) => ({ value: m.userId, label: m.name }))}
                  />
                  <TextField
                    label={t('balances.amountLabel')}
                    name="amount"
                    required
                    inputMode="decimal"
                    value={form.amount}
                    error={fieldError('amount')}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, amount: true }))}
                    placeholder="0,00"
                  />
                  <TextField
                    label={t('balances.dateLabel')}
                    name="date"
                    required
                    inputMode="numeric"
                    value={form.date}
                    error={fieldError('date')}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, date: true }))}
                    placeholder="DD/MM/YYYY"
                  />
                  <TextField
                    label={t('balances.noteLabel')}
                    name="note"
                    value={form.note}
                    onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </div>
                {sameUserError && (
                  <p className="form-field__error" role="alert">
                    {sameUserError}
                  </p>
                )}
                <div className="form-actions">
                  <button type="submit" className="btn btn--primary">
                    {t('balances.settleSubmit')}
                  </button>
                </div>
              </form>
            </div>

            <div className="panel">
              <h2>{t('balances.history')}</h2>
              {settlements.length === 0 ? (
                <p className="text-muted">{t('balances.historyEmpty')}</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('fld.date')}</th>
                      <th scope="col">{t('balances.fromLabel')}</th>
                      <th scope="col">{t('balances.toLabel')}</th>
                      <th scope="col">{t('balances.amountLabel')}</th>
                      <th scope="col">{t('balances.noteLabel')}</th>
                      <th scope="col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr key={s.id}>
                        <td>{formatDate(s.date, locale)}</td>
                        <td>{nameFor.get(s.fromUserId) ?? s.fromUserId}</td>
                        <td>{nameFor.get(s.toUserId) ?? s.toUserId}</td>
                        <td>{formatMoney(s.amount, locale, currency)}</td>
                        <td>{s.note ?? '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            onClick={() => setConfirming(s)}
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
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        strings={confirmStrings}
        onConfirm={onConfirmed}
        onCancel={() => setConfirming(null)}
      />

      {savedToast && (
        <div className="undo-toast undo-toast--success" role="status" aria-live="polite">
          <span className="undo-toast-text">
            <strong>{savedToast}</strong>
          </span>
          <span className="undo-toast-buttons">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setSavedToast(null)}
            >
              {t('undo.dismiss')}
            </button>
          </span>
        </div>
      )}

      {settlementUndo.snapshots.map((snap, index) => (
        <UndoToast
          key={snap.id}
          entry={snap}
          index={index}
          title={t('undo.title')}
          actionLabel={t('undo.action')}
          dismissLabel={t('undo.dismiss')}
          onUndo={(i) => {
            const s = settlementUndo.snapshots[i]
            if (s) {
              addSettlement({
                groupId: s.item.groupId,
                fromUserId: s.item.fromUserId,
                toUserId: s.item.toUserId,
                amount: s.item.amount,
                date: s.item.date,
                note: s.item.note,
              })
              settlementUndo.clear(s.id)
            }
          }}
          onDismiss={(i) => {
            const s = settlementUndo.snapshots[i]
            if (s) settlementUndo.clear(s.id)
          }}
        />
      ))}
    </Page>
  )
}

const FIELD_VALIDATORS: Record<keyof SettlementForm, Validator[]> = {
  fromUserId: FROM,
  toUserId: TO,
  amount: AMOUNT,
  date: DATE,
  note: [],
}