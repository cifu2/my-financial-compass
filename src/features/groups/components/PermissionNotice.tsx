import type { Locale } from '../../../lib/dates'
import { translate, type UIKey } from '../../../lib/i18n'
import type { GroupRole } from '../types'

/**
 * Accessible notice shown when the current member lacks the permission to
 * perform an action in the active group context. Clear, contextual copy makes
 * the "not allowed" case understandable instead of silently hiding controls.
 */
export function PermissionNotice({
  locale,
  role,
  groupName,
  baseKey,
}: {
  locale: Locale
  /** The viewer's role (drives the "read-only" style copy). */
  role?: GroupRole | null
  groupName?: string | null
  /** i18n key base without the {$role} suffix, e.g. `permission.dataEdit`. */
  baseKey: string
}) {
  const key = (role ? `${baseKey}.${role}` : baseKey) as UIKey
  const message = groupName
    ? translate(locale, key).replace('{group}', groupName)
    : translate(locale, key)
  return (
    <p className="form-field__error permission-notice" role="alert">
      {message}
    </p>
  )
}