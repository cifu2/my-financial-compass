import type { CSSProperties, HTMLAttributes } from 'react'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface LoadingSpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Accessible live text announced while the spinner is shown. */
  label?: string
  /** Visual size of the spinner. Defaults to 'md'. */
  size?: SpinnerSize
}

const DIMENSIONS: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 40,
}

/**
 * Accessible loading spinner for asynchronous operations.
 *
 * Renders a `role="status"` live region whose text is visually hidden, so
 * assistive technology announces the pending operation while the animated
 * ring stays out of the accessibility tree (SVG is `aria-hidden`).
 */
export function LoadingSpinner({
  label = 'Cargando…',
  size = 'md',
  className,
  style,
  ...rest
}: LoadingSpinnerProps) {
  const dimension = DIMENSIONS[size]
  const styles: CSSProperties = {
    width: dimension,
    height: dimension,
    ...style,
  }
  return (
    <span
      {...rest}
      className={`loading-spinner loading-spinner--${size}${
        className ? ` ${className}` : ''
      }`}
      role="status"
      style={styles}
    >
      <svg className="loading-spinner__ring" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle className="loading-spinner__track" cx="12" cy="12" r="9" />
        <circle className="loading-spinner__indicator" cx="12" cy="12" r="9" />
      </svg>
      <span className="visually-hidden">{label}</span>
    </span>
  )
}