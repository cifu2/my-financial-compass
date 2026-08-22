import type { Category, CategoryType } from '../types'

/** Categories usable when registering a transaction of the given type. */
export function categoriesForType(
  categories: readonly Category[],
  type: CategoryType | '',
): Category[] {
  const active = categories.filter((c) => c.isActive)
  if (!type) return active
  if (type === 'both') return active.filter((c) => c.type !== 'both' || true)
  return active.filter((c) => c.type === type || c.type === 'both')
}

/** Categories usable as budget targets (expense/both only, active). */
export function categoriesForBudget(categories: readonly Category[]): Category[] {
  return categories.filter(
    (c) => c.isActive && (c.type === 'expense' || c.type === 'both'),
  )
}

/** Whether any stored transaction still references the category (blocks delete). */
export function categoryInUse(
  categoryId: string,
  transactions: readonly { categoryId: string }[],
): boolean {
  return transactions.some((t) => t.categoryId === categoryId)
}

/** Case-insensitive duplicate-name guard, ignoring `excludeId` when editing. */
export function duplicateName(
  categories: readonly Category[],
  name: string,
  excludeId?: string,
): boolean {
  const normalized = name.trim().toLocaleLowerCase()
  return categories.some(
    (c) => c.id !== excludeId && c.name.trim().toLocaleLowerCase() === normalized,
  )
}

/** Substring search (case + accent insensitive) over category names. */
export function filterByName(
  categories: readonly Category[],
  query: string,
): Category[] {
  const q = normalize(query)
  if (!q) return [...categories]
  return categories.filter((c) => normalize(c.name).includes(q))
}

function normalize(s: string): string {
  return s
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}