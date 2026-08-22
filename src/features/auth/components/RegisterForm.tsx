import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { useRoute } from '../../../router'
import { TextField } from '../../../components/FormField'
import {
  validateFields,
  required,
  isEmail,
  strongPassword,
  passwordMatches,
  formatMessage,
  type MessageKey,
} from '../../../lib/validation'
import { translate, type UIKey } from '../../../lib/i18n'

interface RegisterFormProps {
  locale: 'es' | 'en'
  onDone: () => void
}

/**
 * Email + password account creation. Enforces the shared password policy and
 * a unique email. Successful registration signs the user in automatically.
 */
export function RegisterForm({ locale, onDone }: RegisterFormProps) {
  const t = (key: UIKey) => translate(locale, key)
  const getMessage = (key: MessageKey) => formatMessage(locale, key)
  const { register } = useAuth()
  const { navigate } = useRoute()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateFields(
      {
        name: { value: name, validators: [required()] },
        email: { value: email, validators: [required(), isEmail()] },
        password: { value: password, validators: [required(), strongPassword()] },
        confirm: {
          value: confirm,
          validators: [required(), passwordMatches(() => password)],
        },
      },
      locale,
    )
    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const result = await register({ email, name, password })
    setSubmitting(false)
    if (result.ok) {
      onDone()
      navigate({ key: 'dashboard', path: '/', label: '', crumb: '' })
    } else if (result.error.code === 'email-taken') {
      setErrors({ email: getMessage('email.taken') })
    } else {
      setFormError(t('auth.register.failure'))
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <TextField
        label={t('auth.name')}
        name="name"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        hint={t('auth.nameHint')}
        error={errors.name}
      />
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
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={t('auth.passwordHint')}
        error={errors.password}
      />
      <TextField
        label={t('auth.confirmPassword')}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
      />
      {formError && (
        <p className="auth-alert" role="alert">
          {formError}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? t('auth.loading') : t('auth.register.action')}
        </button>
      </div>
      <p className="auth-switch">
        {t('auth.haveAccount')}{' '}
        <a href="#/login">{t('auth.loginLink')}</a>
      </p>
    </form>
  )
}