import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { TextField, SelectField } from '../components/FormField'
import { ConfirmDialog, type ConfirmStrings } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from '../hooks/useUndo'
import { useAppState, type Transaction } from '../state/AppState'
import { CategoryManager } from '../features/categories/components/CategoryManager'
import { CategoryPicker } from '../features/categories/components/CategoryPicker'
import { categoriesForType } from '../features/categories/services/categoryService'
import { readSessionUser } from '../features/auth/services/authService'
import { listUserGroups } from '../features/groups/services/groupService'
import { groupAccessFor } from '../features/groups/access'
import type { MyGroup } from '../features/groups/types'
import {
  transactionGroupName,
  transactionCreatorFor,
  type TransactionGroupOption,
} from '../features/transactions/services/transactionGroupContext'
import { SplitEditor, type SplitDraft } from '../features/splits/components/SplitEditor'
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
import { formatDate, parseDdmmYyyy, todayIso } from '../lib/dates'
import { translate, type UIKey } from '../lib/i18n'
import { buildTransactionsCsv, downloadCsv } from '../lib/csvExport'
import '../features/transactions/transactions.css'

interface TxForm {
  concept: string
  amount: string
  type: string
  categoryId: string
  date: string
  /** '' = personal; otherwise the group the transaction belongs to (HU-0.6). */
  groupId: string
  /** When true the expense is shared among the group members. */
  shared: boolean
}

const CONCEPT: Validator[] = [required(), maxLength(80)]
const AMOUNT: Validator[] = [required(), mustBeNumber(), greaterThan(0)]
const TYPE: Validator[] = [requiredSelect()]
const CATEGORY: Validator[] = [requiredSelect()]
const DATE: Validator[] = [required(), isValidDate(), notInFuture()]

/** Transaction list context (HU-0.6): personal, one group, or everything. */
const TX_CONTEXT_PERSONAL = 'personal'
const TX_CONTEXT_ALL = 'all'

function emptyTx(locale: 'es' | 'en', groupId = ''): TxForm {
  return {
    concept: '',
    amount: '',
    type: '',
    categoryId: '',
    date: formatDate(todayIso(), locale),
    groupId,
    shared: false,
  }
}

