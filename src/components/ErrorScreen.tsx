import { useRef, useState } from 'react'
import { formatError, type CapturedError } from '../lib/errorReporting'
import type { ErrorBoundaryStrings } from './ErrorBoundary'

export interface ErrorScreenProps {
  error: CapturedError
  strings: ErrorBoundaryStrings
  onRetry: () => void
  onRestart: () => void
}

/**
 * Friendly, accessible recovery screen shown after a fatal render error.
 * Keyboard operable (plain buttons), announces the failure via a live region,
 * and lets the user report details, retry, or fully restart the app.
 */
export function ErrorScreen({ error, strings, onRetry, onRestart }: ErrorScreenProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | undefined>(undefined)

  const handleCopy = async () => {
    const text = formatError(error)
    let ok = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        ok = true
      }
    } catch {
      ok = false
    }
    if (!ok) {
      // Clipboard API unavailable: select the details block so the user can
      // copy manually, and surface an explicit hint instead of failing.
      window.clearTimeout(copiedTimer.current)
      setCopied(false)
      document.getElementById('error-report-details')?.focus()
      return
    }
    setCopied(true)
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="error-screen" role="alert" aria-live="assertive">
      <div className="error-screen__card panel">
        <div className="error-screen__icon" aria-hidden="true">
          !
        </div>
        <h1 className="error-screen__title">{strings.title}</h1>
        <p className="error-screen__message">{strings.message}</p>

        <p className="error-screen__id">
          <span className="text-note">ID: {error.id}</span>
        </p>

        <details className="error-screen__details">
          <summary id="error-report-details">{strings.detailsLabel}</summary>
          <pre className="error-screen__stack" tabIndex={-1}>
            {formatError(error)}
          </pre>
        </details>

        <div className="error-screen__actions">
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            {strings.retryLabel}
          </button>
          <button type="button" className="btn btn--secondary" onClick={onRestart}>
            {strings.restartLabel}
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleCopy}>
            {copied ? strings.reportCopiedLabel : strings.reportLabel}
          </button>
        </div>
      </div>
    </div>
  )
}