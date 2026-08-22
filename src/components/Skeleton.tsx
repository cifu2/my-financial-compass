import type { CSSProperties } from 'react'

type SkeletonVariant = 'text' | 'rect' | 'circle'

interface SkeletonProps {
  variant?: SkeletonVariant
  className?: string
  width?: number | string
  height?: number | string
  style?: CSSProperties
}

/**
 * Low-level loading placeholder. Skeleton content is decorative, so it is
 * hidden from assistive technology (`aria-hidden`) — the container that owns
 * it (e.g. `role="status"`) carries the accessible loading description.
 */
export function Skeleton({
  variant = 'text',
  className,
  width,
  height,
  style,
}: SkeletonProps) {
  const styles: CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...style,
  }
  return (
    <span
      aria-hidden="true"
      className={`skeleton skeleton--${variant}${className ? ` ${className}` : ''}`}
      style={styles}
    />
  )
}

interface SkeletonTextProps {
  /** Number of placeholder lines. Defaults to 1. */
  lines?: number
  /** Width of a single-line skeleton (or the last line when lines > 1). */
  lineWidth?: number | string
}

/** A paragraph-shaped placeholder composed of one or more text lines. */
export function SkeletonText({ lines = 1, lineWidth = '100%' }: SkeletonTextProps) {
  return (
    <span className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="skeleton-text__line"
          width={i === lines - 1 && lines > 1 ? '60%' : lineWidth}
        />
      ))}
    </span>
  )
}

interface SkeletonTableProps {
  /** Number of body rows. Defaults to 3. */
  rows?: number
  /** Number of columns. Defaults to 4. */
  cols?: number
}

/** Table-shaped placeholder matching the `data-table` grid proportions. */
export function SkeletonTable({ rows = 3, cols = 4 }: SkeletonTableProps) {
  return (
    <div className="skeleton-table" aria-hidden="true" role="presentation">
      <div className="skeleton-table__row skeleton-table__row--head">
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton key={c} className="skeleton-table__cell" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="skeleton-table__row">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="skeleton-table__cell" />
          ))}
        </div>
      ))}
    </div>
  )
}