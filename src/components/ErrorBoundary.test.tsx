import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, type ErrorBoundaryStrings } from './ErrorBoundary'
import {
  clearErrorLog,
  getRecentErrors,
  installGlobalErrorHandlers,
  onError,
  reportError,
  toCapturedError,
  resetErrorReporting,
  formatError,
} from '../lib/errorReporting'

const STRINGS: ErrorBoundaryStrings = {
  title: 'Something went wrong',
  message: 'The app ran into an unexpected problem.',
  retryLabel: 'Try again',
  restartLabel: 'Restart the app',
  reportLabel: 'Copy error report',
  reportCopiedLabel: 'Report copied',
  detailsLabel: 'View technical details',
}

/** Throws during render while `shouldThrow` is true, otherwise renders fine. */
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('kaboom')
  }
  return <p>all good</p>
}

function Probe({ shouldThrow }: { shouldThrow: boolean }) {
  return (
    <ErrorBoundary strings={STRINGS}>
      <Bomb shouldThrow={shouldThrow} />
    </ErrorBoundary>
  )
}

function renderProbe(shouldThrow: boolean) {
  const view = render(<Probe shouldThrow={shouldThrow} />)
  return { ...view, setShouldThrow: (value: boolean) => view.rerender(<Probe shouldThrow={value} />) }
}

describe('ErrorBoundary', () => {
  beforeEach(() => clearErrorLog())
  afterEach(() => clearErrorLog())

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary strings={STRINGS}>
        <p>hello world</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('hello world')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('swaps the subtree for a friendly error screen on a render error', () => {
    renderProbe(true)
    // The error is announced to assistive tech via role="alert".
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(STRINGS.title)).toBeInTheDocument()
    expect(screen.getByText(STRINGS.message)).toBeInTheDocument()
    // Recovery options are keyboard-operable buttons.
    expect(screen.getByRole('button', { name: STRINGS.retryLabel })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: STRINGS.restartLabel })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: STRINGS.reportLabel })).toBeInTheDocument()
  })

  it('logs the error into the shared reporting pipeline', () => {
    renderProbe(true)
    const recent = getRecentErrors()
    expect(recent.length).toBeGreaterThan(0)
    expect(recent[recent.length - 1].message).toBe('kaboom')
  })

  it('notifies the onError callback with the captured snapshot', () => {
    const onCrash = vi.fn()
    render(
      <ErrorBoundary strings={STRINGS} onError={onCrash}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )
    expect(onCrash).toHaveBeenCalledTimes(1)
    expect(onCrash.mock.calls[0][0]).toMatchObject({ name: 'Error', message: 'kaboom' })
  })

  it('recovers when the retry remounts a healthy subtree', () => {
    const { setShouldThrow } = renderProbe(true)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // The underlying cause is fixed; the user clicks Retry.
    setShouldThrow(false)
    fireEvent.click(screen.getByRole('button', { name: STRINGS.retryLabel }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('keeps the fallback if retrying while the cause persists', () => {
    const { setShouldThrow } = renderProbe(true)
    fireEvent.click(screen.getByRole('button', { name: STRINGS.retryLabel }))
    setShouldThrow(true)
    // Retrying again with the same broken child keeps the safe screen.
    fireEvent.click(screen.getByRole('button', { name: STRINGS.retryLabel }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('error reporting', () => {
  beforeEach(() => clearErrorLog())
  afterEach(() => clearErrorLog())

  it('builds a normalized snapshot from any thrown value', () => {
    const captured = toCapturedError(new TypeError('bad type'))
    expect(captured.name).toBe('TypeError')
    expect(captured.message).toBe('bad type')
    expect(captured.id).toMatch(/^err-/)
    expect(captured.occurredAt).toBeTruthy()
  })

  it('handles non-Error values without throwing', () => {
    expect(() => reportError('string error')).not.toThrow()
    expect(() => reportError({ code: 7 })).not.toThrow()
    expect(() => reportError(null)).not.toThrow()
  })

  it('keeps a bounded log of recent errors', () => {
    for (let i = 0; i < 30; i += 1) reportError(new Error(`err ${i}`))
    const recent = getRecentErrors()
    expect(recent.length).toBeLessThanOrEqual(20)
    expect(recent[recent.length - 1].message).toBe('err 29')
  })

  it('notifies subscribers via onError and stops after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = onError(listener)
    reportError(new Error('notify me'))
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    reportError(new Error('after unsub'))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('formats a report containing the key fields', () => {
    const captured = toCapturedError(new Error('formatted'), '<StackHere />')
    const text = formatError(captured)
    expect(text).toContain('formatted')
    expect(text).toContain('<StackHere />')
    expect(text).toContain('occurredAt:')
  })
})

describe('global error handlers', () => {
  let unbind: () => void

  beforeEach(() => {
    clearErrorLog()
    unbind = installGlobalErrorHandlers()
  })
  afterEach(() => {
    unbind()
    resetErrorReporting()
  })

  it('captures unhandled promise rejections', () => {
    const reason = new Error('async boom')
    const event = new Event('unhandledrejection') as unknown as PromiseRejectionEvent
    Object.defineProperty(event, 'reason', { value: reason })
    window.dispatchEvent(event)
    const recent = getRecentErrors()
    expect(recent.length).toBe(1)
    expect(recent[0].message).toBe('async boom')
  })

  it('captures window errors with their message', () => {
    const event = new ErrorEvent('error', { message: 'sync blew up' })
    window.dispatchEvent(event)
    const recent = getRecentErrors()
    expect(recent.length).toBe(1)
    expect(recent[0].message).toContain('sync blew up')
  })

  it('removes handlers on cleanup', () => {
    unbind()
    window.dispatchEvent(new ErrorEvent('error', { message: 'after removal' }))
    expect(getRecentErrors()).toHaveLength(0)
  })
})