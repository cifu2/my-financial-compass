export interface RecurringTransaction {
  id: string
  transactionId: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual'
  startDate: string
  endDate?: string
  executionDay?: number
  isActive: boolean
  nextExecution: string
}
