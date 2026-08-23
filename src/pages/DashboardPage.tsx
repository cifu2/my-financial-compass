import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { listUserGroups } from '../features/groups/services/groupService'
import { SummaryCards, type SummaryMetric } from '../features/dashboard/components/SummaryCards'
import { ExpenseBreakdown } from '../features/dashboard/components/ExpenseBreakdown'
import { RecentTransactions } from '../features/dashboard/components/RecentTransactions'
import { BudgetSnapshot } from '../features/dashboard/components/BudgetSnapshot'
import { NetWorthPanel } from '../features/dashboard/components/NetWorthPanel'
import { MonthlyHistoryView, type MonthlyHistoryRow } from '../features/dashboard/components/MonthlyHistoryView'
import { DashboardContextSelector } from '../features/dashboard/components/DashboardContextSelector'
import type { Transaction } from '../features/transactions/types'
import {
  DASHBOARD_CONTEXT_PERSONAL,
  parseDashboardContext,
  transactionsInContext,
  transactionOriginKey,
} from '../features/dashboard/services/dashboardContext'
import {
  latestMonth,
  monthTotals,
  monthsAvailable,
  contextNetWorth,
  contextNetWorthItems,
  expenseBreakdown,
  percentageChange,
  previousMonthKey,
  recentTransactions,
  summarizeMonth,
} from '../features/dashboard/services/dashboard'
import { getRates } from '../features/dashboard/services/currency'
import type { MyGroup } from '../features/groups/types'
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

  // ---- active dashboard context (HU-0.5) --------------------------------
  const currentUserId = readSessionUser()?.id ?? null

  // Groups the member may browse as dashboard contexts. Async like the other
  // context selectors; keyed by user so a session switch never leaks options.
  const [userGroups, setUserGroups] = useState<MyGroup[] | null>(null)
  useEffect(() => {
    if (!currentUserId) return
    let cancelled = false
    void listUserGroups(currentUserId).then((groups) => {
      if (cancelled) return
      setUserGroups(groups)
    })
    return () => {
      cancelled = true
    }
  }, [currentUserId])
  const groups = userGroups ?? []
  const groupNameFor = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userGroups],
  )

  const [contextValue, setContextValue] = useState<string>(DASHBOARD_CONTEXT_PERSONAL)
  const activeContext = useMemo(() => parseDashboardContext(contextValue), [contextValue])

  // Member ids/names of the active group (group aging): transactions owned by
  // any member aggregate against the group context.
  const groupScope = useMemo(
    () =>
      activeContext.kind === 'group'
        ? groupBudgetOptions(activeContext.groupId, currentUserId)
        : {
            currentUserId,
            memberIds: new Set<string>(),
            memberNames: new Map<string, string>(),
          },
    [activeContext, currentUserId],
  )

  // Every widget below filters through the active context so the dashboard
  // answers "what is this context's summary?" in exactly one place.
  const scopedTransactions = useMemo(
    () =>
      transactionsInContext(
        transactions,
        activeContext,
        currentUserId,
        groupScope.memberIds,
      ),
    [transactions, activeContext, currentUserId, groupScope.memberIds],
  )

  const months = useMemo(() => monthsAvailable(scopedTransactions), [scopedTransactions])
  const [pickedMonth, setPickedMonth] = useState<string>(() => latestMonth(scopedTransactions))
  const displayMonth = months.includes(pickedMonth) ? pickedMonth : latestMonth(scopedTransactions)

  const summary = useMemo(
    () => summarizeMonth(scopedTransactions, displayMonth, categories),
    [scopedTransactions, displayMonth, categories],
  )

  const prevMonth = previousMonthKey(displayMonth)
  const prevTotals = useMemo(
    () => monthTotals(scopedTransactions, prevMonth),
    [scopedTransactions, prevMonth],
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
    () => recentTransactions(scopedTransactions, 8),
    [scopedTransactions],
  )

  const categoryNameFor = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? null
  }, [categories])

  const expenseInputs: SpendingInput[] = useMemo(
    () =>
      scopedTransactions
        .filter((tr) => tr.type === 'expense')
        .map((tr) => ({
          amount: tr.amount,
          date: tr.date,
          categoryId: tr.categoryId,
          userId: tr.userId,
          groupId: tr.groupId,
        })),
    [scopedTransactions],
  )

  // Expense breakdown with labelled sub-totals: per member in a group context,
  // per origin (personal / each group) in the consolidated "Todo" view.
  const breakdownSplit = useMemo(() => {
    if (activeContext.kind === 'group') {
      const names = groupScope.memberNames
      return (tr: Transaction) => {
        const owner = tr.userId ?? currentUserId ?? ''
        return {
          key: owner || '—',
          label: (owner && names.get(owner)) || '—',
        }
      }
    }
    if (activeContext.kind === 'all') {
      return (tr: Transaction) => ({
        key: transactionOriginKey(tr),
        label:
          tr.groupId === undefined
            ? t('dash.originPersonal')
            : groupNameFor.get(tr.groupId) ?? tr.groupId,
      })
    }
    return null
  }, [activeContext, groupScope.memberNames, currentUserId, groupNameFor, t])

  const breakdownItems = useMemo(
    () => (breakdownSplit
      ? expenseBreakdown(scopedTransactions, displayMonth, categories, 5, breakdownSplit)
      : summary.topCategories),
    [scopedTransactions, displayMonth, categories, breakdownSplit, summary.topCategories],
  )

  // Budget snapshot follows the same context as the rest of the widgets.
  const budgetOptions = useMemo(() => {
    if (activeContext.kind === 'personal') {
      return { context: { kind: 'personal', groupId: null } as const, currentUserId }
    }
    if (activeContext.kind === 'group') {
      return {
        context: { kind: 'group', groupId: activeContext.groupId } as const,
        currentUserId,
        memberIds: groupScope.memberIds,
        memberNames: groupScope.memberNames,
      }
    }
    // "Todo": every budget (personal + all groups) with unscoped spending.
    return { context: undefined, currentUserId }
  }, [activeContext, currentUserId, groupScope])

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

  // Net worth follows the active context (holdings + liquid assets).
  const rates = useMemo(() => getRates(), [])
  const portfolioContext = useMemo(() => {
    switch (activeContext.kind) {
      case 'all':
        return { kind: 'all' } as const
      case 'group':
        return { kind: 'group', groupId: activeContext.groupId } as const
      case 'personal':
        return { kind: 'personal', userId: currentUserId ?? '' } as const
    }
  }, [activeContext, currentUserId])
  const contextCurrency = useMemo(
    () =>
      activeContext.kind === 'group'
        ? investmentContextCurrency(currentUserId ?? '', activeContext.groupId) ?? primaryCurrency
        : primaryCurrency,
    [activeContext, currentUserId, primaryCurrency],
  )
  const worth = useMemo(
    () =>
      contextNetWorth(
        scopedTransactions,
        investments,
        store.investmentOwnerships,
        portfolioContext,
        contextCurrency,
        rates.rates,
      ),
    [scopedTransactions, investments, store.investmentOwnerships, portfolioContext, contextCurrency, rates],
  )
  const worthItems = useMemo(
    () =>
      contextNetWorthItems(
        investments,
        store.investmentOwnerships,
        portfolioContext,
        contextCurrency,
        rates.rates,
      ),
    [investments, store.investmentOwnerships, portfolioContext, contextCurrency, rates],
  )

  const historyRows: MonthlyHistoryRow[] = useMemo(
    () =>
      months.map((month) => {
        const s = summarizeMonth(scopedTransactions, month, categories)
        const prev = monthTotals(scopedTransactions, previousMonthKey(month))
        return {
          month,
          summary: s,
          cashFlowComparison: percentageChange(s.cashFlow, prev.cashFlow),
        }
      }),
    [months, scopedTransactions, categories],
  )

  const contextName =
    activeContext.kind === 'group'
      ? groupNameFor.get(activeContext.groupId) ?? activeContext.groupId
      : activeContext.kind === 'all'
        ? t('dash.contextAll')
        : t('dash.contextPersonal')

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
            <p className="dash-toolbar__context-name">{contextName}</p>
          </div>
          <div className="dash-toolbar__selects">
            <div className="dash-toolbar__select">
              <DashboardContextSelector
                locale={locale}
                value={contextValue}
                onChange={setContextValue}
              />
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
        </div>

        <SummaryCards month={displayMonth} metrics={metrics} locale={locale} />

        <div className="dash-grid">
          <div className="stack dash-grid__main">
            <section className="panel" aria-labelledby="dash-breakdown">
              <h2 id="dash-breakdown">{t('dash.expenseBreakdown')}</h2>
              <ExpenseBreakdown
                items={breakdownItems}
                emptyText={t('dash.noExpenses')}
                locale={locale}
                sharesLabel={t('dash.shareLabel')}
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
                showOrigin={activeContext.kind === 'all'}
                originHeader={t('dash.origin')}
                originFor={(tr) =>
                  tr.groupId === undefined
                    ? t('dash.originPersonal')
                    : groupNameFor.get(tr.groupId) ?? tr.groupId
                }
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