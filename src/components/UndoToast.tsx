import type { UndoSnapshot } from '../hooks/useUndo'

export interface UndoToastProps<T> {
  entry: UndoSnapshot<T>
  index: number
  title: string
  actionLabel: string
  dismissLabel: string
  onUndo: (index: number) => void
  onDismiss: (index: number) => void
}

export function UndoToast<T>({
  entry,
  index,
  title,
  actionLabel,
  dismissLabel,
  onUndo,
  onDismiss,
}: UndoToastProps<T>) {
  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast-text">
        <strong>{title}:</strong> {entry.label}
      </span>
      <span className="undo-toast-buttons">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onUndo(index)}
        >
          {actionLabel}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          aria-label={dismissLabel}
          onClick={() => onDismiss(index)}
        >
          ×
        </button>
      </span>
    </div>
  )
}
