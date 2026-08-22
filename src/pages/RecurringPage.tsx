import { useMemo, useRef, useState, useEffect } from 'react'
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
import {
  upcomingOccurrences,
  recurringsInContext,
  type UpcomingOccurrence,
  type RecurringContext,
} from '../features/recurring/services/recurrenceService'
import { RecurringForm, type RecurringFormData, type RecurringGroupOption } from '../features/recurring/components/RecurringForm'
import { RecurringList, type RecurringListStrings } from '../features/recurring/components/RecurringList'
import { UpcomingList, type UpcomingStrings } from '../features/recurring/components/UpcomingList'
import { OccurrenceEditDialog } from '../features/recurring/components/OccurrenceEditDialog'
import { translate, type UIKey } from '../lib/i18n'
import { formatDate, todayIso } from '../lib/dates'
import { readSessionUser } from '../features/auth/services/authService'
import { listUserGroups } from '../features/groups/services/groupService'
import { groupAccessFor } from '../features/groups/access'
import { can } from '../features/groups/permissions'
import '../features/recurring/recurring.css'

type EditMode =
  | { kind: 'create' }
  | { kind: 'edit'; recurring: RecurringTransaction }

type RecurringPatch = Pick<
  RecurringTransaction,
  | 'template'
  | 'frequency'
  | 'startDate'
  | 'endDate'
  | 'executionDay'
  | 'groupId'
>

const CONTEXT_ALL = 'all'
const CONTEXT_PERSONAL = 'personal'

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

  const currentUserId = readSessionUser()?.id ?? ''

  // Groups the member may attach rules to (HU-0.8). Only groups where the
  // member keeps `data.edit` can own shared recurring rules.
  const [userGroups, setUserGroups] = useState<RecurringGroupOption[]>([])

  useEffect(() => {
    if (!currentUserId) return
    let cancelled = false
    void listUserGroups(currentUserId).then((groups) => {
      if (cancelled) return
      setUserGroups(
        groups
          .filter((g) => can(g.role, 'data.edit'))
          .map((g) => ({ id: g.id, name: g.name })),
      )
    })
    return () => {
      cancelled = true
    }
  }, [currentUserId])

  // Which context the list shows. Defaults to "all" so members always see
  // their personal rules and the shared group rules they may access.
  const [listContext, setListContext] = useState<string>(CONTEXT_ALL)

  const visibleRecurrings = useMemo(() => {
    const context: RecurringContext =
      listContext === CONTEXT_PERSONAL
        ? { kind: 'personal' }
        : listContext === CONTEXT_ALL
          ? { kind: 'all' }
          : { kind: 'group', groupId: listContext }
    return recurringsInContext(store.recurrings, context)
  }, [store.recurrings, listContext])

  const categoryNameFor = useMemo(() => {
    const map = new Map(store.categories.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? null
  }, [store.categories])

  const upcoming = useMemo(
    () => upcomingOccurrences(visibleRecurrings, today, 6),
    [visibleRecurrings, today],
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
      groupId: r.groupId,
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
      groupId: data.groupId,
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
      addRecurring({
        ...patch,
        isActive: true,
        nextExecution: '',
        createdBy: data.groupId ? currentUserId : undefined,
      })
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
      groupId: item.groupId,
      createdBy: item.createdBy,
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

  // HU-0.10: shared rules may only be managed while the member keeps edit
  // rights in the rule's group (data.edit); locked rules remain visible but
  // lose their management actions. Personal rules are always manageable.
  const canManageRule = useMemo(() => {
    return (r: RecurringTransaction): boolean => {
      if (r.groupId === undefined) return true
      const access = groupAccessFor(r.groupId, currentUserId || undefined)
      return access.canEditRecord(r.createdBy)
    }
  }, [currentUserId])

  return (
    <Page title={t('section.recurring')}>
      <div className="stack">
        <div className="panel">
          <h2>{mode.kind === 'edit' ? t('form.edit') : t('recurring.new')}</h2>
          <RecurringForm
            key={formKey}
            locale={locale}
            categories={store.categories}
            groups={userGroups}
            initial={mode.kind === 'edit' ? toFormData(mode.recurring) : undefined}
            saveLabel={t('form.save')}
            cancelLabel={t('form.cancel')}
            onSave={onFormSave}
            onCancel={mode.kind === 'edit' ? resetForm : undefined}
          />
        </div>

        <div className="panel">
          <div className="recurring-list-header">
            <h2>{t('recurring.type')}</h2>
            {userGroups.length > 0 && (
              <label className="recurring-context-filter">
                <span className="visually-hidden">{t('recurring.contextFilterLabel')}</span>
                <select
                  className="input"
                  value={listContext}
                  onChange={(e) => setListContext(e.target.value)}
                >
                  <option value={CONTEXT_ALL}>{t('recurring.contextAll')}</option>
                  <option value={CONTEXT_PERSONAL}>{t('recurring.contextPersonal')}</option>
                  {userGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <RecurringList
            recurrings={visibleRecurrings}
            strings={listStrings(t)}
            locale={locale}
            categoryNameFor={categoryNameFor}
            onEdit={startEdit}
            onToggleActive={onToggleActive}
            onDelete={(r) => setPendingDelete(r)}
            canManage={canManageRule}
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