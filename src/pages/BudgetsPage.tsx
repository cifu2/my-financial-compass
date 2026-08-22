import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { TextField, SelectField } from '../components/FormField'
import { ConfirmDialog, type ConfirmStrings } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from '../hooks/useUndo'
import { useAppState } from '../state/AppState'
import { BudgetDashboard } from '../features/budgeting/components/BudgetDashboard'
import { BudgetContextSelector } from '../features/budgeting/components/BudgetContextSelector'
import {
  buildBudgetRows,
  spentForCategory,
  summarize,
  type SpendingInput,
} from '../features/budgeting/services/budgetCalculator'
import {
  groupBudgetOptions,
  groupMembers,
} from '../features/budgeting/services/budgetScope'
import type { Budget, BudgetPeriod } from '../features/budgeting/types'
import { readSessionUser } from '../features/auth/services/authService'
import {
  required,
  mustBeNumber,
  minValue,
  requiredSelect,
  validateField,
  type Validator,
} from '../lib/validation'
import { translate, type UIKey } from '../lib/i18n'
import '../components/layer.css'

interface BudgetForm {
  categoryId: string
  limit: string
  period: string
}

const CATEGORY: Validator[] = [requiredSelect()]
const LIMIT: Validator[] = [required(), mustBeNumber(), minValue(0.01)]
const PERIOD: Validator[] = [requiredSelect()]

const VALIDATORS: Record<keyof BudgetForm, Validator[]> = {
  categoryId: CATEGORY,
  limit: LIMIT,
  period: PERIOD,
}

