import { Page } from '../components/Page'

export default function RecurringPage() {
  return (
    <Page title="Recurring">
      <div className="stack">
        <div className="panel panel--muted">
          <p className="text-muted mt-0">
            Manage recurring transactions: subscriptions, salaries, and
            scheduled bills.
          </p>
        </div>
        <div className="panel">
          <h2>Upcoming recurring payments</h2>
          <p className="text-muted">
            The recurring transactions list will be rendered here.
          </p>
        </div>
      </div>
    </Page>
  )
}