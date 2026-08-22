import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorScreen } from './ErrorScreen'
import type { ErrorBoundaryStrings } from './ErrorBoundary'
import { toCapturedError, clearErrorLog } from '../lib/errorReporting'

const STRINGS: ErrorBoundaryStrings = {
  title: 'Something went wrong',
  message: 'The app ran into an unexpected problem.',
  retryLabel: 'Try again',
  restartLabel: 'Restart the app',
  reportLabel: 'Copy error report',
  reportCopiedLabel: 'Report copied',
  detailsLabel: 'View technical details',
}

function renderScreen() {
  return render(
    <ErrorScreen
      error={toCapturedError(new Error('copy me'))}
      strings={STRINGS}
      onRetry={vi.fn()}
      onRestart={vi.fn()}
    />,
  )
}

describe('ErrorScreen', () => {
  beforeEach(() => clearErrorLog())
  afterEach(() => clearErrorLog())

  it('exposes the error id to aid support', () => {
    const { container } = renderScreen()
    expect(container.textContent).toContain('ID:')
  })

  it('copies the formatted report to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: STRINGS.reportLabel }))
    await screen.findByText(STRINGS.reportCopiedLabel)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('copy me')
  })

  it('reveals technical details inside a disclosure', () => {
    renderScreen()
    expect(screen.getByText(STRINGS.detailsLabel)).toBeInTheDocument()
    const details = document.querySelector('details')
    expect(details).not.toBeNull()
  })
})