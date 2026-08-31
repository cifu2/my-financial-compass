import type { Transaction } from '../features/transactions/types'

interface CategoryLookup {
  (id: string): { name: string; type: string } | undefined
}

/**
 * Build a CSV string from an array of transactions.
 * Columns: Date, Type, Category, Concept, Amount, Group, Owner.
 */
export function buildTransactionsCsv(
  transactions: readonly Transaction[],
  currency: string,
  categories: CategoryLookup,
): string {
  const header = 'Date,Type,Category,Concept,Amount,Currency'
  const rows = transactions
    .map((tx) => {
      const cat = categories(tx.categoryId)
      const category = cat?.name ?? ''
      const type = tx.type === 'income' ? 'Income' : 'Expense'
      const amount = tx.amount.toFixed(2).replace('.', ',')
      return `"${tx.date}","${type}","${category}","${tx.concept.replace(/"/g, '""')}","${amount}","${currency}"`
    })
    .join('\n')

  return [header, rows].filter(Boolean).join('\n')
}

/**
 * Create a download link for the given CSV content.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}