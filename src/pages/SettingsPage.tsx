import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { SelectField } from '../components/FormField'
import { useAppState } from '../state/AppState'
import { ProfileForm } from '../features/auth/components/ProfileForm'
import { SecuritySection } from '../features/auth/components/SecuritySection'
import { DangerZone } from '../features/auth/components/DangerZone'
import { Avatar } from '../features/auth/components/Avatar'
import { useAuth } from '../features/auth/state/AuthContext'
import { formatDate, type Locale } from '../lib/dates'
import { translate, type UIKey } from '../lib/i18n'

export default function SettingsPage() {
  const { locale, setLocale } = useAppState()
  const { user } = useAuth()
  const t = (key: UIKey) => translate(locale, key)

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  const today = new Date()

  return (
    <Page title="Settings">
      <div className="stack">
        <div className="panel">
          <h2>Settings</h2>
          {user && <Avatar name={user.name} color={user.avatar} size="lg" />}
          <p className="text-muted">
            {user?.email} · {user?.currency}
          </p>
        </div>

        <div className="panel">
          <h2>{t('settings.profileTitle')}</h2>
          <p className="text-note">{t('profile.description')}</p>
          <div className="settings-section">
            <ProfileForm locale={locale} />
          </div>
        </div>

        <div className="panel">
          <h2>{t('settings.securityTitle')}</h2>
          <p className="text-note">{t('security.subtitle')}</p>
          <div className="settings-section">
            <SecuritySection locale={locale} />
          </div>
        </div>

        <div className="panel">
          <h2>{t('settings.accountTitle')}</h2>
          <p className="text-note">{t('account.subtitle')}</p>
          <div className="settings-section">
            <DangerZone locale={locale} />
          </div>
        </div>

        <div className="panel">
          <h2>Preferences</h2>
          <form onSubmit={onSave}>
            <div className="form-row">
              <SelectField
                label="Language"
                name="language"
                required
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                options={[
                  { value: 'es', label: 'Español' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>
            <div className="form-row">
              <p className="text-muted">
                Date format: <strong>{t('date.format')}</strong>
              </p>
              <p className="text-muted">
                Today: <strong>{formatDate(today, locale)}</strong>
              </p>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn--primary">
                {t('form.save')}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <h2>{t('settings.feedbackTitle')}</h2>
          <p className="text-muted">{t('settings.feedbackHint')}</p>
          <div className="form-actions">
            <a className="btn btn--secondary" href="/feedback.html">
              {t('settings.feedbackLink')}
            </a>
          </div>
        </div>
      </div>
    </Page>
  )
}