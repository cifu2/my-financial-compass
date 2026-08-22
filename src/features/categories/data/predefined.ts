import type { Category } from '../types'

/**
 * Predefined categories shipped with the app. Each user can edit, rename,
 * deactivate or delete them (deletion only when unused by transactions).
 * IDs are stable so stored references survive.
 */
export const PREDEFINED_CATEGORIES: Category[] = [
  // Income
  { id: 'cat-nomina', name: 'Nómina', type: 'income', isActive: true },
  { id: 'cat-interes', name: 'Intereses', type: 'income', isActive: true },
  { id: 'cat-ventas', name: 'Ventas', type: 'income', isActive: true },
  { id: 'cat-donaciones', name: 'Donaciones', type: 'income', isActive: true },
  { id: 'cat-otro-ingreso', name: 'Otro ingreso', type: 'income', isActive: true },
  // Expense
  { id: 'cat-alimentacion', name: 'Alimentación', type: 'expense', isActive: true },
  { id: 'cat-vivienda', name: 'Vivienda', type: 'expense', isActive: true },
  { id: 'cat-transporte', name: 'Transporte', type: 'expense', isActive: true },
  { id: 'cat-ocio', name: 'Ocio y restaurantes', type: 'expense', isActive: true },
  { id: 'cat-salud', name: 'Salud', type: 'expense', isActive: true },
  { id: 'cat-ropa', name: 'Ropa e higiene', type: 'expense', isActive: true },
  { id: 'cat-suscripciones', name: 'Suscripciones', type: 'expense', isActive: true },
  { id: 'cat-ahorro', name: 'Ahorro', type: 'expense', isActive: true },
  { id: 'cat-otro-gasto', name: 'Otro gasto', type: 'expense', isActive: true },
  // Both
  { id: 'cat-transferencias', name: 'Transferencias', type: 'both', isActive: true },
]