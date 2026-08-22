import { useCallback, useMemo, useState } from 'react'
import { Page } from '../components/Page'
import { SelectField } from '../components/FormField'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAppState, DEMO_LOAD_DELAY_MS } from '../state/AppState'
import { monthLabel } from '../lib/dates'
import { translate, type UIKey } from '../lib/i18n'
import { buildBudgetRows } from '../features/budgeting/services/budgetCalculator'
import type { SpendingInput } from '../features/budgeting/services/budgetCalculator'
import { groupBudgetOptions } from '../features/budgeting/services/budgetScope'
import { readSessionUser } from '../features/auth/services/authService'
import { SummaryCards, type SummaryMetric } from '../features/dashboard/components/SummaryCards'
import { ExpenseBreakdown } from '../features/dashboard/components/ExpenseBreakdown'
import { RecentTransactions } from '../features/dashboard/components/RecentTransactions'
import { BudgetSnapshot } from '../features/dashboard/components/BudgetSnapshot'
import { NetWorthPanel } from '../features/dashboard/components/NetWorthPanel'
import { MonthlyHistoryView, type MonthlyHistoryRow } from '../features/dashboard/components/MonthlyHistoryView'
import {
  latestMonth,
  monthTotals,
  monthsAvailable,
  contextNetWorth,
  contextNetWorthItems,
  percentageChange,
  previousMonthKey,
  recentTransactions,
  summarizeMonth,
} from '../features/dashboard/services/dashboard'
import { getRates } from '../features/dashboard/services/currency'
import { scopeCurrency as investmentContextCurrency } from '../features/investments/services/investmentGroupContext'
import { useAppCurrency } from '../features/auth/state/AuthContext'

