import type { Locale } from '../../../lib/dates'
import { formatMoney } from '../../../lib/money'
import { translate } from '../../../lib/i18n'
import type { GroupActivity } from '../types'
import { GROUP_ACTIVITY_KINDS } from '../types'

/**
 * Human rendering of the group activity trail (HU-0.11).
 *
 * Each activity row is turned into an i18n sentence such as
 * "Luis añadió Supermercado 82 €" or "Ana liquidó 45 € a José". Member names
 * are resolved from the auth store (falling back to the raw id); monetary
 * values use the group currency passed by the caller.
 */

export interface ActivityPersonas {
  /** Map memberId → display name. */
  names: Map<string, string>
  /** Currency used to format amounts in the sentence. */
  currency: string
}

type Details = Record<string, string | number | boolean | undefined>

function str(details: Details, key: string): string {
  const value = details[key]
  return typeof value === 'string' ? value : ''
}

function num(details: Details, key: string): number {
  const value = details[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Human label used by the action-type filter select. */
export function activityKindLabel(action: GroupActivity['action'], locale: Locale): string {
  return translate(locale, `activity.kind.${action}` as Parameters<typeof translate>[1])
}

/** All action kinds with their display label, for filter options. */
export function activityKindOptions(locale: Locale): Array<{ value: string; label: string }> {
  return GROUP_ACTIVITY_KINDS.map((kind) => ({
    value: kind,
    label: activityKindLabel(kind, locale),
  }))
}

/**
 * Full human sentence for an activity row. `t` is bound to the current locale
 * via `translate`; the caller passes the group's members/currency so one
 * function builds every sentence. Set `omitActor` to render the action part
 * without the "who" prefix (useful when the actor name is shown separately).
 */
export function activitySentence(
  entry: GroupActivity,
  people: ActivityPersonas,
  locale: Locale,
  options: { omitActor?: boolean } = {},
): string {
  const raw = rawSentence(entry, people, locale)
  if (!options.omitActor) return raw
  const actorName = people.names.get(entry.userId) ?? entry.userId
  const cleaned = raw
    .replace(actorName, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return cleaned.replace(/^,/, '').trim()
}

function rawSentence(
  entry: GroupActivity,
  people: ActivityPersonas,
  locale: Locale,
): string {
  const t = (key: string): string => translate(locale, key as Parameters<typeof translate>[1])
  const actor = people.names.get(entry.userId) ?? entry.userId
  const amount = () => formatMoney(num(entry.details, 'amount'), locale, people.currency)
  const concept = str(entry.details, 'concept')
  const target = str(entry.details, 'targetUserId')

  switch (entry.action) {
    case 'group_created':
      return t('activity.msg.groupCreated').replace('{actor}', actor)
    case 'group_updated':
      return t('activity.msg.groupUpdated').replace('{actor}', actor)
    case 'group_archived':
      return t('activity.msg.groupArchived').replace('{actor}', actor)
    case 'group_restored':
      return t('activity.msg.groupRestored').replace('{actor}', actor)
    case 'group_deleted':
      return t('activity.msg.groupDeleted').replace('{actor}', actor)
    case 'group_delete_notice':
      return t('activity.msg.groupDeleteNotice')
        .replace('{actor}', actor)
        .replace('{target}', people.names.get(str(entry.details, 'recipientId')) ?? target)
    case 'member_added':
      return t('activity.msg.memberAdded')
        .replace('{actor}', actor)
        .replace('{target}', people.names.get(target) ?? target)
    case 'member_removed':
      return t('activity.msg.memberRemoved')
        .replace('{actor}', actor)
        .replace('{target}', people.names.get(target) ?? target)
    case 'role_changed':
      return t('activity.msg.roleChanged')
        .replace('{actor}', actor)
        .replace('{target}', people.names.get(target) ?? target)
        .replace('{role}', str(entry.details, 'role'))
    case 'invitation_sent':
      return t('activity.msg.invitationSent')
        .replace('{actor}', actor)
        .replace('{email}', str(entry.details, 'email'))
    case 'transaction_added':
      return t('activity.msg.txAdded')
        .replace('{actor}', actor)
        .replace('{concept}', concept || t('group.common.transaction'))
        .replace('{amount}', amount())
    case 'transaction_removed':
      return t('activity.msg.txRemoved')
        .replace('{actor}', actor)
        .replace('{concept}', concept || t('group.common.transaction'))
        .replace('{amount}', amount())
    case 'split_set':
      return t('activity.msg.splitSet')
        .replace('{actor}', actor)
        .replace('{concept}', concept || t('group.common.transaction'))
        .replace('{count}', String(num(entry.details, 'count')))
    case 'settlement_added':
      return t('activity.msg.settlementAdded')
        .replace('{actor}', actor)
        .replace('{amount}', amount())
        .replace(
          '{target}',
          people.names.get(str(entry.details, 'recipientId')) ??
            str(entry.details, 'toUserId'),
        )
    case 'settlement_removed':
      return t('activity.msg.settlementRemoved')
        .replace('{actor}', actor)
        .replace('{amount}', amount())
    case 'recurring_added':
      return t('activity.msg.recurringAdded')
        .replace('{actor}', actor)
        .replace('{concept}', concept)
        .replace('{amount}', amount())
    case 'recurring_removed':
      return t('activity.msg.recurringRemoved')
        .replace('{actor}', actor)
        .replace('{concept}', concept)
    case 'investment_added':
      return t('activity.msg.investmentAdded')
        .replace('{actor}', actor)
        .replace('{name}', str(entry.details, 'name'))
    case 'investment_updated':
      return t('activity.msg.investmentUpdated')
        .replace('{actor}', actor)
        .replace('{name}', str(entry.details, 'name'))
    case 'investment_removed':
      return t('activity.msg.investmentRemoved')
        .replace('{actor}', actor)
        .replace('{name}', str(entry.details, 'name'))
    case 'budget_added':
      return t('activity.msg.budgetAdded')
        .replace('{actor}', actor)
        .replace('{category}', str(entry.details, 'category'))
        .replace('{limit}', amount())
    case 'budget_removed':
      return t('activity.msg.budgetRemoved')
        .replace('{actor}', actor)
        .replace('{category}', str(entry.details, 'category'))
    default:
      return t('group.activity.genericEvent').replace('{actor}', actor)
  }
}