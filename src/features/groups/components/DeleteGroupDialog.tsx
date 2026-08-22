import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Locale } from '../../../lib/dates'
import { translate, type UIKey } from '../../../lib/i18n'
import type { ActivityGroupContext } from '../services/groupActivity'
import { archiveGroup, deleteGroup } from '../services/groupService'

/**
 * Group deletion dialog (HU-0.12) with explicit double confirmation.
 *
 * - Step 1 explains what happens to the shared data and asks the mode:
 *   **archive** (keep the ledger read-only) or **delete** (purge it), plus an
 *   opt-out "notify members" step that is ON by default.
 * - Step 2 is the hard confirmation: the user must type the group name before
 *   the destructive action becomes available.
 *
 * Both actions post a `group_delete_notice` activity entry for every member
 * (the "notify before deleting" acceptance) before making the change.
 */
export interface DeleteGroupDialogProps {
  open: boolean
  groupId: string
  ctx: ActivityGroupContext | null
  actorUserId: string
  locale: Locale
  onClose: () => void
  onDone: (result: 'archived' | 'deleted', groupName: string) => void
}

type Mode = 'archive' | 'delete'

export function DeleteGroupDialog({
  open,
  groupId,
  ctx,
  actorUserId,
  locale,
  onClose,
  onDone,
}: DeleteGroupDialogProps) {
  const t = (key: UIKey) => translate(locale, key)
  const [step, setStep] = useState<1 | 2>(1)
  const [mode, setMode] = useState<Mode>('archive')
  const [notify, setNotify] = useState(true)
  const [typedName, setTypedName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const groupName = ctx?.name ?? ''

  const firstFocus = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    firstFocus.current?.focus()
    return () => {
      previousFocus.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Tab') {
        const focusables = Array.from(
          document.querySelectorAll<HTMLElement>(
            '#group-delete-dialog button, #group-delete-dialog input[type="text"], #group-delete-dialog input[type="radio"]:not(:disabled), #group-delete-dialog input[type="checkbox"]:not(:disabled)',
          ),
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const memberCount = ctx?.members.length ?? 0
  const nameMatches = typedName.trim() === groupName

  function goContinuous(e: FormEvent) {
    e.preventDefault()
    if (ctx === null) return
    setStep(2)
  }

  function submitDecision(e: FormEvent) {
    e.preventDefault()
    if (ctx === null || !nameMatches || submitting) return
    setSubmitting(true)
    const notifyMembers = notify
    if (mode === 'archive') {
      void archiveGroup(groupId, actorUserId, { notify: notifyMembers }).then((result) => {
        setSubmitting(false)
        if (result.ok) {
          onClose()
          onDone('archived', ctx.name)
        }
      })
    } else {
      void deleteGroup(groupId, actorUserId).then((result) => {
        setSubmitting(false)
        if (result.ok) {
          onClose()
          onDone('deleted', ctx.name)
        }
      })
    }
  }

  const memberWord = memberCount === 1 ? t('group.delete.memberWordOne') : t('group.delete.memberWord')

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        id="group-delete-dialog"
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="group-delete-title"
        aria-describedby="group-delete-message"
      >
        <h2 id="group-delete-title" className="confirm-dialog-title">
          {t('group.delete.title')}
        </h2>
        <p id="group-delete-message" className="confirm-dialog-message">
          {t('group.delete.message').replace('{group}', groupName)}
        </p>

        {step === 1 ? (
          <form onSubmit={goContinuous} noValidate>
            <fieldset className="group-delete__fieldset">
              <legend>{t('group.delete.modeLabel')}</legend>
              <label className="group-delete__option">
                <input
                  type="radio"
                  name="groupMode"
                  value="archive"
                  checked={mode === 'archive'}
                  onChange={() => setMode('archive')}
                />
                <span>
                  <strong>{t('group.delete.modeArchive')}</strong>
                  <small>{t('group.delete.modeArchiveHint')}</small>
                </span>
              </label>
              <label className="group-delete__option">
                <input
                  type="radio"
                  name="groupMode"
                  value="delete"
                  checked={mode === 'delete'}
                  onChange={() => setMode('delete')}
                />
                <span>
                  <strong>{t('group.delete.modeDelete')}</strong>
                  <small>{t('group.delete.modeDeleteHint')}</small>
                </span>
              </label>
            </fieldset>

            <label className="group-delete__notify">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
              <span>
                <strong>{t('group.delete.notifyLabel')}</strong>
                <small>
                  {t('group.delete.notifyHint')
                    .replace('{count}', String(memberCount))
                    .replace('{memberWord}', memberWord)}
                </small>
              </span>
            </label>

            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                {t('group.delete.cancel')}
              </button>
              <button type="submit" className="btn btn--primary" ref={firstFocus}>
                {t('form.continue')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitDecision} noValidate>
            <p className="text-note">{t('group.delete.step2')}</p>
            <p className="text-muted">{t('group.delete.typePrompt').replace('{name}', groupName)}</p>
            <div className="form-row">
              <label className="form-field">
                <span className="form-field__label">
                  {t('group.activityPageTitle')} — {t('fld.name')}
                </span>
                <input
                  className="form-field__input"
                  type="text"
                  autoComplete="off"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  aria-invalid={typedName.length > 0 && !nameMatches}
                />
              </label>
            </div>
            {typedName.length > 0 && !nameMatches && (
              <p className="form-field__error" role="alert">
                {t('group.delete.typedMismatch')}
              </p>
            )}

            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn--secondary" onClick={() => setStep(1)}>
                {t('form.back')}
              </button>
              <button
                type="submit"
                className={mode === 'delete' ? 'btn btn--danger' : 'btn btn--primary'}
                disabled={!nameMatches || submitting}
              >
                {mode === 'delete'
                  ? t('group.delete.confirmDelete')
                  : t('group.delete.confirmArchive')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}