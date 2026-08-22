import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError, toCapturedError, type CapturedError } from '../lib/errorReporting'
import { ErrorScreen } from './ErrorScreen'

export interface ErrorBoundaryStrings {
  title: string
  message: string
  retryLabel: string
  restartLabel: string
  reportLabel: string
  reportCopiedLabel: string
  detailsLabel: string
}

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Localized strings rendered inside the fallback screen. */
  strings: ErrorBoundaryStrings
  /** Called whenever an error is captured (after logging). */
  onError?: (error: CapturedError) => void
}

interface ErrorBoundaryState {
  error: CapturedError | null
  /** Bumped on each retry so the failing subtree remounts fresh. */
  attempt: number
}

/**
 * Global React error boundary. Renders children untouched; if any descendant
 * throws during render, lifecycle methods, or construction, it captures the
 * error (funnelling it into the shared error-reporting pipeline), records it,
 * and swaps the subtree for a friendly recovery screen instead of letting the
 * error blank the whole app. Users can retry (remounts the subtree from fresh
 * state) or restart the app entirely; logging is centralized for a future
 * Sentry transport.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, attempt: 0 }

  static getDerivedStateFromError(error: unknown): Pick<ErrorBoundaryState, 'error'> {
    return { error: toCapturedError(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const captured = reportError(error, info.componentStack ?? undefined)
    this.props.onError?.(captured)
  }

  /** Try to remount the crashed subtree from a clean slate. */
  handleRetry = (): void => {
    this.setState((prev) => ({ error: null, attempt: prev.attempt + 1 }))
  }

  /** Hard recovery: a fresh page load gets back to a known-good state. */
  handleRestart = (): void => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          error={this.state.error}
          strings={this.props.strings}
          onRetry={this.handleRetry}
          onRestart={this.handleRestart}
        />
      )
    }
    // Keying by attempt guarantees the crashed branch is fully unmounted and
    // remounted on retry, clearing any half-broken internal state.
    return (
      <div key={this.state.attempt} className="error-boundary__children">
        {this.props.children}
      </div>
    )
  }
}