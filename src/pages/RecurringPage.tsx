import { useMemo, useRef, useState } from 'react'
import { Page } from '../components/Page'
import { ConfirmDialog, type ConfirmStrings } from '../components/ConfirmDialog'
import { UndoToast } from '../components/UndoToast'
import { useUndo } from '../hooks/useUndo'
import { useAppState } from '../state/AppState'
import type {
  RecurringTransaction,
  OccurrenceOverride,
  OccurrenceTemplate,
} from '../features/recurring/types'
import { upcomingOccurrences, type UpcomingOccurrence } from '../features/recurring/services/recurrenceService'
import { RecurringForm, type RecurringFormData } from '../features/recurring/components/RecurringForm'
import { RecurringList, type RecurringListStrings } from '../features/recurring/components/RecurringList'
import { UpcomingList, type UpcomingStrings } from '../features/recurring/components/UpcomingList'
import { OccurrenceEditDialog } from '../features/recurring/components/OccurrenceEditDialog'
import { translate, type UIKey } from '../lib/i18n'
import { formatDate, todayIso } from '../lib/dates'
import '../features/recurring/recurring.css'

type EditMode =
  | { kind: 'create' }
  | { kind: 'edit'; recurring: RecurringTransaction }

type RecurringPatch = Pick<
  RecurringTransaction,
  'template' | 'frequency' | 'startDate' | 'endDate' | 'executionDay'
>

function listStrings(t: (key: UIKey) => string): RecurringListStrings {
  return {
    conceptHeader: t('fld.description'),
    frequencyHeader: t('recurring.frequencyLabel'),
    executionHeader: t('fld.executionDay'),
    nextHeader: t('recurring.nextRun'),
    statusHeader: t('common.status'),
    actionsHeader: t('common.actions'),
    edit: t('recurring.edit'),
    pause: t('common.pause'),
    resume: t('common.resume'),
    delete: t('common.delete'),
    active: t('recurring.active'),
    paused: t('recurring.paused'),
    none: t('recurring.none'),
  }
}

function upcomingStrings(t: (key: UIKey) => string): UpcomingStrings {
  return {
    heading: t('recurring.upcoming'),
    empty: t('recurring.upcomingNone'),
    dateHeader: t('fld.date'),
    descriptionHeader: t('fld.description'),
    amountHeader: t('fld.amount'),
    edit: t('recurring.edit'),
    overridden: t('recurring.overridden'),
  }
}

