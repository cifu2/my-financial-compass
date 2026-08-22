import { useEffect, useState } from 'react'
import { useRoute } from '../../../router'
import type { RouteKey } from '../../../router'
import { useAppState } from '../../../state/AppState'
import { useAuth } from '../state/AuthContext'
import { translate, type UIKey } from '../../../lib/i18n'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'

function titleFor(key: RouteKey, t: (k: UIKey) => string): string {
  switch (key) {
    case 'register':
      return t('auth.register.title')
    case 'forgot-password':
      return t('auth.forgot.title')
    default:
      return t('auth.login.title')
  }
}

function subtitleFor(key: RouteKey, t: (k: UIKey) => string): string {
  switch (key) {
    case 'register':
      return t('auth.register.subtitle')
    case 'forgot-password':
      return t('auth.forgot.subtitle')
    default:
      return t('auth.login.subtitle')
  }
}

/**
 * Standalone authenticated-guest screen (no main nav, per requirements: the
 * app sections are only reachable once signed in). Renders a brand hero plus
 * the login/register/recovery card chosen by the current route.
 */
export function AuthScreen() {
  const { locale } = useAppState()
  const { status } = useAuth()
  const { route } = useRoute()
  const t = (key: UIKey) => translate(locale, key)

  const [notice] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem('myfc:auth-notice')
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!notice) return
    try {
      window.sessionStorage.removeItem('myfc:auth-notice')
    } catch {
      /* ignore storage failures */
    }
  }, [notice])

  if (status === 'user') return null

  return (
    <main className="auth-screen" id="content">
      <section className="auth-hero" aria-hidden="true">
        <div className="auth-hero__inner">
          <p className="auth-hero__brand">My Financial Compass</p>
          <h1>{t('auth.heroTitle')}</h1>
          <p>{t('auth.heroText')}</p>
          <ul className="auth-hero__items">
            <li>{t('auth.heroItem1')}</li>
            <li>{t('auth.heroItem2')}</li>
            <li>{t('auth.heroItem3')}</li>
          </ul>
        </div>
      </section>
      <section className="auth-card" aria-labelledby="auth-card-title">
        <div className="auth-card__inner">
          {notice === 'deleted' && (
            <p className="auth-success" role="status">
              {t('account.deleted')}
            </p>
          )}
          <h1 id="auth-card-title">{titleFor(route.key, t)}</h1>
          <p className="auth-card__subtitle">{subtitleFor(route.key, t)}</p>
          {route.key === 'register' ? (
            <RegisterForm locale={locale} onDone={() => undefined} />
          ) : route.key === 'forgot-password' ? (
            <ForgotPasswordForm locale={locale} />
          ) : (
            <LoginForm locale={locale} onDone={() => undefined} />
          )}
        </div>
      </section>
    </main>
  )
}