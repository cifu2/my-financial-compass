import { ROUTES, hrefFor, type Route } from '../router'

interface MainNavProps {
  current: Route
  onNavigate?: (route: Route) => void
}

/**
 * Primary navigation, reachable from every screen. Links stay in the same
 * keyboard tab order, expose a visible focus ring, and mark the active
 * section with aria-current="page".
 */
export function MainNav({ current, onNavigate }: MainNavProps) {
  const sections = ROUTES.filter((route) => !route.path.includes(':'))
  return (
    <nav className="main-nav" aria-label="Main navigation">
      <ul>
        {sections.map((route) => {
          const active = route.key === current.key
          const classes = `nav-item${active ? ' nav-item--active' : ''}`
          return (
            <li key={route.key}>
              <a
                className={classes}
                href={hrefFor(route)}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate?.(route)}
              >
                {route.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}