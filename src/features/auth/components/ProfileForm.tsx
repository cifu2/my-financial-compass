import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { Avatar } from './Avatar'
import { TextField, SelectField } from '../../../components/FormField'
import { validateFields, required } from '../../../lib/validation'
import { translate, type UIKey } from '../../../lib/i18n'
import { AVATAR_COLORS, SUPPORTED_CURRENCIES } from '../types'

interface ProfileFormProps {
  locale: 'es' | 'en'
}

/** Editable profile: name, avatar color and primary currency. */
export function ProfileForm({ locale }: ProfileFormProps) {
  const t = (key: UIKey) => translate(locale, key)
  const { user, updateProfile } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [avatar, setAvatar] = useState(user?.avatar ?? AVATAR_COLORS[0])
  const [currency, setCurrency] = useState(user?.currency ?? 'EUR')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateFields({ name: { value: name, validators: [required()] } }, locale)
    setErrors(nextErrors)
    setStatus('idle')
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    const result = await updateProfile({ name, avatar, currency })
    setSaving(false)
    setStatus(result.ok ? 'saved' : 'error')
  }

  const hasChanges =
    name.trim() !== user.name ||
    avatar !== (user.avatar ?? AVATAR_COLORS[0]) ||
    currency !== (user.currency ?? 'EUR')

  return (
    <form onSubmit={onSave} noValidate>
      <TextField
        label={t('profile.name')}
        name="profileName"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <div className="form-field">
        <span className="form-field__label" id="avatar-group-label">
          {t('profile.avatar')}
        </span>
        <span className="form-field__hint" id="avatar-group-hint">
          {t('profile.avatarHint')}
        </span>
        <div
          className="avatar-picker"
          role="radiogroup"
          aria-labelledby="avatar-group-label"
          aria-describedby="avatar-group-hint"
        >
          {AVATAR_COLORS.map((color) => {
            const selected = avatar === color
            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${color}`}
                className={`avatar-option${selected ? ' avatar-option--selected' : ''}`}
                onClick={() => setAvatar(color)}
              >
                <Avatar name={name.trim() || user.name} color={color} size="md" />
              </button>
            )
          })}
        </div>
      </div>
      <SelectField
        label={t('profile.currency')}
        name="profileCurrency"
        required
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        hint={t('profile.currencyHint')}
        options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
      />
      {status === 'saved' && (
        <p className="auth-success" role="status">
          {t('profile.saved')}
        </p>
      )}
      {status === 'error' && (
        <p className="auth-alert" role="alert">
          {t('profile.saveError')}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !hasChanges}>
          {saving ? t('auth.loading') : t('form.save')}
        </button>
      </div>
    </form>
  )
}