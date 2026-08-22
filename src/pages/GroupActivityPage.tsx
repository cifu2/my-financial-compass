import { useMemo, useState } from 'react'
import { Page } from '../components/Page'
import { SelectField } from '../components/FormField'
import { useAppState } from '../state/AppState'
import {
  groupActivityContext,
  listGroupActivity,
} from '../features/groups/services/groupActivity'
import {
  activityKindOptions,
  activitySentence,
} from '../features/groups/services/activityMessages'
import type { GroupActivityKind } from '../features/groups/types'
import { formatDate } from '../lib/dates'
import { translate, type UIKey } from '../lib/i18n'

/**
 * Group activity screen (HU-0.11): read-only, chronological (descending)
 * audit trail of the group, filterable by member and by action type.
 * Degraded gracefully when the group id is missing or unknown.
 */
export default function GroupActivityPage({ groupId }: { groupId: string }) {
  const { locale } = useAppState()
  const t = (key: UIKey) => translate(locale, key)

  const [memberFilter, setMemberFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const ctx = useMemo(() => (groupId ? groupActivityContext(groupId) : null), [groupId])

  const rows = useMemo(
    () =>
      ctx
        ? listGroupActivity(ctx.id, {
            memberId: memberFilter || undefined,
            action: (actionFilter as GroupActivityKind) || undefined,
          })
        : [],
    [ctx, memberFilter, actionFilter],
  )

  const memberOptions = useMemo(() => {
    if (!ctx) return []
    return ctx.members.map((m) => ({ value: m.userId, label: m.name }))
  }, [ctx])

  if (!groupId || !ctx) {
    return (
      <Page title={t('group.activityPageTitle')}>
        <p className="text-muted" role="status">
          {t('common.empty')}
        </p>
      </Page>
    )
  }

  const canClear = memberFilter !== '' || actionFilter !== ''
  const currency = ctx.currency
  const displayNameFor = (userId: string) => ctx.names.get(userId) ?? userId

  return (
    <Page title={`${ctx.name} — ${t('group.activityPageTitle')}`}>
      <div className="stack">
        {ctx.archived && (
          <p className="notice notice--muted" role="status">
            {t('group.archivedHint')}
          </p>
        )}

        <div className="activity-filters" role="group" aria-label={t('activity.filtersLabel')}>
          <SelectField
            label={t('group.activityMember')}
            name="activityMember"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            options={[
              { value: '', label: t('group.activityAllMembers') },
              ...memberOptions,
            ]}
          />
          <SelectField
            label={t('group.activityAction')}
            name="activityAction"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={[
              { value: '', label: t('group.activityAllActions') },
              ...activityKindOptions(locale),
            ]}
          />
          {canClear && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setMemberFilter('')
                setActionFilter('')
              }}
            >
              {t('group.activityClear')}
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-muted">{t('group.activityEmpty')}</p>
        ) : (
          <ul className="activity-list" aria-live="polite">
            {rows.map((row) => (
              <li key={row.id} className="activity-row">
                <span className="activity-row__date">
                  {formatDate(new Date(row.timestamp), locale)}
                </span>
                <span className="activity-row__text">
                  <strong>{displayNameFor(row.userId)}</strong>{' '}
                  {activitySentence(
                    row,
                    { names: ctx.names, currency },
                    locale,
                    { omitActor: true },
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-note">
          {rows.length} {rows.length === 1 ? t('group.activityEntry') : t('group.activityEntries')}
        </p>
      </div>
    </Page>
  )
}