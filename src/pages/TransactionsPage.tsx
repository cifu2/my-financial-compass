import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { TextField, SelectField } from '../components/FormField'
import { ConfirmDialog, type ConfirmStrings } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from '../hooks/useUndo'
import { useAppState, type Transaction } from '../state/AppState'
import { useAuth } from '../features/auth/state/AuthContext'
import { CategoryManager } from '../features/categories/components/CategoryManager'
import { CategoryPicker } from '../features/categories/components/CategoryPicker'
import { categoriesForType } from '../features/categories/services/categoryService'
import { SplitEditor, type SplitDraft } from '../features/splits/components/SplitEditor'
import { splitGroupsFor } from '../features/splits/services/splitsGroupContext'
import type { ExpenseSplit } from '../features/splits/types'
import {
  required,
  maxLength,
  mustBeNumber,
  greaterThan,
  requiredSelect,
  isValidDate,
  notInFuture,
  validateField,
  type Validator,
} from '../lib/validation'
import { formatDate, todayIso } from '../lib/dates'
import { translate, type UIKey } from '../lib/i18n'

interface TxForm {
  concept: string
  amount: string
  type: string
  categoryId: string
  date: string
  /** Group context of the transaction ('' = personal). */
  groupId: string
  /** When true the expense is shared among the group members. */
  shared: boolean
}

