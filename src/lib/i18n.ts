import type { Locale } from './dates'

const ui: Record<Locale, Record<string, string>> = {
  es: {
    'app.title': 'Brújula Financiera',
    'form.save': 'Guardar',
    'form.cancel': 'Cancelar',
    'form.edit': 'Editar',
    'form.submit': 'Guardar cambios',
    'confirm.delete': 'Eliminar',
    'confirm.cancel': 'Cancelar',
    'confirm.deleteTitle': '¿Confirmar eliminación?',
    'transaction.deleteTitle':
      '¿Seguro que desea eliminar esta transacción? Esta acción no se puede deshacer.',
    'category.deleteTitle':
      '¿Seguro que desea eliminar esta categoría? Esta acción no se puede deshacer.',
    'investment.deleteTitle':
      '¿Seguro que desea eliminar esta inversión? Esta acción no se puede deshacer.',
    'budget.deleteTitle':
      '¿Seguro que desea eliminar este presupuesto? Esta acción no se puede deshacer.',
    'undo.restored': 'Elemento restaurado.',
    'undo.title': 'Eliminado',
    'undo.action': 'Deshacer',
    'undo.dismiss': 'Cerrar',
    'common.transaction': 'Transacción',
    'common.category': 'Categoría',
    'common.investment': 'Inversión',
    'common.budget': 'Presupuesto',
    'common.delete': 'Eliminar',
    'common.empty': 'No hay elementos.',
    'fld.description': 'Descripción',
    'fld.amount': 'Importe',
    'fld.date': 'Fecha',
    'fld.category': 'Categoría',
    'fld.type': 'Tipo',
    'type.income': 'Ingreso',
    'type.expense': 'Gasto',
    'fld.name': 'Nombre',
    'fld.value': 'Valor',
    'fld.period': 'Periodo',
    'period.monthly': 'Mensual',
    'budget.duplicate': 'Ya existe un presupuesto activo para esta categoría.',
    'toast.transactionSaved': 'Transacción guardada',
    'section.transactions': 'Transacciones',
    'section.categories': 'Categorías',
    'section.investments': 'Inversiones',
    'section.budgets': 'Presupuestos',
    'fld.limit': 'Límite mensual',
    'date.format': 'DD/MM/YYYY',
  },
  en: {
    'app.title': 'Financial Compass',
    'form.save': 'Save',
    'form.cancel': 'Cancel',
    'form.edit': 'Edit',
    'form.submit': 'Save changes',
    'confirm.delete': 'Delete',
    'confirm.cancel': 'Cancel',
    'confirm.deleteTitle': 'Confirm deletion?',
    'transaction.deleteTitle':
      'Are you sure you want to delete this transaction? This action cannot be undone.',
    'category.deleteTitle':
      'Are you sure you want to delete this category? This action cannot be undone.',
    'investment.deleteTitle':
      'Are you sure you want to delete this investment? This action cannot be undone.',
    'budget.deleteTitle':
      'Are you sure you want to delete this budget? This action cannot be undone.',
    'undo.restored': 'Item restored.',
    'undo.title': 'Deleted',
    'undo.action': 'Undo',
    'undo.dismiss': 'Close',
    'common.transaction': 'Transaction',
    'common.category': 'Category',
    'common.investment': 'Investment',
    'common.budget': 'Budget',
    'common.delete': 'Delete',
    'common.empty': 'No items',
    'fld.description': 'Description',
    'fld.amount': 'Amount',
    'fld.date': 'Date',
    'fld.category': 'Category',
    'fld.type': 'Type',
    'type.income': 'Income',
    'type.expense': 'Expense',
    'fld.name': 'Name',
    'fld.value': 'Value',
    'fld.period': 'Period',
    'period.monthly': 'Monthly',
    'budget.duplicate': 'There is already an active budget for this category.',
    'toast.transactionSaved': 'Transaction saved',
    'section.transactions': 'Transactions',
    'section.categories': 'Categories',
    'section.investments': 'Investments',
    'section.budgets': 'Budgets',
    'fld.limit': 'Monthly limit',
    'date.format': 'MM/DD/YYYY',
  },
}

export type UIKey = keyof (typeof ui)['es']

export function translate(locale: Locale, key: UIKey): string {
  return ui[locale]?.[key] ?? ui.es[key] ?? key
}