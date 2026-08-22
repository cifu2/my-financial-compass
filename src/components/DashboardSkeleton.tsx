import { Skeleton, SkeletonTable, SkeletonText } from './Skeleton'

interface DashboardSkeletonProps {
  /** Accessible live text describing the pending dashboard load. */
  label?: string
}

/**
 * Skeleton screen for the initial dashboard load.
 *
 * Mirrors the exact structure of `<DashboardPage />` (toolbar, KPI cards,
 * two-column grid, monthly history) so the replacement is seamless and the
 * layout does not jump once real data arrives. All inner placeholders are
 * `aria-hidden`; the container is a `role="status"` live region that
 * announces `label` to assistive technology.
 */
export function DashboardSkeleton({
  label = 'Cargando el panel de control…',
}: DashboardSkeletonProps) {
  return (
    <section
      className="dashboard-skeleton"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="visually-hidden">{label}</span>

      <Skeleton className="dash-skel__title" width="min(280px, 60%)" height={30} />

      <div className="dash-skel__toolbar">
        <div>
          <div className="section-indicator">
            <Skeleton width={96} height={12} />
          </div>
          <Skeleton className="dash-skel__month" width={140} height={20} />
        </div>
        <div className="dash-skel__select">
          <Skeleton width="100%" height={40} variant="rect" />
        </div>
      </div>

      <div className="summary-cards" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="panel">
            <Skeleton className="dash-skel__card-label" width={70} height={14} />
            <Skeleton className="dash-skel__card-value" width={140} height={26} />
            <Skeleton className="dash-skel__card-delta" width={100} height={12} />
          </div>
        ))}
      </div>

      <div className="dash-grid" aria-hidden="true">
        <div className="stack dash-grid__main">
          <section className="panel">
            <Skeleton className="dash-skel__pane-heading" width={200} height={22} />
            <SkeletonTable rows={4} cols={2} />
          </section>
          <section className="panel">
            <Skeleton className="dash-skel__pane-heading" width={190} height={22} />
            <SkeletonTable rows={3} cols={4} />
          </section>
        </div>

        <div className="stack dash-grid__side">
          <section className="panel">
            <Skeleton className="dash-skel__pane-heading" width={140} height={22} />
            <div className="dash-skel__terms">
              {[0, 1].map((i) => (
                <div key={i} className="networth__term">
                  <Skeleton width="70%" height={12} />
                  <Skeleton className="dash-skel__term-value" width="80%" height={20} />
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <Skeleton className="dash-skel__pane-heading" width={170} height={22} />
            <div className="dash-skel__bars">
              {[0, 1, 2].map((i) => (
                <div key={i} className="dash-skel__bar-row">
                  <SkeletonText lines={1} lineWidth="55%" />
                  <Skeleton className="dash-skel__bar" width="100%" height={12} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="panel" aria-hidden="true">
        <Skeleton className="dash-skel__pane-heading" width={190} height={22} />
        <SkeletonTable rows={4} cols={4} />
      </section>
    </section>
  )
}