import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField, SelectField } from '../../../components/FormField'
import { CategoryPicker } from '../../categories/components/CategoryPicker'
import { categoriesForType } from '../../categories/services/categoryService'
import type { Category } from '../../categories/types'
import type { RecurrenceFrequency } from '../types'
import { FREQUENCY_META } from '../types'
import {
  required,
  maxLength,
  mustBeNumber,
  greaterThan,
  requiredSelect,
  isValidDate,
  validateField,
  type Validator,
} from '../../../lib/validation'
import { formatDate, parseDate, toIsoDate, todayIso, type Locale } from '../../../lib/dates'
import { translate, type UIKey } from '../../../lib/i18n'
import { isMonthBased } from '../services/recurrenceService'
import { nextExecution } from '../services/recurrenceEngine'

export interface RecurringFormData {
  concept: string
  amount: number
  type: 'income' | 'expense'
  categoryId: string
  frequency: RecurrenceFrequency
  startDate: string
  endDate?: string
  executionDay?: number
  /** Group context of the rule; undefined means a personal rule (HU-0.8). */
  groupId?: string
}

/** A group the signed-in member may attach a rule to (HU-0.8). */
export interface RecurringGroupOption {
  id: string
  name: string
}

interface FormState {
  concept: string
  amount: string
  type: string
  categoryId: string
  frequency: string
  startDate: string
  endDate: string
  executionDay: string
  groupId: string
}

const CONCEPT: Validator[] = [required(), maxLength(80)]
const AMOUNT: Validator[] = [required(), mustBeNumber(), greaterThan(0)]
const TYPE: Validator[] = [requiredSelect()]
const CATEGORY: Validator[] = [requiredSelect()]
const START_DATE: Validator[] = [required(), isValidDate()]
const END_DATE: Validator[] = [isValidDate()]
const FREQUENCY: Validator[] = [requiredSelect()]
const EXECUTION_DAY: Validator[] = [requiredSelect()]

function VALIDATORS_FOR(
  key: keyof FormState,
  monthBased: boolean,
): Validator[] | null {
  switch (key) {
    case 'concept':
      return CONCEPT
    case 'amount':
      return AMOUNT
    case 'type':
      return TYPE
    case 'categoryId':
      return CATEGORY
    case 'frequency':
      return FREQUENCY
    case 'startDate':
      return START_DATE
    case 'endDate':
      return END_DATE
    case 'executionDay':
      return monthBased ? EXECUTION_DAY : null
    case 'groupId':
      return null
  }
}

function executionDayValue(v: number | undefined): string {
  if (v === undefined) return ''
  return v === 0 ? 'last' : String(v)
}