export default function DashboardPage() {
  const { locale, store, loadDemo } = useAppState()
  const primaryCurrency = useAppCurrency()
  const t = useCallback((key: UIKey) => translate(locale, key), [locale])

  const [demoLoading, setDemoLoading] = useState(false)

  const handleLoadDemo = useCallback(async () => {
    if (demoLoading) return
    setDemoLoading(true)
    // Yield so the spinner paints before swapping in the dataset.
    await new Promise((resolve) => window.setTimeout(resolve, DEMO_LOAD_DELAY_MS))
    loadDemo()
    setDemoLoading(false)
  }, [demoLoading, loadDemo])

  const { transactions, categories, investments, budgets } = store

  const months = useMemo(() => monthsAvailable(transactions), [transactions])
  const [pickedMonth, setPickedMonth] = useState<string>(() => latestMonth(transactions))
  const displayMonth = months.includes(pickedMonth) ? pickedMonth : latestMonth(transactions)

  const summary = useMemo(
    () => summarizeMonth(transactions, displayMonth, categories),
    [transactions, displayMonth, categories],
  )

  const prevMonth = previousMonthKey(displayMonth)
  const prevTotals = useMemo(
    () => monthTotals(transactions, prevMonth),
    [transactions, prevMonth],
  )

  const metrics: SummaryMetric[] = useMemo(
    () => [
      {
        key: 'income',
        label: t('dash.income'),
        value: summary.totalIncome,
        comparison: percentageChange(summary.totalIncome, prevTotals.income),
      },
      {
        key: 'expenses',
        label: t('dash.expenses'),
        value: summary.totalExpenses,
        comparison: percentageChange(summary.totalExpenses, prevTotals.expenses),
      },
      {
        key: 'cashFlow',
        label: t('dash.cashFlow'),
        value: summary.cashFlow,
        comparison: percentageChange(summary.cashFlow, prevTotals.cashFlow),
      },
    ],
    [summary, prevTotals, t],
  )

  const recent = useMemo(
    () => recentTransactions(transactions, 8),
    [transactions],
  )

  const categoryNameFor = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? null
  }, [categories])

  const expenseInputs: SpendingInput[] = useMemo(
    () =>
      transactions
        .filter((tr) => tr.type === 'expense')
        .map((tr) => ({
          amount: tr.amount,
          date: tr.date,
          categoryId: tr.categoryId,
          userId: tr.userId,
          groupId: tr.groupId,
        })),
    [transactions],
  )

  // HU-0.8: the dashboard budget snapshot follows the active context chosen in
  // the budget module (personal vs group), aggregating the whole group's spend.
  const budgetContext = useMemo(
    () =>
      ({
        kind: store.budgetGroupId ? 'group' : 'personal',
        groupId: store.budgetGroupId ?? null,
      }) as const,
    [store.budgetGroupId],
  )
  const currentUserId = readSessionUser()?.id ?? null
  const budgetOptions = useMemo(() => {
    const scope = groupBudgetOptions(store.budgetGroupId ?? '', currentUserId)
    return {
      context: budgetContext,
      currentUserId: scope.currentUserId,
      memberIds: scope.memberIds,
      memberNames: scope.memberNames,
    }
  }, [budgetContext, store.budgetGroupId, currentUserId])

  const budgetRows = useMemo(
    () =>
      buildBudgetRows(
        budgets,
        expenseInputs,
        () => true,
        displayMonth,
        categoryNameFor,
        budgetOptions,
      ),
    [budgets, expenseInputs, displayMonth, categoryNameFor, budgetOptions],
  )

  const rates = useMemo(() => getRates(), [])
  const investmentContext = useMemo(
    () =>
      store.budgetGroupId
        ? ({ kind: 'group', groupId: store.budgetGroupId } as const)
        : ({ kind: 'personal', userId: currentUserId ?? '' } as const),
    [store.budgetGroupId, currentUserId],
  )
  const groupContextCurrency = useMemo(
    () => investmentContextCurrency(currentUserId ?? '', store.budgetGroupId ?? undefined) ?? primaryCurrency,
    [store.budgetGroupId, currentUserId, primaryCurrency],
  )
  const worth = useMemo(
    () =>
      contextNetWorth(
        transactions,
        investments,
        store.investmentOwnerships,
        investmentContext,
        groupContextCurrency,
        rates.rates,
      ),
    [transactions, investments, store.investmentOwnerships, investmentContext, groupContextCurrency, rates],
  )
  const worthItems = useMemo(
    () =>
      contextNetWorthItems(
        investments,
        store.investmentOwnerships,
        investmentContext,
        groupContextCurrency,
        rates.rates,
      ),
    [investments, store.investmentOwnerships, investmentContext, groupContextCurrency, rates],
  )

  const historyRows: MonthlyHistoryRow[] = useMemo(
    () =>
      months.map((month) => {
        const s = summarizeMonth(transactions, month, categories)
        const prev = monthTotals(transactions, previousMonthKey(month))
        return {
          month,
          summary: s,
          cashFlowComparison: percentageChange(s.cashFlow, prev.cashFlow),
        }
      }),
    [months, transactions, categories],
  )

  const isEmpty = transactions.length === 0

  return (
    <Page title={t('section.dashboard')}>
      <div className="stack">
        {isEmpty && (
          <div className="panel panel--muted empty-dashboard" role="status">
            <p className="mt-0">{t('dash.noData')}</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleLoadDemo}
              disabled={demoLoading}
              aria-busy={demoLoading}
            >
              {demoLoading && <LoadingSpinner size="sm" label={t('loading.demo')} />}
              {demoLoading ? t('loading.demo') : t('dash.loadDemo')}
            </button>
          </div>
        )}

        <div className="dash-toolbar">
          <div className="dash-toolbar__label">
            <span className="section-indicator">{t('dash.summary')}</span>
            <h2 className="dash-toolbar__month">{monthLabel(displayMonth, locale)}</h2>
          </div>
          <div className="dash-toolbar__select">
            <SelectField
              label={t('dash.selectMonth')}
              name="dashboardMonth"
              value={displayMonth}
              onChange={(e) => setPickedMonth(e.target.value)}
              options={[
                ...months
                  .slice()
                  .reverse()
                  .map((m) => ({ value: m, label: monthLabel(m, locale) })),
              ]}
            />
          </div>
        </div>

        <SummaryCards month={displayMonth} metrics={metrics} locale={locale} />

        <div className="dash-grid">
          <div className="stack dash-grid__main">
            <section className="panel" aria-labelledby="dash-breakdown">
              <h2 id="dash-breakdown">{t('dash.expenseBreakdown')}</h2>
              <ExpenseBreakdown
                items={summary.topCategories}
                emptyText={t('dash.noExpenses')}
                locale={locale}
              />
            </section>

            <section className="panel" aria-labelledby="dash-recent">
              <h2 id="dash-recent">{t('dash.recentTransactions')}</h2>
              <RecentTransactions
                transactions={recent}
                categories={categories}
                locale={locale}
                emptyText={t('dash.noTransactions')}
                viewAllLabel={t('dash.viewAll')}
              />
            </section>
          </div>

          <div className="stack dash-grid__side">
            <section className="panel" aria-labelledby="dash-networth">
              <h2 id="dash-networth">{t('dash.netWorth')}</h2>
              <NetWorthPanel
                worth={worth}
                items={worthItems}
                ratesAsOf={rates.asOf}
                locale={locale}
                noInvestmentsText={t('dash.noInvestments')}
              />
            </section>

            <section className="panel" aria-labelledby="dash-budget">
              <h2 id="dash-budget">{t('dash.budgetStatus')}</h2>
              <BudgetSnapshot
                rows={budgetRows}
                emptyText={t('dash.noBudgets')}
                locale={locale}
              />
            </section>
          </div>
        </div>

        <section className="panel" aria-labelledby="dash-history">
          <h2 id="dash-history">{t('dash.monthlyHistory')}</h2>
          <MonthlyHistoryView rows={historyRows} locale={locale} />
        </section>
      </div>
    </Page>
  )
}