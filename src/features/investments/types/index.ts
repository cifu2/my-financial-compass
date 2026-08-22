export interface Investment {
  id: string
  name: string
  ticker?: string
  type: 'stocks' | 'funds' | 'crypto' | 'bonds' | 'other'
  purchaseDate: string
  quantity: number
  investedAmount: number
  currency: string
  currentValue?: number
  gainLoss?: number
}

export interface InvestmentTransaction {
  id: string
  investmentId: string
  type: 'buy' | 'sell'
  date: string
  quantity: number
  amount: number
  currency: string
}
