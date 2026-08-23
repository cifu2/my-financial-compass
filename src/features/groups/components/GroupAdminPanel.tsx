import { useCallback, useEffect, useRef, useState } from 'react'
import type { Locale } from '../../../lib/dates'
import { translate, type UIKey } from '../../../lib/i18n'
import { useAppState } from '../../../state/AppState'
import type { MyGroup } from '../types'
import { groupActivityContext, type ActivityGroupContext } from '../services/groupActivity'
import { loadGroupSnapshot } from '../services/groupStore'
import { roleInGroup } from '../access'
import { listUserGroupsIncludingArchived, restoreGroup } from '../services/groupService'
import { groupActivityHref } from '../../../router'
import { DeleteGroupDialog } from './DeleteGroupDialog'
import '../../../components/layer.css'

/**
 * Group management panel (HU-0.12): lists the user's groups with their role,
 * links to the activity screen, and exposes the double-confirmation
 * archive/delete dialog for groups the user administers. Archived groups are
 * listed separately with a restore action.
 */
export function GroupAdminPanel({
  locale,
  currentUserId,
}: {
  locale: Locale
  currentUserId: string
}) {
  const t = (key: UIKey) => translate(locale, key)
  const { removeGroupData } = useAppState()

  const [active, setActive] = useState<MyGroup[]>([])
  const [archived, setArchived] = useState<MyGroup[]>([])
  const [dialogGroupId, setDialogGroupId] = useState<string | null>(null)
  const [dialogOpenTick, setDialogOpenTick] = useState(0)
  const [dialogCtx, setDialogCtx] = useState<ActivityGroupContext | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const reload = useCallback(() => {
    void listUserGroupsIncludingArchived(currentUserId).then((groups) => {
      setActive(groups.filter((g) => !g.archivedAt))
      setArchived(groups.filter((g) => Boolean(g.archivedAt)))
    })
  }, [currentUserId])

  useEffect(() => {
    reload()
  }, [reload])

  function showToast(message: string) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 6000)
  }

  function openDeleteDialog(group: MyGroup) {
    setDialogOpenTick((t) => t + 1)
    setDialogGroupId(group.id)
    setDialogCtx(groupActivityContext(group.id))
  }

  function handleDone(result: 'archived' | 'deleted') {
    if (result === 'deleted' && dialogGroupId) {
      removeGroupData(dialogGroupId)
      showToast(t('group.delete.deletedToast'))
    } else {
      showToast(t('group.delete.archivedToast'))
    }
    setDialogGroupId(null)
    setDialogCtx(null)
    reload()
  }

  const isAdmin = (group: MyGroup) =>
    roleInGroup(loadGroupSnapshot(), group.id, currentUserId) === 'admin'

  const restore = (group: MyGroup) => {
    void restoreGroup(group.id, currentUserId).then((result) => {
      if (result.ok) {
        reload()
        showToast(t('group.delete.restoredToast'))
      }
    })
  }

  return (
    <div className="stack group-panel">
      {toast && (
        <div className="undo-toast undo-toast--success" role="status" aria-live="polite">
          <span className="undo-toast-text">
            <strong>{toast}</strong>
          </span>
        </div>
      )}

      <h3>{t('group.deletedTitle')}</h3>
      {active.length === 0 ? (
        <p className="text-muted">{t('group.none')}</p>
      ) : (
        <ul className="group-list">
          {active.map((group) => (
            <li key={group.id} className="group-row">
              <span className="group-row__name">
                <strong>{group.name}</strong>
                <small>
                  {t('group.memberCount').replace('{count}', String(group.memberCount))} ·{' '}
                  {t(`group.role.${group.role}` as UIKey)}
                </small>
              </span>
              <span className="group-row__actions">
                <a className="btn btn--secondary btn--sm" href={groupActivityHref(group.id)}>
                  {t('group.viewActivity')}
                </a>
                {isAdmin(group) && (
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => openDeleteDialog(group)}
                  >
                    {t('group.delete')}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>{t('group.archivedTitle')}</h3>
      <p className="text-note">{t('group.archivedHint')}</p>
      {archived.length === 0 ? (
        <p className="text-muted">{t('group.noArchived')}</p>
      ) : (
        <ul className="group-list">
          {archived.map((group) => (
            <li key={group.id} className="group-row">
              <span className="group-row__name">
                <strong>{group.name}</strong>
                <small>
                  {t('group.memberCount').replace('{count}', String(group.memberCount))}
                </small>
              </span>
              <span className="group-row__actions">
                <a className="btn btn--secondary btn--sm" href={groupActivityHref(group.id)}>
                  {t('group.viewActivity')}
                </a>
                {isAdmin(group) && (
                  <>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => restore(group)}
                    >
                      {t('group.restore')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => openDeleteDialog(group)}
                    >
                      {t('group.delete')}
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <DeleteGroupDialog
        key={`${dialogGroupId ?? 'none'}-${dialogOpenTick}`}
        open={dialogGroupId !== null}
        groupId={dialogGroupId ?? ''}
        ctx={dialogCtx}
        actorUserId={currentUserId}
        locale={locale}
        onClose={() => {
          setDialogGroupId(null)
          setDialogCtx(null)
        }}
        onDone={handleDone}
      />
    </div>
  )
}