export default function RecurringPage() {
  const {
    locale,
    store,
    addRecurring,
    updateRecurring,
    removeRecurring,
    setRecurringActive,
    setOccurrenceOverride,
  } = useAppState()
  const t = (key: UIKey) => translate(locale, key)

  const today = todayIso()

  const categoryNameFor = useMemo(() => {
    const map = new Map(store.categories.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? null
  }, [store.categories])

  const upcoming = useMemo(
    () => upcomingOccurrences(store.recurrings, today, 6),
    [store.recurrings, today],
  )

  const recUndo = useUndo<RecurringTransaction>(8000)
  const [mode, setMode] = useState<EditMode>({ kind: 'create' })
  const [pendingBulk, setPendingBulk] = useState<{
    id: string
    data: RecurringPatch
  } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<RecurringTransaction | null>(
    null,
  )
  const [occurrence, setOccurrence] = useState<UpcomingOccurrence | null>(null)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  function confirmToast(title: string) {
    setToast(title)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }

  function toFormData(r: RecurringTransaction): RecurringFormData {
    return {
      concept: r.template.concept,
      amount: r.template.amount,
      type: r.template.type,
      categoryId: r.template.categoryId,
      frequency: r.frequency,
      startDate: r.startDate,
      endDate: r.endDate,
      executionDay: r.executionDay,
    }
  }

  function startEdit(r: RecurringTransaction) {
    setMode({ kind: 'edit', recurring: r })
  }

  function resetForm() {
    setMode({ kind: 'create' })
  }

  function onFormSave(data: RecurringFormData) {
    const patch: RecurringPatch = {
      template: {
        concept: data.concept,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
      },
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
      executionDay: data.executionDay,
    }
    if (mode.kind === 'edit') {
      const id = mode.recurring.id
      const hasGenerated = store.transactions.some((tx) => tx.recurringId === id)
      if (hasGenerated) {
        setPendingBulk({ id, data: patch })
        resetForm()
        return
      }
      updateRecurring(id, patch)
      confirmToast(t('toast.recurringSaved'))
    } else {
      addRecurring({ ...patch, isActive: true, nextExecution: '' })
      confirmToast(t('toast.recurringSaved'))
    }
    resetForm()
  }

  function onBulkConfirm() {
    if (!pendingBulk) return
    updateRecurring(pendingBulk.id, pendingBulk.data)
    confirmToast(t('toast.recurringSaved'))
    setPendingBulk(null)
  }

  function onToggleActive(r: RecurringTransaction) {
    setRecurringActive(r.id, !r.isActive)
    confirmToast(r.isActive ? t('recurring.pausedToast') : t('recurring.resumedToast'))
  }

  function onDeleteConfirmed() {
    if (!pendingDelete) return
    removeRecurring(pendingDelete.id)
    recUndo.push(pendingDelete, pendingDelete.template.concept)
    setPendingDelete(null)
  }

  function restoreRecurring(item: RecurringTransaction) {
    addRecurring({
      template: item.template,
      frequency: item.frequency,
      startDate: item.startDate,
      endDate: item.endDate,
      executionDay: item.executionDay,
      isActive: item.isActive,
      nextExecution: '',
    })
  }

  function onOccurrenceSave(override: { template: OccurrenceTemplate; date: string }) {
    if (!occurrence) return
    const value: OccurrenceOverride = {
      template: override.template,
      date: override.date,
    }
    setOccurrenceOverride(occurrence.recurringId, occurrence.scheduledDate, value)
    confirmToast(t('recurring.occurrenceSaved'))
  }

  const bulkStrings: ConfirmStrings = {
    title: t('recurring.editAllTitle'),
    message: t('recurring.editAllMessage'),
    confirmLabel: t('form.submit'),
    cancelLabel: t('confirm.cancel'),
  }
  const deleteStrings: ConfirmStrings = {
    title: t('recurring.deleteTitle'),
    message: t('recurring.deleteMessage'),
    confirmLabel: t('confirm.delete'),
    cancelLabel: t('confirm.cancel'),
  }

  const formKey = mode.kind === 'edit' ? `edit:${mode.recurring.id}` : 'create'

  return (
    <Page title={t('section.recurring')}>
      <div className="stack">
        <div className="panel">
          <h2>{mode.kind === 'edit' ? t('form.edit') : t('recurring.new')}</h2>
          <RecurringForm
            key={formKey}
            locale={locale}
            categories={store.categories}
            initial={mode.kind === 'edit' ? toFormData(mode.recurring) : undefined}
            saveLabel={t('form.save')}
            cancelLabel={t('form.cancel')}
            onSave={onFormSave}
            onCancel={mode.kind === 'edit' ? resetForm : undefined}
          />
        </div>

        <div className="panel">
          <h2>{t('recurring.type')}</h2>
          <RecurringList
            recurrings={store.recurrings}
            strings={listStrings(t)}
            locale={locale}
            categoryNameFor={categoryNameFor}
            onEdit={startEdit}
            onToggleActive={onToggleActive}
            onDelete={(r) => setPendingDelete(r)}
          />
        </div>

        <div className="panel">
          <h2>{t('recurring.upcoming')}</h2>
          <UpcomingList
            rows={upcoming}
            strings={upcomingStrings(t)}
            locale={locale}
            categoryNameFor={categoryNameFor}
            onEdit={setOccurrence}
          />
        </div>
      </div>

      <ConfirmDialog
        open={pendingBulk !== null}
        strings={bulkStrings}
        onConfirm={onBulkConfirm}
        onCancel={() => setPendingBulk(null)}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        strings={deleteStrings}
        onConfirm={onDeleteConfirmed}
        onCancel={() => setPendingDelete(null)}
      />

      {occurrence && (
        <OccurrenceEditDialog
          locale={locale}
          categories={store.categories}
          title={t('recurring.editOccurrenceTitle').replace(
            '{date}',
            formatDate(occurrence.date, locale),
          )}
          hint={t('recurring.occurrenceEditHint')}
          scheduledDate={occurrence.date}
          template={occurrence.template}
          confirmLabel={t('form.save')}
          cancelLabel={t('confirm.cancel')}
          onSave={onOccurrenceSave}
          onCancel={() => setOccurrence(null)}
        />
      )}

      {toast && (
        <div className="undo-toast undo-toast--success" role="status" aria-live="polite">
          <span className="undo-toast-text">
            <strong>{toast}</strong>
          </span>
          <span className="undo-toast-buttons">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setToast(null)}
            >
              {t('undo.dismiss')}
            </button>
          </span>
        </div>
      )}

      {recUndo.snapshots.map((snap, index) => (
        <UndoToast
          key={snap.id}
          entry={snap}
          index={index}
          title={t('undo.title')}
          actionLabel={t('undo.action')}
          dismissLabel={t('undo.dismiss')}
          onUndo={(i) => {
            const s = recUndo.snapshots[i]
            if (s) {
              restoreRecurring(s.item)
              recUndo.clear(s.id)
            }
          }}
          onDismiss={(i) => {
            const s = recUndo.snapshots[i]
            if (s) recUndo.clear(s.id)
          }}
        />
      ))}
    </Page>
  )
}