const CONCEPT: Validator[] = [required(), maxLength(80)]
const AMOUNT: Validator[] = [required(), mustBeNumber(), greaterThan(0)]
const TYPE: Validator[] = [requiredSelect()]
const CATEGORY: Validator[] = [requiredSelect()]
const DATE: Validator[] = [required(), isValidDate(), notInFuture()]
export default function TransactionsPage() {
  const { locale, store, addTransaction, remove, restore } =
    useAppState()
  const { user } = useAuth()
  const t = (key: UIKey) => translate(locale, key)

  // ---- group context for shared expenses (HU-0.7)
  const currentUserId = user?.id ?? ''
  const groupOptions = useMemo(() => {
    if (!currentUserId) return []
    const seen = new Set<string>()
    return splitGroupsFor(currentUserId).map((g) => ({ id: g.id, name: g.name })).filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true)))
  }, [currentUserId])

  // ---- transaction form
  const [tx, setTx] = useState<TxForm>(() => ({
    concept: '',
    amount: '',
    type: '',
    categoryId: '',
    date: formatDate(todayIso(), locale),
    groupId: '',
    shared: false,
  }))
  const [txTouched, setTxTouched] = useState<Partial<Record<keyof TxForm, boolean>>>({})
  const [txAttempted, setTxAttempted] = useState(false)
  const [splitDraft, setSplitDraft] = useState<SplitDraft | null>(null)

  const selectedGroup = tx.groupId

  function txErr(key: keyof TxForm): string | undefined {
    const validators = txValidatorsFor(key)
    const error = validators ? validateField(tx[key], validators, locale) : null
    return error && (txAttempted || txTouched[key]) ? error : undefined
  }

  function txValidatorsFor(key: keyof TxForm): Validator[] {
    switch (key) {
      case 'concept':
        return CONCEPT
      case 'amount':
        return AMOUNT
      case 'type':
        return TYPE
      case 'categoryId':
        return CATEGORY
      case 'date':
        return DATE
      default:
        return []
    }
  }

  function setTxField(key: keyof TxForm, value: string) {
    setTx((prev) => ({ ...prev, [key]: value }))
  }

  function setShared(shared: boolean) {
    setTx((prev) => ({ ...prev, shared }))
    setSplitDraft(null)
  }

  function resetTxForm() {
    setTx({
      concept: '',
      amount: '',
      type: '',
      categoryId: '',
      date: formatDate(todayIso(), locale),
      groupId: '',
      shared: false,
    })
    setTxTouched({})
    setTxAttempted(false)
    setSplitDraft(null)
  }

  function splitValid(): boolean {
    if (!tx.shared || !selectedGroup) return true // no split required
    return splitDraft !== null && splitDraft.error === null && splitDraft.shares.length > 0
  }

  function buildSplit(): Omit<ExpenseSplit, 'transactionId'> | undefined {
    if (!tx.shared || !selectedGroup || !splitDraft) return undefined
    if (splitDraft.error !== null || splitDraft.shares.length === 0) return undefined
    return {
      groupId: selectedGroup,
      paidBy: splitDraft.paidBy,
      method: splitDraft.method,
      shares: splitDraft.shares,
    }
  }

  function saveTransaction(e: FormEvent) {
    e.preventDefault()
    setTxAttempted(true)
    setTxTouched({
      concept: true,
      amount: true,
      type: true,
      categoryId: true,
      date: true,
    })
    const invalid =
      validateField(tx.concept, CONCEPT, locale) ||
      validateField(tx.amount, AMOUNT, locale) ||
      validateField(tx.type, TYPE, locale) ||
      validateField(tx.categoryId, CATEGORY, locale) ||
      validateField(tx.date, DATE, locale)
    if (invalid || !splitValid()) {
      return
    }
    const amount = Number(tx.amount.replace(',', '.'))
    addTransaction(
      {
        concept: tx.concept.trim(),
        amount,
        type: tx.type as 'income' | 'expense',
        categoryId: tx.categoryId,
        date: toIsoDate(tx.date),
        groupId: selectedGroup || undefined,
      },
      buildSplit(),
    )
    resetTxForm()
    showTxSaved(t('toast.transactionSaved'))
  }

  // ---- save confirmation toast
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const savedTimer = useRef<number | undefined>(undefined)

  function showTxSaved(title: string) {
    setSavedToast(title)
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSavedToast(null), 6000)
  }

  // ---- delete + undo
  const txUndo = useUndo<Transaction>(8000)
  const [confirming, setConfirming] = useState<{
    kind: 'transaction'
    id: string
    label: string
  } | null>(null)

  function onConfirmed() {
    if (!confirming) return
    const { kind, id, label } = confirming
    const item = store.transactions.find((x) => x.id === id)
    if (item) {
      remove({ kind, item })
      txUndo.push(item, label)
    }
    setConfirming(null)
  }

  const confirmStrings: ConfirmStrings = {
    title: t('confirm.deleteTitle'),
    message: t('transaction.deleteTitle'),
    confirmLabel: t('confirm.delete'),
    cancelLabel: t('confirm.cancel'),
  }

  const categoryOptions = useMemo(
    () => categoriesForType(store.categories, tx.type as 'income' | 'expense' | ''),
    [store.categories, tx.type],
  )

  return (
    <Page title={t('section.transactions')}>
      <div className="stack">
        <div className="panel">
          <h2>{t('common.transaction')}</h2>
          <form onSubmit={saveTransaction} noValidate>
            <div className="form-row">
              <TextField
                label={t('fld.description')}
                name="concept"
                required
                value={tx.concept}
                error={txErr('concept')}
                onChange={(e) => setTxField('concept', e.target.value)}
                onBlur={() => setTxTouched((p) => ({ ...p, concept: true }))}
                maxLength={80}
              />
            </div>
            <div className="form-row">
              <TextField
                label={t('fld.amount')}
                name="amount"
                required
                inputMode="decimal"
                value={tx.amount}
                error={txErr('amount')}
                onChange={(e) => setTxField('amount', e.target.value)}
                onBlur={() => setTxTouched((p) => ({ ...p, amount: true }))}
                placeholder="0,00"
              />
              <SelectField
                label={t('fld.type')}
                name="type"
                required
                value={tx.type}
                error={txErr('type')}
                onChange={(e) => setTxField('type', e.target.value)}
                onBlur={() => setTxTouched((p) => ({ ...p, type: true }))}
                options={[
                  { value: '', label: '—' },
                  { value: 'expense', label: t('type.expense') },
                  { value: 'income', label: t('type.income') },
                ]}
              />
            </div>
            <div className="form-row">
              <CategoryPicker
                label={t('fld.category')}
                name="categoryId"
                required
                value={tx.categoryId}
                error={txErr('categoryId')}
                onChange={(value) => setTxField('categoryId', value)}
                onBlur={() => setTxTouched((p) => ({ ...p, categoryId: true }))}
                categories={categoryOptions}
                locale={locale}
              />
              <TextField
                label={t('fld.date')}
                name="date"
                required
                inputMode="numeric"
                value={tx.date}
                error={txErr('date')}
                onChange={(e) => setTxField('date', e.target.value)}
                onBlur={() => setTxTouched((p) => ({ ...p, date: true }))}
                placeholder="DD/MM/YYYY"
              />
            </div>

            <div className="form-row">
              <SelectField
                label={t('budget.contextLabel')}
                name="groupId"
                value={tx.groupId}
                onChange={(e) => {
                  setTxField('groupId', e.target.value)
                  setSplitDraft(null)
                }}
                options={[
                  { value: '', label: t('budget.contextPersonal') },
                  ...groupOptions.map((g) => ({ value: g.id, label: g.name })),
                ]}
              />
              {tx.groupId !== '' && (
                <label className="form-field form-field--checkbox">
                  <span className="form-field__label">{t('split.share')}</span>
                  <input
                    type="checkbox"
                    name="shared"
                    checked={tx.shared}
                    onChange={(e) => setShared(e.target.checked)}
                  />
                </label>
              )}
            </div>

            {tx.groupId !== '' && tx.shared && (
<SplitEditor
                locale={locale}
                amount={Number(tx.amount.replace(',', '.'))}
                groupId={tx.groupId}
                currentUserId={currentUserId}
                attempted={txAttempted}
                onChange={(draft) => {
                  setSplitDraft(draft)
                }}
              />
            )}

            <div className="form-actions">
              <button type="button" className="btn btn--secondary" onClick={resetTxForm}>
                {t('form.cancel')}
              </button>
              <button type="submit" className="btn btn--primary">
                {t('form.save')}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>{t('section.transactions')}</h2>
            <a className="btn btn--secondary" href="#/balances">
              {t('split.balancesLink')}
            </a>
          </div>
          {store.transactions.length === 0 ? (
            <p className="text-muted">{t('common.empty')}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t('fld.date')}</th>
                  <th scope="col">{t('fld.description')}</th>
                  <th scope="col">{t('fld.category')}</th>
                  <th scope="col">{t('fld.amount')}</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {store.transactions.map((item) => {
                  const split = store.expenseSplits.find((s) => s.transactionId === item.id)
                  return (
                    <tr key={item.id}>
                      <td>{formatDate(item.date, locale)}</td>
                      <td>
                        {item.concept}
                        {split && (
                          <span className="split-badge" title={t('split.shared')}>
                            {t('split.shared')}
                          </span>
                        )}
                      </td>
                      <td>
                        {store.categories.find((c) => c.id === item.categoryId)?.name ??
                          '—'}
                      </td>
                      <td>
                        <span className={item.type === 'income' ? 'text-income' : 'text-expense'}>
                          {item.type === 'income' ? '+' : '−'} €
                          {Math.abs(item.amount).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--danger"
                          onClick={() =>
                            setConfirming({
                              kind: 'transaction',
                              id: item.id,
                              label: item.concept,
                            })
                          }
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

        <CategoryManager />
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

{txUndo.snapshots.map((snap, index) => (
        <UndoToast
          key={snap.id}
          entry={snap}
          index={index}
          title={t('undo.title')}
          actionLabel={t('undo.action')}
          dismissLabel={t('undo.dismiss')}
          onUndo={(i) => {
            const s = txUndo.snapshots[i]
            if (s) {
              restore({ kind: 'transaction', item: s.item })
              txUndo.clear(s.id)
            }
          }}
          onDismiss={(i) => {
            const s = txUndo.snapshots[i]
            if (s) txUndo.clear(s.id)
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
