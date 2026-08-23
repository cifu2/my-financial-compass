import { useEffect, useState } from 'react'
import { useAppState } from '../../../state/AppState'
import { readSessionUser } from '../../auth/services/authService'
import { listUserGroups } from '../../groups/services/groupService'
import type { MyGroup } from '../../groups/types'
import { translate, type UIKey } from '../../../lib/i18n'

interface BudgetContextSelectorProps {
  /** When true, renders inline in a list header instead of a full form row. */
  compact?: boolean
}

/**
 * Budget context switch (HU-0.8). Lets the member view either their personal
 * budgets or the shared budgets of one of their groups. The selected group is
 * kept in the global store, so the budget dashboard (and the dashboard budget
 * snapshot) filter automatically whenever the context changes.
 */
export function BudgetContextSelector({ compact = false }: BudgetContextSelectorProps) {
  const { locale, store, setBudgetGroupId } = useAppState()
  const t = (key: UIKey) => translate(locale, key)

  const currentUserId = readSessionUser()?.id ?? null
  // Keyed state: groups are shown only while their owner is the active user,
  // so a switch of session never shows another member's group as an option.
  const [loaded, setLoaded] = useState<{ userId: string; groups: MyGroup[] } | null>(null)
  const groups = loaded !== null && loaded.userId === currentUserId ? loaded.groups : []

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

  const value = store.budgetGroupId ?? ''

  function onChange(next: string) {
    setBudgetGroupId(next === '' ? null : next)
  }

  return (
    <div className={compact ? 'budget-context budget-context--compact' : 'budget-context'}>
      <label className="form-field__label" htmlFor="budget-context">
        {t('budget.contextLabel')}
      </label>
      <select
        id="budget-context"
        name="budgetContext"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t('budget.contextPersonal')}</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  )
}