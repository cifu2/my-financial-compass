import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { TextField } from '../../../components/FormField'
import {
  validateFields,
  required,
  isEmail,
  strongPassword,
  passwordMatches,
} from '../../../lib/validation'
import { translate, type UIKey } from '../../../lib/i18n'

interface ForgotPasswordFormProps {
  locale: 'es' | 'en'
}

/**
 * Two-step password recovery:
 *   1. request a reset code for the given email (generic response, whichever
 *      outcome; the demo renders the code locally because there is no email
 *      transport yet — see ADR-0007),
 *   2. redeem the code with a new password.
 */
export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const t = (key: UIKey) => translate(locale, key)
  const { requestPasswordReset, confirmPasswordReset } = useAuth()

  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  async function onRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateFields(
      { email: { value: email, validators: [required(), isEmail()] } },
      locale,
    )
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const result = await requestPasswordReset(email)
    setSubmitting(false)
    if (result.ok) {
      setDemoCode(result.data.demoCode)
      setStep('reset')
    } else {
      setFormError(t('auth.register.failure'))
    }
  }

  async function onReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateFields(
      {
        code: { value: code, validators: [required()] },
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
    const result = await confirmPasswordReset(email, code.trim(), password)
    setSubmitting(false)
    if (result.ok) {
      setDone(true)
    } else if (result.error.code === 'expired-code') {
      setFormError(t('auth.forgot.codeExpired'))
    } else {
      setFormError(t('auth.forgot.codeInvalid'))
    }
  }

  if (done) {
    return (
      <div className="auth-panel__centered" role="status">
        <p className="auth-success">{t('auth.forgot.done')}</p>
        <div className="form-actions">
          <a className="btn btn--primary btn--block" href="#/login">
            {t('auth.login.action')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {step === 'request' ? (
        <form onSubmit={onRequest} noValidate>
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
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={submitting}
            >
              {submitting ? t('auth.loading') : t('auth.forgot.action')}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onReset} noValidate>
          <div role="status" className="auth-status">
            <p className="auth-success">{t('auth.forgot.sentTitle')}</p>
            <p>
              {t('auth.forgot.sentBody').replace('{email}', email)}
            </p>
            {demoCode && (
              <div className="auth-demo">
                <strong>{t('auth.forgot.demoTitle')}</strong>
                <p>{t('auth.forgot.demoBody')}</p>
                <p className="auth-demo__code" aria-label={t('auth.forgot.code')}>
                  {demoCode}
                </p>
              </div>
            )}
          </div>
          <TextField
            label={t('auth.forgot.code')}
            name="resetCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            hint={t('auth.forgot.codeHint')}
            error={errors.code}
          />
          <TextField
            label={t('auth.forgot.newPassword')}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={t('auth.passwordHint')}
            error={errors.password}
          />
          <TextField
            label={t('auth.forgot.confirmPassword')}
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
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={submitting}
            >
              {submitting ? t('auth.loading') : t('auth.forgot.submit')}
            </button>
          </div>
        </form>
      )}
      <p className="auth-switch">
        <a href="#/login">{t('auth.backToLogin')}</a>
      </p>
    </>
  )
}