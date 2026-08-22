import { AppStateProvider } from './state/AppState'
import { MainNav } from './components/MainNav'
import { Breadcrumb } from './components/Breadcrumb'
import { useRoute } from './router'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import RecurringPage from './pages/RecurringPage'
import BudgetsPage from './pages/BudgetsPage'
import InvestmentsPage from './pages/InvestmentsPage'
import SettingsPage from './pages/SettingsPage'
import './index.css'

function App() {
  const { route, navigate } = useRoute()
  return (
    <AppStateProvider>
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
          {route.key === 'dashboard' && <DashboardPage />}
          {route.key === 'transactions' && <TransactionsPage />}
          {route.key === 'recurring' && <RecurringPage />}
          {route.key === 'budgets' && <BudgetsPage />}
          {route.key === 'investments' && <InvestmentsPage />}
          {route.key === 'settings' && <SettingsPage />}
        </main>
      </div>
    </AppStateProvider>
  )
}

export default App