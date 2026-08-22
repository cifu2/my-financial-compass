import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { TextField, SelectField } from '../components/FormField'
import { ConfirmDialog, type ConfirmStrings } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from '../hooks/useUndo'
import { useAppState, type Transaction, type Category } from '../state/AppState'
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
import { formatDate } from '../lib/dates'
import { translate, type UIKey } from '../lib/i18n'

interface TxForm {
  concept: string
  amount: string
  type: string
  categoryId: string
  date: string
}

const CONCEPT: Validator[] = [required(), maxLength(80)]
const AMOUNT: Validator[] = [required(), mustBeNumber(), greaterThan(0)]
const TYPE: Validator[] = [requiredSelect()]
const CATEGORY: Validator[] = [requiredSelect()]
const DATE: Validator[] = [required(), isValidDate(), notInFuture()]
const CAT_NAME: Validator[] = [required(), maxLength(40)]

export default function TransactionsPage() {
  const { locale, store, addTransaction, addCategory, remove, restore } =
    useAppState()
  const t = (key: UIKey) => translate(locale, key)

  // ---- transaction form
  const [tx, setTx] = useState<TxForm>(() => ({
    concept: '',
    amount: '',
    type: '',
    categoryId: '',
    date: formatDate(new Date(), locale),
  }))
  const [txTouched, setTxTouched] = useState<Partial<Record<keyof TxForm, boolean>>>({})
  const [txAttempted, setTxAttempted] = useState(false)

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
    }
  }

  function setTxField(key: keyof TxForm, value: string) {
    setTx((prev) => ({ ...prev, [key]: value }))
  }

  function resetTxForm() {
    setTx({
      concept: '',
      amount: '',
      type: '',
      categoryId: '',
      date: formatDate(new Date(), locale),
    })
    setTxTouched({})
    setTxAttempted(false)
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
    if (invalid) return
    addTransaction({
      concept: tx.concept.trim(),
      amount: Number(tx.amount.replace(',', '.')),
      type: tx.type as 'income' | 'expense',
      categoryId: tx.categoryId,
      date: toIsoDate(tx.date),
    })
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

  // ---- category form
  const [catName, setCatName] = useState('')
  const [catAttempted, setCatAttempted] = useState(false)

  function catErrLocal(): string | undefined {
    const error = validateField(catName, CAT_NAME, locale)
    return catAttempted && error ? error : undefined
  }

  function saveCategory(e: FormEvent) {
    e.preventDefault()
    setCatAttempted(true)
    if (validateField(catName, CAT_NAME, locale)) return
    addCategory({ name: catName.trim(), type: 'both', isActive: true })
    setCatName('')
    setCatAttempted(false)
  }

  // ---- delete + undo
  const txUndo = useUndo<Transaction>(8000)
  const catUndo = useUndo<Category>(8000)
  const [confirming, setConfirming] = useState<{
    kind: 'transaction' | 'category'
    id: string
    label: string
  } | null>(null)

  function onConfirmed() {
    if (!confirming) return
    const { kind, id, label } = confirming
    if (kind === 'transaction') {
      const item = store.transactions.find((x) => x.id === id)
      if (item) {
        remove({ kind, item })
        txUndo.push(item, label)
      }
    } else {
      const item = store.categories.find((x) => x.id === id)
      if (item) {
        remove({ kind, item })
        catUndo.push(item, label)
      }
    }
    setConfirming(null)
  }

  const confirmStrings: ConfirmStrings = {
    title: t('confirm.deleteTitle'),
    message:
      confirming?.kind === 'category'
        ? t('category.deleteTitle')
        : t('transaction.deleteTitle'),
    confirmLabel: t('confirm.delete'),
    cancelLabel: t('confirm.cancel'),
  }

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
              <SelectField
                label={t('fld.category')}
                name="categoryId"
                required
                value={tx.categoryId}
                error={txErr('categoryId')}
                onChange={(e) => setTxField('categoryId', e.target.value)}
                onBlur={() => setTxTouched((p) => ({ ...p, categoryId: true }))}
                options={[
                  { value: '', label: '—' },
                  ...store.categories
                    .filter((c) => c.isActive)
                    .map((c) => ({ value: c.id, label: c.name })),
                ]}
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
          <h2>{t('section.transactions')}</h2>
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
                {store.transactions.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date, locale)}</td>
                    <td>{item.concept}</td>
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
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <h2>{t('section.categories')}</h2>
          <form onSubmit={saveCategory} noValidate>
            <div className="form-row">
              <TextField
                label={t('fld.name')}
                name="catName"
                required
                value={catName}
                error={catErrLocal()}
                onChange={(e) => setCatName(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn--primary">
                {t('form.save')}
              </button>
            </div>
          </form>
          {store.categories.length === 0 ? (
            <p className="text-muted">{t('common.empty')}</p>
          ) : (
            <ul className="category-list">
              {store.categories.map((item) => (
                <li key={item.id} className="category-row">
                  <span>
                    {item.name}
                    <span className="text-muted"> · {item.type}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() =>
                      setConfirming({
                        kind: 'category',
                        id: item.id,
                        label: item.name,
                      })
                    }
                  >
                    {t('common.delete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
      {catUndo.snapshots.map((snap, index) => (
        <UndoToast
          key={snap.id}
          entry={snap}
          index={index}
          title={t('undo.title')}
          actionLabel={t('undo.action')}
          dismissLabel={t('undo.dismiss')}
          onUndo={(i) => {
            const s = catUndo.snapshots[i]
            if (s) {
              restore({ kind: 'category', item: s.item as Category })
              catUndo.clear(s.id)
            }
          }}
          onDismiss={(i) => {
            const s = catUndo.snapshots[i]
            if (s) catUndo.clear(s.id)
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