function parseExecutionDay(value: string): number | undefined {
  if (value === '') return undefined
  if (value === 'last') return 0
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function freqLabel(locale: Locale, frequency: RecurrenceFrequency): string {
  return translate(locale, `freq.${frequency}` as UIKey)
}

/**
 * Recurring configuration panel. Used for creation and for editing the
 * recurrence settings (all future occurrences); the parent owns scope
 * confirmations. Displays a live preview of the next execution while the
 * form stays valid.
 */
export function RecurringForm({
  locale,
  categories,
  initial,
  saveLabel,
  cancelLabel,
  onSave,
  onCancel,
  groups,
}: {
  locale: Locale
  categories: readonly Category[]
  initial?: RecurringFormData
  saveLabel: string
  cancelLabel: string
  onSave: (data: RecurringFormData) => void
  onCancel?: () => void
  /** Groups the member can attach the rule to; absent => personal only. */
  groups?: readonly RecurringGroupOption[]
}) {
  const t = (key: UIKey) => translate(locale, key)

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          concept: initial.concept,
          amount: initial.amount.toFixed(2).replace('.', ','),
          type: initial.type,
          categoryId: initial.categoryId,
          frequency: initial.frequency,
          startDate: formatDate(initial.startDate, locale),
          endDate: initial.endDate ? formatDate(initial.endDate, locale) : '',
          executionDay: executionDayValue(initial.executionDay),
          groupId: initial.groupId ?? '',
        }
      : {
          concept: '',
          amount: '',
          type: '',
          categoryId: '',
          frequency: '',
          startDate: formatDate(todayIso(), locale),
          endDate: '',
          executionDay: '',
          groupId: '',
        },
  )
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [attempted, setAttempted] = useState(false)

  const monthBased = isMonthBased(form.frequency as RecurrenceFrequency)

  function setField(key: keyof FormState, value: string) {
    if (key === 'frequency' && isMonthBased(value as RecurrenceFrequency)) {
      const startDay = parseDate(form.startDate)?.getUTCDate()
      setForm((prev) => ({
        ...prev,
        frequency: value,
        executionDay:
          prev.executionDay !== ''
            ? prev.executionDay
            : executionDayValue(startDay),
      }))
      return
    }
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function fieldError(key: keyof FormState): string | undefined {
    const validators = VALIDATORS_FOR(key, monthBased)
    if (!validators) return undefined
    const error = validateField(form[key], validators, locale)
    return error && (attempted || touched[key]) ? error : undefined
  }

  const startIso = parseDate(form.startDate) ? toIsoDate(form.startDate) : ''
  const endParsed = form.endDate.trim() !== '' ? parseDate(form.endDate) : null
  const endIso = endParsed ? toIsoDate(endParsed) : ''
  const rangeInvalid = Boolean(endIso && startIso && endIso < startIso)
  const rangeError =
    rangeInvalid && (attempted || touched.endDate) ? t('dates.invalidRange') : undefined

  const categoryOptions = useMemo(
    () => categoriesForType(categories, form.type as 'income' | 'expense' | ''),
    [categories, form.type],
  )

  const contextOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: '', label: t('recurring.contextPersonal') },
    ]
    for (const group of groups ?? []) {
      opts.push({ value: group.id, label: group.name })
    }
    // Keep an edition's current group selectable even if membership lapsed,
    // so saving the form doesn't silently strip the group context.
    const current = form.groupId
    if (current !== '' && !opts.some((o) => o.value === current)) {
      opts.push({ value: current, label: t('recurring.contextUnavailable') })
    }
    return opts
  }, [groups, form.groupId, t])

  const showContext = (groups?.length ?? 0) > 0 || form.groupId !== ''

  let preview = ''
  if (startIso && form.amount !== '') {
    const frequency = form.frequency as RecurrenceFrequency
    if (FREQUENCY_META.some((f) => f.value === frequency)) {
      const executionDay = monthBased ? parseExecutionDay(form.executionDay) : undefined
      if (!monthBased || executionDay !== undefined) {
        if (!rangeInvalid) {
          const schedule = {
            startDate: startIso,
            endDate: endIso || undefined,
            frequency,
            executionDay,
          }
          const next = nextExecution(schedule, todayIso())
          const base = t('recurring.every').replace('{frequency}', freqLabel(locale, frequency))
          const dayPart =
            executionDay === undefined
              ? ''
              : executionDay === 0
                ? t('recurring.lastDay')
                : t('recurring.onDay').replace('{day}', String(executionDay))
          const nextPart = next
            ? t('recurring.previewNext').replace('{date}', formatDate(next, locale))
            : t('recurring.ended')
          const untilPart = endIso
            ? t('recurring.previewUntil').replace('{date}', formatDate(endIso, locale))
            : ''
          preview = [base, dayPart, nextPart, untilPart].filter(Boolean).join(' · ')
        }
      }
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setAttempted(true)
    setTouched({
      concept: true,
      amount: true,
      type: true,
      categoryId: true,
      frequency: true,
      startDate: true,
      endDate: true,
      executionDay: true,
    })
    const keys: (keyof FormState)[] = [
      'concept',
      'amount',
      'type',
      'categoryId',
      'frequency',
      'startDate',
      'endDate',
      'executionDay',
    ]
    const invalid = keys.some((key) => {
      const validators = VALIDATORS_FOR(key, monthBased)
      return validators ? validateField(form[key], validators, locale) !== null : false
    })
    if (invalid || rangeInvalid || !startIso) return
    const endDate = endIso ? endIso : undefined
    onSave({
      concept: form.concept.trim(),
      amount: Number(form.amount.replace(',', '.')),
      type: form.type as 'income' | 'expense',
      categoryId: form.categoryId,
      frequency: form.frequency as RecurrenceFrequency,
      startDate: startIso,
      endDate,
      executionDay: monthBased
        ? parseExecutionDay(form.executionDay)
        : undefined,
      groupId: form.groupId !== '' ? form.groupId : undefined,
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      {showContext && (
        <div className="form-row">
          <SelectField
            label={t('recurring.contextLabel')}
            name="groupId"
            value={form.groupId}
            error={undefined}
            onChange={(e) => setField('groupId', e.target.value)}
            options={contextOptions}
          />
        </div>
      )}
      <div className="form-row">
        <TextField
          label={t('fld.description')}
          name="concept"
          required
          value={form.concept}
          error={fieldError('concept')}
          onChange={(e) => setField('concept', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, concept: true }))}
          maxLength={80}
        />
        <TextField
          label={t('fld.amount')}
          name="amount"
          required
          inputMode="decimal"
          value={form.amount}
          error={fieldError('amount')}
          onChange={(e) => setField('amount', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, amount: true }))}
          placeholder="0,00"
        />
      </div>
      <div className="form-row">
        <SelectField
          label={t('fld.type')}
          name="type"
          required
          value={form.type}
          error={fieldError('type')}
          onChange={(e) => setField('type', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, type: true }))}
          options={[
            { value: '', label: '—' },
            { value: 'expense', label: t('type.expense') },
            { value: 'income', label: t('type.income') },
          ]}
        />
        <CategoryPicker
          label={t('fld.category')}
          name="categoryId"
          required
          value={form.categoryId}
          error={fieldError('categoryId')}
          onChange={(value) => setField('categoryId', value)}
          onBlur={() => setTouched((p) => ({ ...p, categoryId: true }))}
          categories={categoryOptions}
          locale={locale}
        />
      </div>
      <div className="form-row">
        <SelectField
          label={t('fld.frequency')}
          name="frequency"
          required
          value={form.frequency}
          error={fieldError('frequency')}
          onChange={(e) => setField('frequency', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, frequency: true }))}
          options={[
            { value: '', label: '—' },
            ...FREQUENCY_META.map((f) => ({
              value: f.value,
              label: freqLabel(locale, f.value),
            })),
          ]}
        />
        <TextField
          label={`${t('fld.startDate')} *`}
          name="startDate"
          required
          inputMode="numeric"
          value={form.startDate}
          error={fieldError('startDate')}
          onChange={(e) => setField('startDate', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, startDate: true }))}
          placeholder="DD/MM/AAAA"
        />
        <TextField
          label={t('fld.endDate')}
          name="endDate"
          inputMode="numeric"
          value={form.endDate}
          error={fieldError('endDate') || rangeError}
          onChange={(e) => setField('endDate', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, endDate: true }))}
          placeholder="DD/MM/AAAA"
        />
        {monthBased && (
          <SelectField
            label={t('fld.executionDay')}
            name="executionDay"
            required
            value={form.executionDay}
            error={fieldError('executionDay')}
            onChange={(e) => setField('executionDay', e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, executionDay: true }))}
            options={[
              { value: '', label: '—' },
              ...Array.from({ length: EXECUTION_DAY_MAX }, (_, i) => (i + 1).toString()).map(
                (d) => ({ value: d, label: d }),
              ),
              { value: 'last', label: t('execution.last') },
            ]}
          />
        )}
      </div>

      {preview && (
        <div className="recurring-preview" aria-live="polite">
          <span className="recurring-preview__label">{t('recurring.preview')}</span>
          <span className="recurring-preview__text">{preview}</span>
        </div>
      )}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
        <button type="submit" className="btn btn--primary">
          {saveLabel}
        </button>
      </div>
    </form>
  )
}

const EXECUTION_DAY_MAX = 28