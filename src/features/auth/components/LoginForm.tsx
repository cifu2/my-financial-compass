import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { useRoute } from '../../../router'
import { TextField } from '../../../components/FormField'
import { validateFields, isEmail, required } from '../../../lib/validation'
import { translate, type UIKey } from '../../../lib/i18n'

interface LoginFormProps {
  locale: 'es' | 'en'
  onDone: () => void
}

/**
 * Email + password sign-in. Form-level errors (invalid credentials) are shown
 * as a live region; per-field errors use the shared validation messages.
 */
export function LoginForm({ locale, onDone }: LoginFormProps) {
  const t = (key: UIKey) => translate(locale, key)
  const { login } = useAuth()
  const { navigate } = useRoute()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateFields(
      { email: { value: email, validators: [required(), isEmail()] }, password: { value: password, validators: [required()] } },
      locale,
    )
    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)
    if (result.ok) {
      onDone()
      navigate({ key: 'dashboard', path: '/', label: '', crumb: '' })
    } else {
      setFormError(t('auth.login.failure'))
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <TextField
        label={t('auth.email')}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <TextField
        label={t('auth.password')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <div className="auth-links">
        <a href="#/forgot-password">{t('auth.forgot.link')}</a>
      </div>
      {formError && (
        <p className="auth-alert" role="alert">
          {formError}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? t('auth.loading') : t('auth.login.action')}
        </button>
      </div>
      <p className="auth-switch">
        {t('auth.noAccount')}{' '}
        <a href="#/register">{t('auth.registerLink')}</a>
      </p>
    </form>
  )
}