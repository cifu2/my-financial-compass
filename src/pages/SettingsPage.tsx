import type { FormEvent } from 'react'
import { Page } from '../components/Page'
import { SelectField } from '../components/FormField'
import { useAppState } from '../state/AppState'
import { formatDate, type Locale } from '../lib/dates'
import { translate, type UIKey } from '../lib/i18n'

export default function SettingsPage() {
  const { locale, setLocale } = useAppState()
  const t = (key: UIKey) => translate(locale, key)

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  const today = new Date()

  return (
    <Page title="Settings">
      <div className="stack">
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