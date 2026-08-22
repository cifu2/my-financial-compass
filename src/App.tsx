import { lazy, Suspense, type ReactNode } from 'react'
import { AppStateProvider, useAppState } from './state/AppState'
import { MainNav } from './components/MainNav'
import { Breadcrumb } from './components/Breadcrumb'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { PageLoader } from './components/PageLoader'
import { ErrorBoundary, type ErrorBoundaryStrings } from './components/ErrorBoundary'
import { useRoute, type Route } from './router'
import { translate, type UIKey } from './lib/i18n'
import type { Locale } from './lib/dates'
import DashboardPage from './pages/DashboardPage'
import './index.css'

// Route-level code splitting: every secondary page lives in its own chunk
// (loaded on demand) so the initial route only ships the shell + dashboard.
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'))
const RecurringPage = lazy(() => import('./pages/RecurringPage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const InvestmentsPage = lazy(() => import('./pages/InvestmentsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function CurrentPage({ route }: { route: Route }) {
  return (
    <>
      {route.key === 'transactions' ? <TransactionsPage /> : null}
      {route.key === 'recurring' ? <RecurringPage /> : null}
      {route.key === 'budgets' ? <BudgetsPage /> : null}
      {route.key === 'investments' ? <InvestmentsPage /> : null}
      {route.key === 'settings' ? <SettingsPage /> : null}
      {route.key === 'dashboard' ? <DashboardPage /> : null}
    </>
  )
}

function errorBoundaryStrings(locale: Locale): ErrorBoundaryStrings {
  const t = (key: UIKey): string => translate(locale, key)
  return {
    title: t('error.title'),
    message: t('error.message'),
    retryLabel: t('error.retry'),
    restartLabel: t('error.restart'),
    reportLabel: t('error.reportLabel'),
    reportCopiedLabel: t('error.reportCopiedLabel'),
    detailsLabel: t('error.detailsLabel'),
  }
}

function AppShell() {
  const { route, navigate } = useRoute()
  const { locale, isBooting } = useAppState()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href="#/">
            My Financial Compass
          </a>
          <MainNav current={route} onNavigate={navigate} />
        </div>
      </header>
      <main className="app-main" id="content">
        <Breadcrumb route={route} />
        {isBooting ? (
          <DashboardSkeleton label={translate(locale, 'loading.dashboard')} />
        ) : (
          <Suspense fallback={<PageLoader label={translate(locale, 'loading.pleaseWait')} />}>
            <CurrentPage route={route} />
          </Suspense>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AppStateProvider>
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
    </AppStateProvider>
  )
}

/** Locale-aware global error boundary wrapping all page content. */
function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { locale } = useAppState()
  return (
    <ErrorBoundary strings={errorBoundaryStrings(locale)}>{children}</ErrorBoundary>
  )
}

export default App