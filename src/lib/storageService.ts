import type { Budget } from '../features/budgeting/types'
import type { Category } from '../features/categories/types'
import type {
  Investment,
  InvestmentOwnership,
} from '../features/investments/types'
import type { RecurringTransaction } from '../features/recurring/types'
import type { Locale } from './dates'

export interface PersistedState {
  version: 1
  savedAt: string
  locale: Locale
  transactions: Transaction[]
  categories: Category[]
  investments: Investment[]
  investmentOwnerships: InvestmentOwnership[]
  budgets: Budget[]
  recurrings: RecurringTransaction[]
  /** Active budget context group id (null/absent = personal view, HU-0.8). */
  budgetGroupId?: string | null
}

export interface Transaction {
  id: string
  concept: string
  amount: number
  date: string
  type: 'income' | 'expense'
  categoryId: string
  isRecurring?: boolean
  recurringId?: string
  /** Group context this transaction belongs to (HU-0.8). */
  groupId?: string
  /** Owner user id; absent on legacy/demo rows (the viewer owns them). */
  userId?: string
}

/** Storage key. Bump this only when the shape breaks the on-disk format. */
export const STORAGE_KEY = 'my-financial-compass:v1'
/** Schema version stored inside the payload. */
export const STORAGE_VERSION = 1 as const

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

function asOptionalString(value: unknown): string | undefined {
  return isString(value) ? value : undefined
}

function transactionFrom(value: unknown): Transaction | null {
  if (!isRecord(value)) return null
  const { id, concept, amount, date, type, categoryId } = value
  if (
    !isString(id) ||
    !isString(concept) ||
    !isNumber(amount) ||
    !isString(date) ||
    (type !== 'income' && type !== 'expense') ||
    !isString(categoryId)
  ) {
    return null
  }
  return {
    id,
    concept,
    amount,
    date,
    type,
    categoryId,
    isRecurring: isBoolean(value.isRecurring) ? value.isRecurring : undefined,
    recurringId: asOptionalString(value.recurringId),
    groupId: asOptionalString(value.groupId),
    userId: asOptionalString(value.userId),
  }
}

function categoryFrom(value: unknown): Category | null {
  if (!isRecord(value)) return null
  const { id, name, type, isActive } = value
  if (!isString(id) || !isString(name)) return null
  if (type !== 'income' && type !== 'expense' && type !== 'both') return null
  return {
    id,
    name,
    type,
    isActive: isBoolean(isActive) ? isActive : true,
  }
}

function investmentFrom(value: unknown): Investment | null {
  if (!isRecord(value)) return null
  const { id, name, type, purchaseDate, quantity, investedAmount, currency } = value
  if (
    !isString(id) ||
    !isString(name) ||
    !isString(type) ||
    !isString(purchaseDate) ||
    !isNumber(quantity) ||
    !isNumber(investedAmount) ||
    !isString(currency)
  ) {
    return null
  }
  return {
    id,
    name,
    type: type as Investment['type'],
    purchaseDate,
    quantity,
    investedAmount,
    currency,
    ticker: asOptionalString(value.ticker),
    currentValue: numOrUndefined(value.currentValue),
    gainLoss: numOrUndefined(value.gainLoss),
    groupId: asOptionalString(value.groupId),
    createdBy: asOptionalString(value.createdBy),
  }
}

function investmentOwnershipFrom(value: unknown): InvestmentOwnership | null {
  if (!isRecord(value)) return null
  const { investmentId, userId, percentage } = value
  if (!isString(investmentId) || !isString(userId) || !isNumber(percentage)) return null
  return { investmentId, userId, percentage }
}

function numOrUndefined(value: unknown): number | undefined {
  return isNumber(value) ? value : undefined
}

function budgetFrom(value: unknown): Budget | null {
  if (!isRecord(value)) return null
  const { id, categoryId, limit, period, groupId } = value
  if (!isString(id) || !isString(categoryId) || !isNumber(limit)) return null
  return {
    id,
    categoryId,
    limit,
    period: period === 'monthly' ? 'monthly' : 'monthly',
    groupId: asOptionalString(groupId),
  }
}

