import { useAuth } from '../state/AuthContext'
import { useAppState } from '../../../state/AppState'
import { Avatar } from './Avatar'
import { translate, type UIKey } from '../../../lib/i18n'
import { useRoute } from '../../../router'

/**
 * Signed-in identity in the site header: avatar + name linking to the profile
 * (Configuración) and a sign-out button. Keyboard-accessible plain links/buttons.
 */
export function UserMenu() {
  const { locale } = useAppState()
  const { user, logout } = useAuth()
  const { navigate } = useRoute()
  const t = (key: UIKey) => translate(locale, key)

  if (!user) return null

  function onSignOut() {
    void logout().then(() => {
      navigate({ key: 'login', path: '/login', label: 'login', crumb: 'login' })
    })
  }

  return (
    <div className="auth-user">
      <a className="auth-user__identity" href="#/settings" title={t('header.signedInAs').replace('{email}', user.email)}>
        <Avatar name={user.name} color={user.avatar} size="sm" />
        <span className="auth-user__name">{user.name}</span>
      </a>
      <button type="button" className="btn btn--secondary auth-user__logout" onClick={onSignOut}>
        {t('auth.logout.titleShort')}
      </button>
    </div>
  )
}