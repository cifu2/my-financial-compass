import { useEffect, useRef } from 'react'

export interface ConfirmStrings {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}

export interface ConfirmDialogProps {
  open: boolean
  strings: ConfirmStrings
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  strings,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    confirmRef.current?.focus()
    return () => {
      previousFocus.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Tab') {
        const focusables =
          document.querySelectorAll<HTMLElement>(
            '#confirm-dialog button, #confirm-dialog a[href], #confirm-dialog [tabindex]:not([tabindex="-1"])',
          )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        id="confirm-dialog"
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog-title">
          {strings.title}
        </h2>
        <p id="confirm-dialog-message" className="confirm-dialog-message">
          {strings.message}
        </p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onCancel}
            autoFocus={false}
          >
            {strings.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
          >
            {strings.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}