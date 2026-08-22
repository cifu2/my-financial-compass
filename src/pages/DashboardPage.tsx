import { Page } from '../components/Page'

export default function DashboardPage() {
  return (
    <Page title="Dashboard">
      <div className="stack">
        <div className="panel panel--muted">
          <p className="text-muted mt-0">
            Summary of your finances will appear here: current balance, recent
            activity, and budget health.
          </p>
        </div>
        <div className="panel">
          <h2>Upcoming</h2>
          <p className="text-muted">
            Recent transactions, recurring payments, and budget progress will be
            surfaced on this screen.
          </p>
        </div>
      </div>
    </Page>
  )
}