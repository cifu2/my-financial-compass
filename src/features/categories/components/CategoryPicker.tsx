import { useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { FormField } from '../../../components/FormField'
import type { Category } from '../types'
import { filterByName } from '../services/categoryService'
import { translate, type UIKey } from '../../../lib/i18n'

export interface CategoryPickerProps {
  label: string
  name: string
  required?: boolean
  hint?: string
  error?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  /** Active categories scoped to the current transaction type. */
  categories: readonly Category[]
  locale: 'es' | 'en'
  /** Above this many options the picker becomes searchable. */
  threshold?: number
}

/**
 * Category selector. With few options it renders a plain native select; above
 * the threshold it becomes an accessible searchable combobox (type to filter,
 * ArrowUp/Down to move, Enter to pick, Escape to close).
 */
export function CategoryPicker(props: CategoryPickerProps) {
  const searchable = props.categories.length > (props.threshold ?? 10)
  return searchable ? <SearchableSelect {...props} /> : <NativeSelect {...props} />
}

/* ------------------------------------------------------------------ */

function NativeSelect({
  label, name, required, hint, error, value, onChange, onBlur, categories,
}: CategoryPickerProps) {
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      {({ id, ariaDescribedBy, ariaInvalid }) => (
        <select
          id={id}
          name={name}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </FormField>
  )
}

/* ------------------------------------------------------------------ */

function SearchableSelect({
  label, name, required, hint, error, value, onChange, onBlur, categories, locale,
}: CategoryPickerProps) {
  const t = (key: UIKey) => translate(locale, key)
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = categories.find((c) => c.id === value) ?? null
  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const results = useMemo(
    () => filterByName(categories, query),
    [categories, query],
  )
  const activeDescendant = open && results[highlight] ? `${listboxId}-${results[highlight].id}` : undefined

  function select(id: string) {
    const cat = categories.find((c) => c.id === id)
    onChange(id)
    setQuery(cat?.name ?? '')
    setOpen(false)
    inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) {
          setQuery('')
          setHighlight(0)
          setOpen(true)
        } else {
          setHighlight((h) => (h + 1) % results.length)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) setHighlight((h) => (h - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        if (open && results[highlight]) select(results[highlight].id)
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setQuery(selected?.name ?? '')
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      {({ id, ariaDescribedBy, ariaInvalid }) => (
        <div className="category-picker">
          <input
            ref={inputRef}
            id={id}
            name={name}
            required={required}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            aria-haspopup="listbox"
            autoComplete="off"
            value={query}
            placeholder="—"
            onFocus={() => {
              setOpen(true)
              setQuery('')
            }}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setHighlight(0)
            }}
            onBlur={() => {
              setOpen(false)
              setQuery(selected?.name ?? '')
              onBlur?.()
            }}
            onKeyDown={onKeyDown}
          />
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className={`category-picker__list${open ? ' is-open' : ''}`}
          >
            {results.length === 0 ? (
              <li role="option" aria-disabled="true" className="category-picker__empty">
                {t('category.noResults')}
              </li>
            ) : (
              results.map((c, index) => (
                <li
                  key={c.id}
                  id={`${listboxId}-${c.id}`}
                  role="option"
                  aria-selected={c.id === value}
                  className={`category-picker__option${
                    index === highlight ? ' is-highlighted' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    select(c.id)
                  }}
                >
                  {c.name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </FormField>
  )
}