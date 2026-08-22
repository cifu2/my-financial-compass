import { useState } from 'react'
import type { FormEvent } from 'react'
import { TextField, SelectField } from '../../../components/FormField'
import { CategoryPicker } from '../../categories/components/CategoryPicker'
import { categoriesForType } from '../../categories/services/categoryService'
import type { Category } from '../../categories/types'
import type { OccurrenceTemplate } from '../types'
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
import { formatDate, parseDate, toIsoDate, type Locale } from '../../../lib/dates'
import { translate, type UIKey } from '../../../lib/i18n'

const CONCEPT: Validator[] = [required(), maxLength(80)]
const AMOUNT: Validator[] = [required(), mustBeNumber(), greaterThan(0)]
const TYPE: Validator[] = [requiredSelect()]
const CATEGORY: Validator[] = [requiredSelect()]
const DATE: Validator[] = [required(), isValidDate()]

export interface OccurrenceEditDialogProps {
  locale: Locale
  categories: readonly Category[]
  title: string
  hint: string
  scheduledDate: string
  template: OccurrenceTemplate
  confirmLabel: string
  cancelLabel: string
  onSave: (override: { template: OccurrenceTemplate; date: string }) => void
  onCancel: () => void
}

interface FormState {
  concept: string
  amount: string
  type: string
  categoryId: string
  date: string
}

/**
 * Modal to edit a single upcoming occurrence without touching the rest of the
 * recurrence. Saves an occurrence-level override (template + posting date).
 */
export function OccurrenceEditDialog({
  locale,
  categories,
  title,
  hint,
  scheduledDate,
  template,
  confirmLabel,
  cancelLabel,
  onSave,
  onCancel,
}: OccurrenceEditDialogProps) {
  const t = (key: UIKey) => translate(locale, key)
  const [form, setForm] = useState<FormState>(() => ({
    concept: template.concept,
    amount: Math.abs(template.amount).toFixed(2).replace('.', ','),
    type: template.type,
    categoryId: template.categoryId,
    date: formatDate(scheduledDate, locale),
  }))
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [attempted, setAttempted] = useState(false)

  function fieldError(key: keyof FormState): string | undefined {
    const validators = FIELD_VALIDATORS[key]
    const error = validateField(form[key], validators, locale)
    return error && (attempted || touched[key]) ? error : undefined
  }

  const categoryOptions = categoriesForType(categories, form.type as 'income' | 'expense' | '')

  function submit(e: FormEvent) {
    e.preventDefault()
    setAttempted(true)
    setTouched({ concept: true, amount: true, type: true, categoryId: true, date: true })
    const invalid = (Object.keys(FIELD_VALIDATORS) as (keyof FormState)[]).some(
      (key) => validateField(form[key], FIELD_VALIDATORS[key], locale) !== null,
    )
    const dateIso = parseDate(form.date) ? toIsoDate(form.date) : ''
    if (invalid || !dateIso) return
    onSave({
      template: {
        concept: form.concept.trim(),
        amount: Number(form.amount.replace(',', '.')),
        type: form.type as 'income' | 'expense',
        categoryId: form.categoryId,
      },
      date: dateIso,
    })
  }

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="confirm-dialog dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="occurrence-dialog-title"
      >
        <h2 id="occurrence-dialog-title" className="confirm-dialog-title">
          {title}
        </h2>
        <p className="confirm-dialog-message">{hint}</p>
        <form onSubmit={submit} noValidate>
          <div className="form-row">
            <TextField
              label={t('fld.description')}
              name="concept"
              required
              value={form.concept}
              error={fieldError('concept')}
              onChange={(e) => setForm((p) => ({ ...p, concept: e.target.value }))}
              onBlur={() => setTouched((p) => ({ ...p, concept: true }))}
            />
            <TextField
              label={t('fld.amount')}
              name="amount"
              required
              inputMode="decimal"
              value={form.amount}
              error={fieldError('amount')}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              onBlur={() => setTouched((p) => ({ ...p, amount: true }))}
            />
          </div>
          <div className="form-row">
            <SelectField
              label={t('fld.type')}
              name="type"
              required
              value={form.type}
              error={fieldError('type')}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              onBlur={() => setTouched((p) => ({ ...p, type: true }))}
              options={[
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
              onChange={(value) => setForm((p) => ({ ...p, categoryId: value }))}
              onBlur={() => setTouched((p) => ({ ...p, categoryId: true }))}
              categories={categoryOptions}
              locale={locale}
            />
            <TextField
              label={t('fld.date')}
              name="date"
              required
              inputMode="numeric"
              value={form.date}
              error={fieldError('date')}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              onBlur={() => setTouched((p) => ({ ...p, date: true }))}
              placeholder="DD/MM/AAAA"
            />
          </div>
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="submit" className="btn btn--primary">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FIELD_VALIDATORS: Record<keyof FormState, Validator[]> = {
  concept: CONCEPT,
  amount: AMOUNT,
  type: TYPE,
  categoryId: CATEGORY,
  date: DATE,
}