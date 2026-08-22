import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { TextField } from '../../../components/FormField'
import {
  validateFields,
  required,
  strongPassword,
  passwordMatches,
} from '../../../lib/validation'
import { translate, type UIKey } from '../../../lib/i18n'

interface SecuritySectionProps {
  locale: 'es' | 'en'
}

/** Change-password form for the signed-in user. */
export function SecuritySection({ locale }: SecuritySectionProps) {
  const t = (key: UIKey) => translate(locale, key)
  const { changePassword } = useAuth()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'saved' | 'wrong' | 'error'>('idle')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateFields(
      {
        current: { value: current, validators: [required()] },
        next: { value: next, validators: [required(), strongPassword()] },
        confirm: { value: confirm, validators: [required(), passwordMatches(() => next)] },
      },
      locale,
    )
    setErrors(nextErrors)
    setStatus('idle')
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    const result = await changePassword(current, next)
    setSaving(false)
    if (result.ok) {
      setStatus('saved')
      setCurrent('')
      setNext('')
      setConfirm('')
    } else if (result.error.code === 'wrong-password') {
      setStatus('wrong')
    } else {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <TextField
        label={t('security.currentPassword')}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        error={errors.current}
      />
      <TextField
        label={t('security.newPassword')}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        value={next}
        onChange={(e) => setNext(e.target.value)}
        hint={t('auth.passwordHint')}
        error={errors.next}
      />
      <TextField
        label={t('security.confirmPassword')}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
      />
      {status === 'saved' && (
        <p className="auth-success" role="status">
          {t('security.updated')}
        </p>
      )}
      {status === 'wrong' && (
        <p className="auth-alert" role="alert">
          {t('security.currentWrong')}
        </p>
      )}
      {status === 'error' && (
        <p className="auth-alert" role="alert">
          {t('security.failure')}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? t('auth.loading') : t('security.change')}
        </button>
      </div>
    </form>
  )
}