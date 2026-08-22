import { type ReactNode } from 'react'
import { AppStateProvider, useAppState } from './state/AppState'
import { MainNav } from './components/MainNav'
import { Breadcrumb } from './components/Breadcrumb'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { ErrorBoundary, type ErrorBoundaryStrings } from './components/ErrorBoundary'
import { useRoute, type Route } from './router'
import { translate, type UIKey } from './lib/i18n'
import type { Locale } from './lib/dates'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import RecurringPage from './pages/RecurringPage'
import BudgetsPage from './pages/BudgetsPage'
import InvestmentsPage from './pages/InvestmentsPage'
import SettingsPage from './pages/SettingsPage'
import './index.css'

function CurrentPage({ route }: { route: Route }) {
  if (route.key === 'transactions') return <TransactionsPage />
  if (route.key === 'recurring') return <RecurringPage />
  if (route.key === 'budgets') return <BudgetsPage />
  if (route.key === 'investments') return <InvestmentsPage />
  if (route.key === 'settings') return <SettingsPage />
  return <DashboardPage />
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
          <CurrentPage route={route} />
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