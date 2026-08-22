import type {
  OccurrenceTemplate,
  RecurrenceFrequency,
  RecurringTransaction,
} from '../types'
import { MONTHLY_FREQUENCIES } from '../types'
import { dueDates, nextExecution, scheduleFor } from './recurrenceEngine'
import type { GroupSnapshot } from '../../groups/types'
import { can } from '../../groups/permissions'

/** Minimal shape of a stored transaction needed for deduplication. */
export interface ExistingTransaction {
  date: string
  recurringId?: string
}

/** A recurring occurrence materialized as a real transaction. */
export interface GeneratedTransaction extends OccurrenceTemplate {
  date: string
  isRecurring: true
  recurringId: string
  /** Group context carried over from the rule (HU-0.8). */
  groupId?: string
}

/** Config used by the scheduling engine for one recurrence. */
export function scheduleConfigOf(r: RecurringTransaction) {
  return {
    startDate: r.startDate,
    endDate: r.endDate,
    frequency: r.frequency,
    executionDay: r.executionDay,
  }
}

export interface MaterializeResult {
  generated: GeneratedTransaction[]
  /** Recurrence id -> recomputed next execution date after materialization. */
  nextExecutions: Record<string, string>
}

export interface MaterializeOptions {
  /** Cap on generated transactions per run (default 60). */
  maxCount?: number
  /**
   * Optional permission guard (HU-0.8). When provided, a rule whose guard
   * returns `false` is skipped (no transactions are generated for it) and
   * keeps its current `nextExecution`. Personal rules are typically allowed
   * unconditionally; group rules honor the creator's group role.
   */
  canGenerate?: (rule: RecurringTransaction) => boolean
}

/**
 * Generates one transaction per scheduled occurrence that has already come due
 * (`<= today`) and is not already represented in the ledger, honoring one-off
 * overrides for a single occurrence. Idempotent: runs can be replayed safely.
 *
 * Generated transactions inherit the rule's group context (`groupId`), so
 * group-shared rules materialize directly into the group's ledger (HU-0.8).
 */
export function materializeDue(
  recurrings: readonly RecurringTransaction[],
  existing: readonly ExistingTransaction[],
  today: string,
  options: MaterializeOptions = {},
): MaterializeResult {
  const { maxCount = 60, canGenerate } = options
  const generated: GeneratedTransaction[] = []
  const nextExecutions: Record<string, string> = {}
  let generatedCount = 0

  for (const r of recurrings) {
    const cfg = scheduleConfigOf(r)
    if (!r.isActive) {
      nextExecutions[r.id] = r.nextExecution
      continue
    }

    // A permission guard can veto generation entirely for this rule.
    if (canGenerate && !canGenerate(r)) {
      nextExecutions[r.id] = r.nextExecution
      continue
    }

    const posted = new Set<string>()
    for (const tx of existing) {
      if (tx.recurringId === r.id) posted.add(tx.date)
    }

    for (const scheduledDate of dueDates(cfg, today)) {
      if (generatedCount >= maxCount) break
      const override = r.exceptions?.[scheduledDate]
      const template = override?.template ?? r.template
      const date = override?.date ?? scheduledDate
      if (posted.has(date)) continue
      posted.add(date)
      generated.push({
        ...template,
        date,
        isRecurring: true,
        recurringId: r.id,
        groupId: r.groupId,
      })
      generatedCount += 1
    }

    nextExecutions[r.id] = nextExecution(cfg, today)
  }

  return { generated, nextExecutions }
}

/** Upcoming occurrences for the list, honoring one-off overrides. */
export interface UpcomingOccurrence {
  recurringId: string
  /** Date the transaction will actually be posted. */
  date: string
  /** The canonical schedule date (before any single-occurrence override). */
  scheduledDate: string
  template: OccurrenceTemplate
  hasOverride: boolean
  /** Group context of the source rule (HU-0.8). */
  groupId?: string
}

export function upcomingOccurrences(
  recurrings: readonly RecurringTransaction[],
  today: string,
  perRecurrence = 6,
): UpcomingOccurrence[] {
  const items: UpcomingOccurrence[] = []
  for (const r of recurrings) {
    const dates = scheduleFor(r, today, perRecurrence)
    for (const scheduledDate of dates) {
      const override = r.exceptions?.[scheduledDate]
      items.push({
        recurringId: r.id,
        scheduledDate,
        date: override?.date ?? scheduledDate,
        template: override?.template ?? r.template,
        hasOverride: Boolean(override),
        groupId: r.groupId,
      })
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date))
}

// ---------------------------------------------------------------------------
// Group context (HU-0.8)
// ---------------------------------------------------------------------------

/**
 * Context selector for the recurring rules list. `personal` shows only rules
 * without a group; a `group` context shows one group; `all` (default) shows
 * every rule the current member may see.
 */
export type RecurringContext =
  | { kind: 'all' }
  | { kind: 'personal' }
  | { kind: 'group'; groupId: string }

/** Whether a rule belongs to the given listing context. */
export function ruleInContext(
  rule: RecurringTransaction,
  context: RecurringContext,
): boolean {
  switch (context.kind) {
    case 'all':
      return true
    case 'personal':
      return rule.groupId === undefined
    case 'group':
      return rule.groupId === context.groupId
  }
}

/** Rules kept by the given list context (see {@link RecurringContext}). */
export function recurringsInContext(
  recurrings: readonly RecurringTransaction[],
  context: RecurringContext,
): RecurringTransaction[] {
  return recurrings.filter((r) => ruleInContext(r, context))
}

/**
 * Generation guard for a single rule (HU-0.8): group-shared rules only
 * generate while their creator still belongs to the group with `data.edit`
 * capability (admin/member). Read-only members and revoked memberships stop
 * the rule from materializing new transactions. Personal rules always run.
 */
export function ruleCanGenerate(
  rule: RecurringTransaction,
  snapshot: GroupSnapshot,
  currentUserId: string,
): boolean {
  if (rule.groupId === undefined) return true
  const creatorId = rule.createdBy ?? currentUserId
  const member = snapshot.members.find(
    (m) => m.groupId === rule.groupId && m.userId === creatorId,
  )
  return member !== undefined && can(member.role, 'data.edit')
}

/**
 * Convenience builder: returns the {@link materializeDue} `canGenerate`
 * guard closed over a group snapshot and the current user.
 */
export function generationGuardFor(
  snapshot: GroupSnapshot,
  currentUserId: string,
): (rule: RecurringTransaction) => boolean {
  return (rule) => ruleCanGenerate(rule, snapshot, currentUserId)
}

/** Number of month-based frequencies for select rendering (0 for weekly/biweekly). */
export function isMonthBased(frequency: RecurrenceFrequency): boolean {
  return MONTHLY_FREQUENCIES.has(frequency)
}