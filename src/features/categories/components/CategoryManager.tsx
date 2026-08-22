import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppState } from '../../../state/AppState'
import type { Category, CategoryType } from '../types'
import { ConfirmDialog, type ConfirmStrings } from '../../../components/ConfirmDialog'
import { UndoToast } from '../../../components/UndoToast'
import { TextField, SelectField } from '../../../components/FormField'
import { useUndo } from '../../../hooks/useUndo'
import {
  categoryInUse,
  duplicateName,
} from '../services/categoryService'
import {
  required,
  maxLength,
  requiredSelect,
  validateFields,
  type Validator,
} from '../../../lib/validation'
import { translate, type UIKey } from '../../../lib/i18n'
import '../../../components/layer.css'

interface CategoryForm {
  name: string
  type: string
}

const NAME_OPT: Validator[] = [required(), maxLength(40)]
const TYPE_OPT: Validator[] = [requiredSelect()]
const EMPTY_FORM: CategoryForm = { name: '', type: '' }

const TYPE_LABEL: Record<CategoryType, UIKey> = {
  income: 'type.income',
  expense: 'type.expense',
  both: 'type.both',
}

/**
 * Category management: create, edit (rename/re-type), deactivate/reactivate and
 * delete (only when no transaction uses the category). Deletions offer undo and
 * every destructive action requires explicit confirmation.
 */
export function CategoryManager() {
  const { locale, store, addCategory, updateCategory, remove, restore } =
    useAppState()
  const t = (key: UIKey) => translate(locale, key)

  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [touched, setTouched] = useState<Partial<Record<keyof CategoryForm, boolean>>>({})
  const [attempted, setAttempted] = useState(false)

  const catUndo = useUndo<Category>(8000)
  const [confirming, setConfirming] = useState<Category | null>(null)

  const usage = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of store.transactions) {
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1)
    }
    return map
  }, [store.transactions])

  function errors(): Partial<Record<keyof CategoryForm, string>> {
    const fields = {
      name: { value: form.name, validators: NAME_OPT },
      type: { value: form.type, validators: TYPE_OPT },
    }
    const base = validateFields(fields, locale)
    if (!base.name && duplicateName(store.categories, form.name, editingId ?? undefined)) {
      base.name = t('category.duplicate')
    }
    return base
  }

  function fieldError(key: keyof CategoryForm): string | undefined {
    const err = errors()[key]
    return err && (attempted || touched[key]) ? err : undefined
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setForm({ name: category.name, type: category.type })
    setTouched({})
    setAttempted(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setTouched({})
    setAttempted(false)
  }

  function saveCategory(e: FormEvent) {
    e.preventDefault()
    setAttempted(true)
    setTouched({ name: true, type: true })
    if (Object.values(errors()).some(Boolean)) return

    const payload = { name: form.name.trim(), type: form.type as CategoryType }
    if (editingId) {
      updateCategory(editingId, payload)
    } else {
      addCategory({ ...payload, isActive: true })
    }
    cancelEdit()
  }

  function toggleActive(category: Category) {
    updateCategory(category.id, { isActive: !category.isActive })
  }

  const confirmStrings: ConfirmStrings = {
    title: t('confirm.deleteTitle'),
    message:
      confirming && categoryInUse(confirming.id, store.transactions)
        ? t('category.inUseTitle')
        : t('category.deleteTitle'),
    confirmLabel: t('confirm.delete'),
    cancelLabel: t('confirm.cancel'),
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2>{editingId ? t('form.edit') : t('common.category')}</h2>
        <form onSubmit={saveCategory} noValidate>
          <div className="form-row">
            <TextField
              label={t('fld.name')}
              name="categoryName"
              required
              value={form.name}
              error={fieldError('name')}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              onBlur={() => setTouched((p) => ({ ...p, name: true }))}
              maxLength={40}
            />
            <SelectField
              label={t('fld.type')}
              name="categoryType"
              required
              value={form.type}
              error={fieldError('type')}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              onBlur={() => setTouched((p) => ({ ...p, type: true }))}
              options={[
                { value: '', label: '—' },
                { value: 'income', label: t('type.income') },
                { value: 'expense', label: t('type.expense') },
                { value: 'both', label: t('type.both') },
              ]}
            />
          </div>
          <div className="form-actions">
            {editingId && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={cancelEdit}
              >
                {t('form.cancel')}
              </button>
            )}
            <button type="submit" className="btn btn--primary">
              {editingId ? t('form.submit') : t('form.save')}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>{t('section.categories')}</h2>
        {store.categories.length === 0 ? (
          <p className="text-muted">{t('common.empty')}</p>
        ) : (
          <ul className="category-list">
            {store.categories.map((item) => {
              const inUse = (usage.get(item.id) ?? 0) > 0
              return (
                <li key={item.id} className="category-row">
                  <div className="category-info">
                    <span className="category-name">
                      {item.name}
                      {!item.isActive && (
                        <span className="badge badge--muted">{t('category.inactive')}</span>
                      )}
                    </span>
                    <span className="text-muted">
                      {' · '}
                      {TYPE_LABEL[item.type] ? translate(locale, TYPE_LABEL[item.type]) : item.type}
                      {inUse && (
                        <span className="text-note"> · {usage.get(item.id)} {t('category.txCount')}</span>
                      )}
                    </span>
                  </div>
                  <div className="category-actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => startEdit(item)}
                    >
                      {t('form.edit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => toggleActive(item)}
                      aria-pressed={item.isActive}
                    >
                      {item.isActive ? t('category.deactivate') : t('category.activate')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => setConfirming(item)}
                      disabled={inUse}
                      aria-disabled={inUse}
                      title={inUse ? t('category.inUseHint') : undefined}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {store.categories.some((c) => (usage.get(c.id) ?? 0) > 0) && (
          <p className="text-note">{t('category.deleteNote')}</p>
        )}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        strings={confirmStrings}
        onConfirm={() => {
          if (confirming) {
            remove({ kind: 'category', item: confirming })
            catUndo.push(confirming, confirming.name)
          }
          setConfirming(null)
        }}
        onCancel={() => setConfirming(null)}
      />

      {catUndo.snapshots.map((snap, index) => (
        <UndoToast
          key={snap.id}
          entry={snap}
          index={index}
          title={t('undo.title')}
          actionLabel={t('undo.action')}
          dismissLabel={t('undo.dismiss')}
          onUndo={(i) => {
            const s = catUndo.snapshots[i]
            if (s) {
              restore({ kind: 'category', item: s.item })
              catUndo.clear(s.id)
            }
          }}
          onDismiss={(i) => {
            const s = catUndo.snapshots[i]
            if (s) catUndo.clear(s.id)
          }}
        />
      ))}
    </div>
  )
}