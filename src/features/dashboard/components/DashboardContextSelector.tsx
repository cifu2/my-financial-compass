import { useCallback, useEffect, useMemo, useState } from 'react'
import { SelectField } from '../../../components/FormField'
import type { Locale } from '../../../lib/dates'
import { readSessionUser } from '../../auth/services/authService'
import { listUserGroups } from '../../groups/services/groupService'
import type { MyGroup } from '../../groups/types'
import { translate, type UIKey } from '../../../lib/i18n'
import {
  DASHBOARD_CONTEXT_ALL,
  DASHBOARD_CONTEXT_PERSONAL,
} from '../services/dashboardContext'

export interface DashboardContextSelectorProps {
  locale: Locale
  value: string
  onChange: (value: string) => void
}

/**
 * Dashboard context switch (HU-0.5). Lets the member view the widgets as
 * their personal ledger, the shared ledger of one of their groups, or the
 * consolidated "Todo" view (with origin labels). "Todo" is only offered once
 * the user belongs to at least one group — without groups it equals the
 * personal view.
 */
export function DashboardContextSelector({
  locale,
  value,
  onChange,
}: DashboardContextSelectorProps) {
  const t = useCallback((key: UIKey) => translate(locale, key), [locale])

  const currentUserId = readSessionUser()?.id ?? null
  // Keyed state: groups are shown only while their owner is the active user,
  // so a switch of session never shows another member's group as an option.
  const [loaded, setLoaded] = useState<{ userId: string; groups: MyGroup[] } | null>(null)
  const groups = useMemo(
    () => (loaded !== null && loaded.userId === currentUserId ? loaded.groups : []),
    [loaded, currentUserId],
  )

  useEffect(() => {
    if (!currentUserId) return
    let cancelled = false
    void listUserGroups(currentUserId).then((userGroups) => {
      if (cancelled) return
      setLoaded({ userId: currentUserId, groups: userGroups })
    })
    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const options = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [
      { value: DASHBOARD_CONTEXT_PERSONAL, label: t('dash.contextPersonal') },
    ]
    if (groups.length > 0) {
      opts.push({ value: DASHBOARD_CONTEXT_ALL, label: t('dash.contextAll') })
    }
    for (const group of groups) {
      opts.push({ value: group.id, label: group.name })
    }
    return opts
  }, [groups, t])

  if (groups.length === 0) return null

  const current = options.some((o) => o.value === value) ? value : DASHBOARD_CONTEXT_PERSONAL

  return (
    <SelectField
      label={t('dash.contextLabel')}
      name="dashboardContext"
      value={current}
      onChange={(e) => onChange(e.target.value)}
      options={options}
    />
  )
}