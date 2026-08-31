import type { Route } from '../router'

interface BreadcrumbProps {
  route: Route
  section?: string
  homeLabel?: string
  sectionLabel?: string
}

/**
 * Breadcrumb + section indicator so users always know where they are.
 * Renders as a proper ARIA breadcrumb with a current-page marker.
 */
export function Breadcrumb({ route, section, homeLabel, sectionLabel }: BreadcrumbProps) {
  const crumbLabel = section ?? route.crumb
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>
          <a href="#/">{homeLabel ?? 'Home'}</a>
        </li>
        <li>
          <span aria-current="page">{crumbLabel}</span>
        </li>
      </ol>
      <p className="section-indicator mt-0" aria-live="polite">
        {sectionLabel ?? 'Section'}: {crumbLabel}
      </p>
    </nav>
  )
}