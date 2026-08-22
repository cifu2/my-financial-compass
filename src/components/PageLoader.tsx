import { LoadingSpinner } from './LoadingSpinner'

interface PageLoaderProps {
  /** Accessible live text announced while the route chunk loads. */
  label?: string
}

/**
 * Suspense fallback shown while a lazily-loaded route chunk is fetched.
 * Keeps a solid, accessible placeholder (centered spinner) in place of the
 * page area so navigation never flashes a blank viewport.
 */
export function PageLoader({ label = 'Cargando…' }: PageLoaderProps) {
  return (
    <div className="page-loader panel panel--muted" role="status">
      <LoadingSpinner size="lg" label={label} />
    </div>
  )
}