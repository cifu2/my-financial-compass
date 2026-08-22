/**
 * Central error capture/reporting for My Financial Compass.
 *
 * Every crash inside the app funnels through `reportError`, which builds a
 * stable `CapturedError` record, keeps a bounded in-memory log, and forwards
 * it to listeners. This is the single integration point for a future
 * Sentry-style transport: `installGlobalErrorHandlers` and the React error
 * boundary both call into it.
 */

export interface CapturedError {
  /** Short unique id (idempotent within one capture). */
  id: string
  name: string
  message: string
  stack?: string
  /** Best-effort React render trace, supplied by error boundaries. */
  componentStack?: string
  occurredAt: string
}

export type ErrorListener = (error: CapturedError) => void

export const MAX_RECENT_ERRORS = 20

/** How many recent errors to keep in memory for debugging / clipboard. */
const recentErrors: CapturedError[] = []

const listeners = new Set<ErrorListener>()

let sequence = 0

function nextId(): string {
  sequence += 1
  return `err-${Date.now().toString(36)}-${sequence.toString(36)}`
}

function readableName(error: unknown): string {
  if (error instanceof Error && error.name) return error.name
  if (typeof error === 'string') return 'Error'
  if (typeof error === 'object' && error !== null) {
    const name = (error as { name?: unknown }).name
    if (typeof name === 'string' && name) return name
  }
  return 'Error'
}

function readableMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'Se ha producido un error inesperado'
}

function readableStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack
  return undefined
}

/**
 * Normalize any thrown value into a stable {@link CapturedError}. Never
 * throws — the whole point of this pipeline is to survive bad input.
 */
export function toCapturedError(error: unknown, componentStack?: string): CapturedError {
  return {
    id: nextId(),
    name: readableName(error),
    message: readableMessage(error),
    stack: readableStack(error),
    componentStack,
    occurredAt: new Date().toISOString(),
  }
}

/**
 * Primary capture path: builds the normalized record, logs it, keeps a
 * bounded in-memory copy, and fans it out to registered listeners. Returns
 * the normalized record so callers can surface the same snapshot in the UI.
 */
export function reportError(error: unknown, componentStack?: string): CapturedError {
  const captured = toCapturedError(error, componentStack)
  recentErrors.push(captured)
  if (recentErrors.length > MAX_RECENT_ERRORS) {
    recentErrors.shift()
  }
  // Log locally now; a future Sentry transport attaches via onError().
  console.error(`[my-financial-compass:error] ${captured.name}: ${captured.message}`, captured)
  for (const listener of [...listeners]) {
    listener(captured)
  }
  return captured
}

/** Snapshot of the most recent in-memory errors (oldest first). */
export function getRecentErrors(): readonly CapturedError[] {
  return recentErrors.slice()
}

/** Subscribe to every captured error. Returns an unsubscribe function. */
export function onError(listener: ErrorListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Clear the in-memory error log (used by tests and reset actions). */
export function clearErrorLog(): void {
  recentErrors.length = 0
}

/** Shape that async/global handlers normalize into before reporting. */
export interface ExternalErrorInfo {
  message: string
  source?: string
  lineno?: number
  colno?: number
  error?: unknown
}

/** A digestable single-line summary used for logging and screen copy. */
export function formatError(captured: CapturedError): string {
  const lines = [
    `id: ${captured.id}`,
    `name: ${captured.name}`,
    `message: ${captured.message}`,
  ]
  if (captured.stack) lines.push(`stack: ${captured.stack}`)
  if (captured.componentStack) lines.push(`componentStack: ${captured.componentStack}`)
  lines.push(`occurredAt: ${captured.occurredAt}`)
  return lines.join('\n')
}

/**
 * Report an error React never saw (window errors / unhandled rejections).
 * These are non-fatal for the running app but still worth logging.
 */
export function reportExternalError(info: ExternalErrorInfo): CapturedError {
  const raw = info.error
  let cause: unknown = raw
  if (
    !(raw instanceof Error) &&
    typeof raw !== 'string' &&
    !(typeof raw === 'object' && raw !== null && typeof (raw as { message?: unknown }).message === 'string')
  ) {
    const location = [info.source, info.lineno !== undefined ? `:${info.lineno}` : '']
      .filter(Boolean)
      .join('')
    cause = new Error(`${info.message}${location ? ` (${location})` : ''}`)
  }
  return reportError(cause)
}

/** Remove all listeners and the in-memory log (primarily for tests). */
export function resetErrorReporting(): void {
  listeners.clear()
  recentErrors.length = 0
}

/**
 * Install global handlers for errors that escape React's lifetime
 * (`window.onerror`, unhandled promise rejections). Returns a cleanup
 * function so tests / hot reloads can remove them.
 */
export function installGlobalErrorHandlers(): () => void {
  const onGlobalError = (event: ErrorEvent) => {
    reportExternalError({
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    })
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    reportExternalError({
      message: 'Unhandled promise rejection',
      error: event.reason,
    })
  }

  window.addEventListener('error', onGlobalError)
  window.addEventListener('unhandledrejection', onRejection)

  return () => {
    window.removeEventListener('error', onGlobalError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}