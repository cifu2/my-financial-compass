import { useEffect, useState } from 'react'

export type SectionKey =
  | 'dashboard'
  | 'transactions'
  | 'recurring'
  | 'budgets'
  | 'investments'
  | 'balances'
  | 'groupActivity'
  | 'settings'

/** Guest-only auth screens (outside the main nav). */
export type AuthKey = 'login' | 'register' | 'forgot-password'

export type RouteKey = SectionKey | AuthKey

export interface Route {
  key: RouteKey
  path: string
  label: string
  crumb: string
  /** Route params captured from a dynamic path (e.g. the group id). */
  params?: Record<string, string>
}

export const ROUTES: Route[] = [
  { key: 'dashboard', path: '/', label: 'Dashboard', crumb: 'Dashboard' },
  { key: 'transactions', path: '/transactions', label: 'Transactions', crumb: 'Transactions' },
  { key: 'recurring', path: '/recurring', label: 'Recurring', crumb: 'Recurring' },
  { key: 'budgets', path: '/budgets', label: 'Budgets', crumb: 'Budgets' },
  { key: 'investments', path: '/investments', label: 'Investments', crumb: 'Investments' },
  { key: 'balances', path: '/balances', label: 'Balances', crumb: 'Balances' },
  { key: 'groupActivity', path: '/grupos/:grupoId/actividad', label: 'Actividad del grupo', crumb: 'Actividad' },
  { key: 'settings', path: '/settings', label: 'Settings', crumb: 'Settings' },
]

export const AUTH_ROUTES: ReadonlyArray<Pick<Route, 'key' | 'path'>> = [
  { key: 'login', path: '/login' },
  { key: 'register', path: '/register' },
  { key: 'forgot-password', path: '/forgot-password' },
]

export function isAuthKey(key: RouteKey): key is AuthKey {
  return key === 'login' || key === 'register' || key === 'forgot-password'
}

export const DEFAULT_ROUTE: Route = ROUTES[0]

export function hrefFor(route: Route): string {
  return `#${route.path}`
}

function readPath(): string {
  const raw = window.location.hash.replace(/^#/, '')
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function matchRoute(path: string): Route {
  const normalized = path.split('?')[0].replace(/\/+$/, '') || '/'
  const section = ROUTES.find((r) => r.path === normalized)
  if (section) return section
  const auth = AUTH_ROUTES.find((r) => r.path === normalized)
  if (auth) return { key: auth.key, path: normalized, label: auth.key, crumb: auth.key }
  const dynamic = ROUTES.find((r) => r.path.includes(':'))
  if (dynamic) {
    const segments = dynamic.path.split('/').filter(Boolean)
    const parts = normalized.split('/').filter(Boolean)
    if (segments.length === parts.length) {
      const params: Record<string, string> = {}
      let matches = true
      for (let i = 0; i < segments.length; i += 1) {
        if (segments[i].startsWith(':')) params[segments[i].slice(1)] = parts[i]
        else if (segments[i] !== parts[i]) matches = false
      }
      if (matches) return { ...dynamic, params }
    }
  }
  return DEFAULT_ROUTE
}

/** Hash href for a group's activity screen. */
export function groupActivityHref(groupId: string): string {
  return `#/grupos/${encodeURIComponent(groupId)}/actividad`
}

export function useRoute(): { route: Route; navigate: (route: Route) => void } {
  const [route, setRoute] = useState<Route>(() => matchRoute(readPath()))

  useEffect(() => {
    const onHashChange = () => setRoute(matchRoute(readPath()))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return {
    route,
    navigate: (next: Route) => {
      if (next.key === route.key) return
      window.location.hash = next.path
    },
  }
}