export default function TransactionsPage() {
  const { locale, store, addTransaction, updateTransaction, remove, restore } =
    useAppState()
  const t = useCallback((key: UIKey) => translate(locale, key), [locale])

  // ---- current user + their groups (context-aware, MYF-22 / HU-0.6)
  const currentUserId = readSessionUser()?.id ?? null

  const currentUserIdRef = useRef(currentUserId)
  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  // Groups owned by the activated user, keyed so a session switch never leaks
  // another member's options between users (same pattern as the dashboard).
  const [loadedGroups, setLoadedGroups] = useState<{
    userId: string
    groups: TransactionGroupOption[]
  } | null>(null)

  useEffect(() => {
    if (!currentUserId) return
    let cancelled = false
    void listUserGroups(currentUserId).then((userGroups: MyGroup[]) => {
      if (cancelled) return
      const options: TransactionGroupOption[] = userGroups
        .map((g) => ({
          id: g.id,
          name: g.name,
          role: g.role,
          canEdit: groupAccessFor(g.id, currentUserId).canEdit,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setLoadedGroups({ userId: currentUserId, groups: options })
    })
    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const userGroups = useMemo(
    () => (loadedGroups !== null && loadedGroups.userId === currentUserId ? loadedGroups.groups : []),
    [loadedGroups, currentUserId],
  )
  const hasGroups = userGroups.length > 0
  // Which context the list shows. Defaults to "personal" so members opt-in to
  // group ledgers; when no groups exist personal and all are equivalent.
  const [listContext, setListContext] = useState<string>(TX_CONTEXT_PERSONAL)

  const visibleTransactions = useMemo(() => {
    if (listContext === TX_CONTEXT_ALL) return store.transactions
    if (listContext === TX_CONTEXT_PERSONAL) {
      return store.transactions.filter((tr) => tr.groupId === undefined)
    }
    return store.transactions.filter((tr) => tr.groupId === listContext)
  }, [store.transactions, listContext])

  // ---- transaction form (create + edit/reassign)
  const [tx, setTx] = useState<TxForm>(() => emptyTx(locale))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [txTouched, setTxTouched] = useState<Partial<Record<keyof TxForm, boolean>>>({})
  const [txAttempted, setTxAttempted] = useState(false)
  const [splitDraft, setSplitDraft] = useState<SplitDraft | null>(null)

  const selectedGroup = tx.groupId

  function txErr(key: keyof TxForm): string | undefined {
    const validators = txValidatorsFor(key)
    const error = validators ? validateField(tx[key], validators, locale) : null
    return error && (txAttempted || txTouched[key]) ? error : undefined
  }

  function txValidatorsFor(key: keyof TxForm): Validator[] | undefined {
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
      case 'groupId':
        // Every option is valid; the personal context is '', a group its id.
        return undefined
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
    setEditingId(null)
    // The default proposes the active context (HU-0.6): when the filtered
    // list is a group, fresh transactions belong to that group by default.
    const proposed = listContext !== TX_CONTEXT_PERSONAL && listContext !== TX_CONTEXT_ALL ? listContext : ''
    setTx(emptyTx(locale, proposed))
    setTxTouched({})
    setTxAttempted(false)
    setSplitDraft(null)
  }

  function startEdit(item: Transaction) {
    setEditingId(item.id)
    setTx({
      concept: item.concept,
      amount: String(item.amount).replace('.', ','),
      type: item.type,
      categoryId: item.categoryId,
      date: formatDate(item.date, locale),
      groupId: item.groupId ?? '',
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
      groupId: true,
    })
    const invalid =
      validateField(tx.concept, CONCEPT, locale) ||
      validateField(tx.amount, AMOUNT, locale) ||
      validateField(tx.type, TYPE, locale) ||
      validateField(tx.categoryId, CATEGORY, locale) ||
      validateField(tx.date, DATE, locale)
    if (invalid || !splitValid()) return
    const groupId = tx.groupId !== '' ? tx.groupId : undefined
    if (editingId !== null) {
      updateTransaction(editingId, {
        concept: tx.concept.trim(),
        amount: Number(tx.amount.replace(',', '.')),
        type: tx.type as 'income' | 'expense',
        categoryId: tx.categoryId,
        date: parseDdmmYyyy(tx.date),
        groupId,
      })
      showTxSaved(t('toast.transactionUpdated'))
    } else {
      addTransaction(
        {
          concept: tx.concept.trim(),
          amount: Number(tx.amount.replace(',', '.')),
          type: tx.type as 'income' | 'expense',
          categoryId: tx.categoryId,
          date: parseDdmmYyyy(tx.date),
          groupId,
        },
        buildSplit(),
      )
      showTxSaved(t('toast.transactionSaved'))
    }
    resetTxForm()
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
    id: string
    label: string
  } | null>(null)

  function onConfirmed() {
    if (!confirming) return
    const { id, label } = confirming
    const item = store.transactions.find((x) => x.id === id)
    if (item) {
      remove({ kind: 'transaction', item })
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

  // HU-0.10 permission gating: shared rows are only manageable while the actor
  // keeps edit rights in the row's group; personal rows are always manageable.
  const canManage = useCallback(
    (item: Transaction): boolean => {
      if (item.groupId === undefined) return true
      const access = groupAccessFor(item.groupId, currentUserId ?? undefined)
      return access.canEditRecord(item.userId)
    },
    [currentUserId],
  )

  function changeListContext(value: string) {
    setListContext(value)
    // HU-0.6: por defecto se propone el contexto activo en el formulario.
    if (editingId === null) {
      const proposed = value !== TX_CONTEXT_PERSONAL && value !== TX_CONTEXT_ALL ? value : ''
      setTx((prev) => ({ ...prev, groupId: proposed }))
    }
  }

  function handleExportCsv() {
    const csv = buildTransactionsCsv(visibleTransactions, readSessionUser()?.currency ?? 'EUR', (id) => {
      return store.categories.find((c) => c.id === id) ?? undefined
    })
    downloadCsv(csv, `transacciones_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const showListContext = hasGroups

  const groupOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: '', label: t('transaction.contextPersonal') },
    ]
    for (const g of userGroups) {
      if (g.canEdit) opts.push({ value: g.id, label: g.name })
    }
    // Keep an edition's current group selectable even if rights lapsed.
    const current = tx.groupId
    if (current !== '' && !opts.some((o) => o.value === current)) {
      opts.push({ value: current, label: t('transaction.grouped').replace('{name}', transactionGroupName(current) ?? current) })
    }
    return opts
  }, [userGroups, tx.groupId, t])

  const showGroupInForm = userGroups.length > 0 || tx.groupId !== ''

  return (
    <Page title={t('section.transactions')}>
      <div className="stack">
        <div className="panel">
          <h2>{editingId !== null ? t('form.edit') : t('common.transaction')}</h2>
          <form onSubmit={saveTransaction} noValidate>
            {showGroupInForm && (
              <div className="form-row">
                <SelectField
                  label={t('transaction.contextLabel')}
                  name="groupId"
                  value={tx.groupId}
                  error={undefined}
                  onChange={(e) => {
                    setTxField('groupId', e.target.value)
                    setSplitDraft(null)
                  }}
                  options={groupOptions}
                />
              </div>
            )}
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

            {tx.groupId !== '' && tx.shared && (
              <div className="form-row">
                <SplitEditor
                  locale={locale}
                  amount={Number(tx.amount.replace(',', '.'))}
                  groupId={tx.groupId}
                  currentUserId={currentUserId ?? ''}
                  attempted={txAttempted}
                  onChange={(draft) => {
                    setSplitDraft(draft)
                  }}
                />
              </div>
            )}

            {tx.groupId !== '' && (
              <div className="form-row">
                <label className="form-field form-field--checkbox">
                  <span className="form-field__label">{t('split.share')}</span>
                  <input
                    type="checkbox"
                    name="shared"
                    checked={tx.shared}
                    onChange={(e) => setShared(e.target.checked)}
                  />
                </label>
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn--secondary" onClick={resetTxForm}>
                {t('form.cancel')}
              </button>
              <button type="submit" className="btn btn--primary">
                {editingId !== null ? t('form.submit') : t('form.save')}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="tx-list-header">
            <h2>{t('section.transactions')}</h2>
            <div className="tx-list-tools">
              <a className="btn btn--secondary" href="#/balances">
                {t('split.balancesLink')}
              </a>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleExportCsv}
                title={t('common.exportHint')}
              >
                {t('common.downloadCsv')}
              </button>
              {showListContext && (
                <label className="tx-context-filter">
                  <span className="visually-hidden">{t('recurring.contextFilterLabel')}</span>
                  <select
                    className="input"
                    value={listContext}
                    onChange={(e) => changeListContext(e.target.value)}
                  >
                    <option value={TX_CONTEXT_PERSONAL}>{t('transaction.contextPersonal')}</option>
                    <option value={TX_CONTEXT_ALL}>{t('transaction.contextAll')}</option>
                    {userGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
          {visibleTransactions.length === 0 ? (
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
                {visibleTransactions.map((item) => {
                  const split = store.expenseSplits.find((s) => s.transactionId === item.id)
                  return (
                    <tr key={item.id}>
                      <td>{formatDate(item.date, locale)}</td>
                      <td>
                        <span className="tx-description">
                          {item.concept}
                          {split && (
                            <span className="split-badge" title={t('split.shared')}>
                              {t('split.shared')}
                            </span>
                          )}
                          {item.groupId !== undefined && (
                            <span className="origin-tag">
                              {transactionGroupName(item.groupId) ?? item.groupId}
                            </span>
                          )}
                          {item.userId !== undefined && currentUserId !== null &&
                            !transactionCreatorFor(item.userId, currentUserId).isSelf && (
                            <span className="text-muted tx-added-by">
                              {t('transaction.addedBy').replace(
                                '{name}',
                                transactionCreatorFor(
                                  item.userId,
                                  currentUserId,
                                ).name,
                              )}
                            </span>
                          )}
                        </span>
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
                      <td className="data-table__actions">
                        {canManage(item) && (
                          <span className="tx-actions">
                            <button
                              type="button"
                              className="btn btn--secondary"
                              onClick={() => startEdit(item)}
                            >
                              {t('form.edit')}
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger"
                              onClick={() =>
                                setConfirming({ id: item.id, label: item.concept })
                              }
                            >
                              {t('common.delete')}
                            </button>
                          </span>
                        )}
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