function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function previousMonthKey(date = new Date()): string {
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

const EMPTY_FORM: BudgetForm = { categoryId: '', limit: '', period: 'monthly' }

export default function BudgetsPage() {
  const { locale, store, addBudget, updateBudget, remove, restore } =
    useAppState()
  const t = (key: UIKey) => translate(locale, key)

  // HU-0.8: the active context (personal vs group) scopes what is shown and
  // what new budgets belong to.
  const groupId = store.budgetGroupId ?? null
  const contextGroupId = groupId
  const isGroupContext = contextGroupId !== null
  const currentUserId = readSessionUser()?.id ?? null

  const month = currentMonthKey()
  const prevMonth = previousMonthKey()

  const selectableCategories = useMemo(
    () =>
      store.categories.filter(
        (c) => c.isActive && (c.type === 'expense' || c.type === 'both'),
      ),
    [store.categories],
  )

  const categoryNameFor = useMemo(() => {
    const map = new Map(store.categories.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? null
  }, [store.categories])

  const options = useMemo(
    () =>
      isGroupContext && contextGroupId !== null
        ? groupBudgetOptions(contextGroupId, currentUserId)
        : { currentUserId, memberIds: undefined, memberNames: undefined },
    [isGroupContext, groupId, currentUserId], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const context = useMemo(
    () =>
      ({
        kind: isGroupContext ? 'group' : 'personal',
        groupId: contextGroupId,
      }) as const,
    [isGroupContext, contextGroupId],
  )

  const expenseInputs: SpendingInput[] = useMemo(
    () =>
      store.transactions
        .filter((tr) => tr.type === 'expense')
        .map((tr) => ({
          amount: tr.amount,
          date: tr.date,
          categoryId: tr.categoryId,
          userId: tr.userId,
          groupId: tr.groupId,
        })),
    [store.transactions],
  )

  const rows = useMemo(
    () =>
      buildBudgetRows(
        store.budgets,
        expenseInputs,
        () => true,
        month,
        categoryNameFor,
        { context, currentUserId: options.currentUserId, memberIds: options.memberIds, memberNames: options.memberNames },
      ),
    [store.budgets, expenseInputs, month, categoryNameFor, context, options],
  )

  const summary = useMemo(() => summarize(rows), [rows])

  const previousSpentByBudgetId = useMemo(() => {
    const map = new Map<string, number>()
    for (const budget of store.budgets) {
      const spent = spentForCategory(
        expenseInputs,
        budget.categoryId,
        prevMonth,
        () => true,
        { context, currentUserId: options.currentUserId, memberIds: options.memberIds },
      )
      if (spent > 0) map.set(budget.id, spent)
    }
    return map
  }, [store.budgets, expenseInputs, prevMonth, context, options])

  // ---- budget form (create + edit)
  const [form, setForm] = useState<BudgetForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [touched, setTouched] = useState<Partial<Record<keyof BudgetForm, boolean>>>({})
  const [attempted, setAttempted] = useState(false)

  function fieldError(key: keyof BudgetForm): string | undefined {
    if (key === 'categoryId') {
      const base = validateField(form.categoryId, CATEGORY, locale)
      if (!base && duplicateCategorySelected()) {
        return attempted || touched.categoryId ? t('budget.duplicate') : undefined
      }
      if (base && (attempted || touched.categoryId)) return base
      return undefined
    }
    const error = validateField(form[key], VALIDATORS[key], locale)
    return error && (attempted || touched[key]) ? error : undefined
  }

  function duplicateCategorySelected(): boolean {
    return store.budgets.some(
      (b) =>
        b.categoryId === form.categoryId &&
        b.id !== editingId &&
        (b.groupId ?? null) === contextGroupId,
    )
  }

  function startEdit(budget: Budget) {
    setEditingId(budget.id)
    setForm({
      categoryId: budget.categoryId,
      limit: String(budget.limit).replace('.', ','),
      period: budget.period,
    })
    setTouched({})
    setAttempted(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setTouched({})
    setAttempted(false)
  }

  function saveBudget(e: FormEvent) {
    e.preventDefault()
    setAttempted(true)
    setTouched({ categoryId: true, limit: true, period: true })
    const anyInvalid =
      validateField(form.categoryId, CATEGORY, locale) !== null ||
      duplicateCategorySelected() ||
      validateField(form.limit, LIMIT, locale) !== null ||
      validateField(form.period, PERIOD, locale) !== null
    if (anyInvalid) return

    const payload = {
      categoryId: form.categoryId,
      limit: Number(form.limit.replace(',', '.')),
      period: form.period as BudgetPeriod,
      groupId: contextGroupId,
    }
    if (editingId) {
      updateBudget(editingId, payload)
    } else {
      addBudget(payload)
    }
    cancelEdit()
  }

  // ---- delete + undo
  const budgetUndo = useUndo<Budget>(8000)
  const [confirming, setConfirming] = useState<Budget | null>(null)

  const confirmStrings: ConfirmStrings = {
    title: t('confirm.deleteTitle'),
    message: t('budget.deleteTitle'),
    confirmLabel: t('confirm.delete'),
    cancelLabel: t('confirm.cancel'),
  }

  const memberLabel = isGroupContext
    ? groupMembers(contextGroupId!)
      .map((m) => m.name)
      .join(', ')
    : null

  return (
    <Page title={t('section.budgets')}>
      <div className="stack">
        <div className="panel">
          <h2>{editingId ? t('form.edit') : t('common.budget')}</h2>
          <BudgetContextSelector />
          <form onSubmit={saveBudget} noValidate>
            <div className="form-row">
              <SelectField
                label={t('fld.category')}
                name="categoryId"
                required
                value={form.categoryId}
                error={fieldError('categoryId')}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, categoryId: true }))}
                options={[
                  { value: '', label: '—' },
                  ...selectableCategories.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.type === 'both' ? ' · both' : ''}`,
                  })),
                ]}
              />
              <TextField
                label={t('fld.limit')}
                name="limit"
                required
                inputMode="decimal"
                value={form.limit}
                error={fieldError('limit')}
                onChange={(e) => setForm((p) => ({ ...p, limit: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, limit: true }))}
                placeholder="0,00"
              />
              <SelectField
                label={t('fld.period')}
                name="period"
                required
                value={form.period}
                error={fieldError('period')}
                onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))}
                onBlur={() => setTouched((p) => ({ ...p, period: true }))}
                options={[{ value: 'monthly', label: t('period.monthly') }]}
              />
            </div>
            <div className="form-actions">
              {editingId && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={cancelEdit}
                >
                  {t('form.cancel')}
                </button>
              )}
              <button type="submit" className="btn btn--primary">
                {editingId ? t('form.submit') : t('form.save')}
              </button>
            </div>
          </form>
        </div>

        <div className="stack">
          <div className="budget-list-header">
            <h2>{isGroupContext ? t('budget.groupBudgets') : t('section.budgets')}</h2>
            {isGroupContext && memberLabel && (
              <span className="budget-member-note">
                {t('budget.byMember')}: {memberLabel}
              </span>
            )}
          </div>
          <BudgetDashboard
            rows={rows}
            summary={summary}
            previousSpentByBudgetId={previousSpentByBudgetId}
            isGroup={isGroupContext}
            breakdownLabel={t('budget.byMember')}
            emptyText={isGroupContext ? t('budget.noGroupBudgets') : undefined}
            onEdit={startEdit}
            onDelete={(b) => setConfirming(b)}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        strings={confirmStrings}
        onConfirm={() => {
          if (confirming) {
            remove({ kind: 'budget', item: confirming })
            budgetUndo.push(
              confirming,
              categoryNameFor(confirming.categoryId) ?? confirming.categoryId,
            )
          }
          setConfirming(null)
        }}
        onCancel={() => setConfirming(null)}
      />

      {budgetUndo.snapshots.map((snap, index) => (
        <UndoToast
          key={snap.id}
          entry={snap}
          index={index}
          title={t('undo.title')}
          actionLabel={t('undo.action')}
          dismissLabel={t('undo.dismiss')}
          onUndo={(i) => {
            const s = budgetUndo.snapshots[i]
            if (s) {
              restore({ kind: 'budget', item: s.item })
              budgetUndo.clear(s.id)
            }
          }}
          onDismiss={(i) => {
            const s = budgetUndo.snapshots[i]
            if (s) budgetUndo.clear(s.id)
          }}
        />
      ))}
    </Page>
  )
}