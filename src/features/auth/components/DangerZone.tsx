import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { ConfirmDialog, type ConfirmStrings } from '../../../components/ConfirmDialog'
import { TextField } from '../../../components/FormField'
import { translate, type UIKey } from '../../../lib/i18n'
import { useRoute } from '../../../router'

interface DangerZoneProps {
  locale: 'es' | 'en'
}

/**
 * Session and account controls: sign out, and delete the account behind an
 * explicit typed-email step plus an ARIA modal confirmation (destructive
 * action, WCAG AA).
 */
export function DangerZone({ locale }: DangerZoneProps) {
  const t = (key: UIKey) => translate(locale, key)
  const { user, logout, deleteAccount } = useAuth()
  const { navigate } = useRoute()

  const [arming, setArming] = useState(false)
  const [typedEmail, setTypedEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  if (!user) return null

  const matches = typedEmail.trim().toLowerCase() === user.email.toLowerCase()

  async function onSignOut() {
    setLogoutBusy(true)
    await logout()
    navigate({ key: 'login', path: '/login', label: 'login', crumb: 'login' })
  }

  async function onConfirmDelete() {
    setBusy(true)
    await deleteAccount()
    setBusy(false)
    setModalOpen(false)
    // The screen unmounts; the auth screen shows a confirmation notice.
    try {
      window.sessionStorage.setItem('myfc:auth-notice', 'deleted')
    } catch {
      /* ignore storage failures */
    }
    navigate({ key: 'register', path: '/register', label: 'register', crumb: 'register' })
  }

  const confirmStrings: ConfirmStrings = {
    title: t('account.delete.title'),
    message: t('account.delete.message'),
    confirmLabel: t('account.delete.confirm'),
    cancelLabel: t('form.cancel'),
  }

  return (
    <div className="stack">
      <div className="form-actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onSignOut}
          disabled={logoutBusy}
        >
          {logoutBusy ? t('auth.loading') : t('account.logout')}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => setArming(true)}
          aria-expanded={arming}
        >
          {t('account.delete.start')}
        </button>
      </div>

      {arming && (
        <div className="panel panel--danger" role="group" aria-labelledby="delete-arm-title">
          <h3 id="delete-arm-title">{t('account.delete.title')}</h3>
          <p>{t('account.delete.message')}</p>
          <p className="text-note">{t('account.delete.note').replace('{email}', user.email)}</p>
          <TextField
            label={t('profile.email')}
            name="confirmEmail"
            type="email"
            autoComplete="email"
            autoFocus
            value={typedEmail}
            onChange={(e) => {
              setTypedEmail(e.target.value)
              setEmailError(
                e.target.value.toLowerCase() === user.email.toLowerCase() ||
                  e.target.value === ''
                  ? null
                  : t('account.delete.mismatch'),
              )
            }}
            error={emailError ?? undefined}
          />
          <div className="form-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setArming(false)
                setTypedEmail('')
                setEmailError(null)
              }}
            >
              {t('form.cancel')}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              disabled={!matches}
              onClick={() => setModalOpen(true)}
            >
              {t('account.delete.start')}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={modalOpen}
        strings={confirmStrings}
        onConfirm={onConfirmDelete}
        onCancel={() => setModalOpen(false)}
      />
      {busy && <p className="text-muted">{t('auth.loading')}</p>}
    </div>
  )
}