function recurringFrom(value: unknown): RecurringTransaction | null {
  if (!isRecord(value)) return null
  const { id, frequency, startDate, nextExecution } = value
  const template = isRecord(value.template) ? value.template : null
  if (
    !isString(id) ||
    !isString(frequency) ||
    !isString(startDate) ||
    !isString(nextExecution) ||
    !template ||
    !isString(template.concept) ||
    !isNumber(template.amount) ||
    (template.type !== 'income' && template.type !== 'expense') ||
    !isString(template.categoryId)
  ) {
    return null
  }
  return {
    id,
    frequency: frequency as RecurringTransaction['frequency'],
    startDate,
    endDate: asOptionalString(value.endDate),
    nextExecution,
    isActive: isBoolean(value.isActive) ? value.isActive : true,
    template: {
      concept: template.concept,
      amount: template.amount,
      type: template.type,
      categoryId: template.categoryId,
    },
    executionDay: numOrUndefined(value.executionDay),
    groupId: asOptionalString(value.groupId),
    createdBy: asOptionalString(value.createdBy),
    exceptions: isRecord(value.exceptions)
      ? (value.exceptions as RecurringTransaction['exceptions'])
      : undefined,
  }
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Parse a persisted blob strictly. Returns `null` when the blob is not a
 * valid state object (corrupt or from an incompatible schema), so callers
 * can fall back to a default store without crashing.
 */
export function parsePersistedState(raw: string): PersistedState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return null

  const locale = parsed.locale === 'en' ? 'en' : 'es'
  const transactions = dropNulls(
    Array.isArray(parsed.transactions) ? parsed.transactions : [],
    transactionFrom,
  )
  const categories = dropNulls(
    Array.isArray(parsed.categories) ? parsed.categories : [],
    categoryFrom,
  )
  const investments = dropNulls(
    Array.isArray(parsed.investments) ? parsed.investments : [],
    investmentFrom,
  )
  const investmentOwnerships = dropNulls(
    Array.isArray(parsed.investmentOwnerships) ? parsed.investmentOwnerships : [],
    investmentOwnershipFrom,
  )
  const budgets = dropNulls(
    Array.isArray(parsed.budgets) ? parsed.budgets : [],
    budgetFrom,
  )
  const recurrings = dropNulls(
    Array.isArray(parsed.recurrings) ? parsed.recurrings : [],
    recurringFrom,
  )

  return {
    version: STORAGE_VERSION,
    savedAt: isString(parsed.savedAt) ? parsed.savedAt : new Date().toISOString(),
    locale,
    transactions,
    categories,
    investments,
    investmentOwnerships,
    budgets,
    recurrings,
    budgetGroupId: asOptionalString(parsed.budgetGroupId) ?? null,
  }
}

/** Map `values` through `from`, keeping only the entries that parsed. */
function dropNulls<T>(values: unknown[], from: (value: unknown) => T | null): T[] {
  const out: T[] = []
  for (const value of values) {
    const item = from(value)
    if (item !== null) out.push(item)
  }
  return out
}

/** Handles quota-exceeded and other write failures without throwing. */
export class StorageError extends Error {
  /** Underlying error that caused the write to fail. */
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'StorageError'
    this.cause = cause
  }
}

export function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyError = error as { name?: unknown; code?: unknown }
  return anyError.name === 'QuotaExceededError' || anyError.code === 22
}

/**
 * Load and parse the persisted state. Returns `null` when nothing has been
 * persisted yet or the payload is unreadable (corrupt / incompatible).
 * Never throws.
 */
export function loadPersistedState(): PersistedState | null {
  const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  return parsePersistedState(raw)
}

/**
 * Serialize and persist the full state snapshot. Returns a StorageError on
 * write failures (quota etc.); callers decide whether to surface it.
 */
export function savePersistedState(
  state: Omit<PersistedState, 'version' | 'savedAt'>,
): StorageError | null {
  const payload: PersistedState = {
    ...state,
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
  }
  try {
    if (typeof localStorage === 'undefined') return null
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return null
  } catch (error) {
    console.warn('[storage] no se pudo guardar el estado', error)
    return error instanceof Error ? new StorageError(error.message, error) : new StorageError('no se pudo guardar el estado', error)
  }
}


/** Remove persisted state (used by explicit reset actions). */
export function clearPersistedState(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}