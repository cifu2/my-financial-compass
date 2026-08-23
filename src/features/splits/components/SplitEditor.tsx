import { useEffect, useMemo, useRef, useState } from 'react'
import { SelectField, TextField } from '../../../components/FormField'
import type { Locale } from '../../../lib/dates'
import { translate, type UIKey } from '../../../lib/i18n'
import { computeSplit, type SplitErrorCode } from '../services/splitCalculator'
import { splitErrorMessages } from '../services/splitMessages'
import { splitGroupMembers } from '../services/splitsGroupContext'
import type { ExpenseSplit, ExpenseSplitShare } from '../types'

/**
 * Split editor for a group expense (HU-0.7). Renders the payer selector, the
 * distribution method, one input per member and a live share preview. The
 * parent owns the amount input and calls `onChange` on every edit so it can
 * veto saving while the split does not match the total.
 *
 * Keyboard accessible: visible labels via `FormField`, plain selects/inputs,
 * inline errors announced with role="alert".
 */
export interface SplitDraft {
  paidBy: string
  method: ExpenseSplit['method']
  /** Per-member raw numeric input (percent / fixed / weight). */
  inputs: Record<string, string>
  /** Validated share rows (empty when the split is invalid). */
  shares: ExpenseSplitShare[]
  error: SplitErrorCode | null
}

export interface SplitEditorProps {
  locale: Locale
  /** Expense total in euros (drives the split target). */
  amount: number
  groupId: string
  currentUserId: string
  /** Split being edited, or null when creating a fresh share. */
  initial?: ExpenseSplit | null
  /** True after the parent submits a save attempt (shows field errors). */
  attempted?: boolean
  onChange: (draft: SplitDraft) => void
}

interface SplitState {
  paidBy: string
  method: ExpenseSplit['method']
  inputs: Record<string, string>
}

const METHOD_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'equal', labelKey: 'split.method.equal' },
  { value: 'percentages', labelKey: 'split.method.percentages' },
  { value: 'amounts', labelKey: 'split.method.amounts' },
  { value: 'weights', labelKey: 'split.method.weights' },
]

function displayAmount(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

function toNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : undefined
}

function placeholderFor(method: ExpenseSplit['method']): string {
  switch (method) {
    case 'percentages':
      return '%'
    case 'amounts':
      return '0,00'
    case 'weights':
      return '1'
    default:
      return ''
  }
}

function buildDraft(
  validTotal: number,
  members: Array<{ userId: string }>,
  next: SplitState,
): SplitDraft {
  const result = computeSplit(
    validTotal,
    next.method,
    members.map((m) => ({ userId: m.userId, value: toNumber(next.inputs[m.userId]) })),
  )
  return {
    paidBy: next.paidBy,
    method: next.method,
    inputs: next.inputs,
    shares: result.ok ? result.shares : [],
    error: result.ok ? null : result.error,
  }
}

export function SplitEditor({
  locale,
  amount,
  groupId,
  currentUserId = '',
  initial,
  attempted: attemptedProp = false,
  onChange,
}: SplitEditorProps) {
  const t = (key: UIKey) => translate(locale, key)
  const members = useMemo(() => splitGroupMembers(groupId), [groupId])

  const [state, setState] = useState<SplitState>(() => ({
    paidBy: initial?.paidBy ?? currentUserId,
    method: initial?.method ?? 'equal',
    inputs: initial
      ? Object.fromEntries(initial.shares.map((s) => [s.userId, displayAmount(s.amount)]))
      : {},
  }))
  const [localEdited, setLocalEdited] = useState(false)
  const emittedKeyRef = useRef('')

  const validTotal = Number.isFinite(amount) && amount > 0 ? amount : 0

  const preview = useMemo(
    () => buildDraft(validTotal, members, state),
    [state, members, validTotal],
  )

  // Mirror the latest computed draft to the parent whenever any input changes
  // (the editor owns the share fields; the parent only owns the amount).
  const key = JSON.stringify([state, validTotal])
  useEffect(() => {
    if (key === emittedKeyRef.current) return
    emittedKeyRef.current = key
    onChange(preview)
  }, [preview, key, onChange])

  function update(patch: Partial<SplitState>) {
    const next = { ...state, ...patch }
    setState(next)
    if ('inputs' in patch || 'paidBy' in patch || 'method' in patch) setLocalEdited(true)
  }

  const showError = preview.error !== null && (attemptedProp || localEdited)

  return (
    <fieldset className="ownership-editor">
      <legend>{t('split.title')}</legend>
      <p className="text-note">{t('split.hint')}</p>

      <div className="form-row">
        <SelectField
          label={t('split.payer')}
          name="splitPayer"
          required
          value={preview.paidBy}
          onChange={(e) => update({ paidBy: e.target.value })}
          options={members.map((m) => ({ value: m.userId, label: m.name }))}
        />
        <SelectField
          label={t('split.method')}
          name="splitMethod"
          required
          value={preview.method}
          onChange={(e) => update({ method: e.target.value as ExpenseSplit['method'] })}
          options={METHOD_OPTIONS.map((m) => ({ value: m.value, label: t(m.labelKey as UIKey) }))}
        />
      </div>

      {preview.method === 'equal' && members.length > 0 ? (
        <p className="text-note" aria-live="polite">
          {t('split.preview')} {validTotal.toFixed(2)} € ÷ {members.length} ={' '}
          {(validTotal / members.length).toFixed(2)} €
        </p>
      ) : (
        <div className="form-row">
          {members.map((member) => (
            <TextField
              key={member.userId}
              label={member.name}
              name={`share-${member.userId}`}
              required
              inputMode="decimal"
              value={preview.inputs[member.userId] ?? ''}
              onChange={(e) =>
                update({ inputs: { ...preview.inputs, [member.userId]: e.target.value } })
              }
              placeholder={placeholderFor(preview.method)}
            />
          ))}
        </div>
      )}

      {preview.error !== null && showError ? (
        <p className="form-field__error" role="alert">
          {splitErrorMessages(preview.error, locale)}
        </p>
      ) : null}

      {preview.shares.length > 0 && preview.error === null && (
        <ul className="split-summary" aria-live="polite">
          {preview.shares.map((s) => {
            const member = members.find((m) => m.userId === s.userId)
            return (
              <li key={s.userId}>
                {member?.name ?? s.userId}: {s.amount.toFixed(2)} €
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}