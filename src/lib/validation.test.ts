import { describe, it, expect } from 'vitest'
import { formatDate } from './dates'
import {
  required,
  requiredSelect,
  mustBeNumber,
  minValue,
  maxValue,
  greaterThan,
  maxLength,
  isValidDate,
  notInFuture,
  validateField,
  validateFields,
} from './validation'

describe('validation lib (MYF-8)', () => {
  it('returns required.message for a blank required field (es)', () => {
    const error = required()('   ', { locale: 'es' })
    expect(error).toBe('Este campo es obligatorio.')
  })

  it('returns required.message for a blank required field (en)', () => {
    const error = required()('', { locale: 'en' })
    expect(error).toBe('This field is required.')
  })

  it('accepts a filled required field', () => {
    expect(required()('   Tacos  ', { locale: 'es' })).toBeNull()
  })

  it('select is required', () => {
    expect(requiredSelect()('', { locale: 'es' })).toBe(
      'Seleccione una opción.',
    )
    expect(requiredSelect()('food', { locale: 'es' })).toBeNull()
  })

  it('parses es decimal comma', () => {
    expect(mustBeNumber()('12,50', { locale: 'es' })).toBeNull()
    expect(mustBeNumber()('abc', { locale: 'es' })).toBe(
      'Introduzca un número válido.',
    )
  })

  it('checks min/max bounds', () => {
    expect(minValue(10)('5', { locale: 'en' })).toMatch(/minimum value is 10/)
    expect(minValue(10)('12', { locale: 'en' })).toBeNull()
    expect(maxValue(100)('150', { locale: 'en' })).toMatch(/maximum value is 100/)
  })

  it('checks length bounds', () => {
    expect(maxLength(5)('too long', { locale: 'en' })).toMatch(/Cannot exceed 5/)
    expect(maxLength(5)('ok', { locale: 'en' })).toBeNull()
  })

  it('rejects amounts that are not strictly greater than a minimum', () => {
    expect(greaterThan(0)('3,50', { locale: 'es' })).toBeNull()
    expect(greaterThan(0)('0', { locale: 'es' })).toBe(
      'El valor debe ser mayor que 0.',
    )
    expect(greaterThan(0)('-5', { locale: 'es' })).toBe(
      'El valor debe ser mayor que 0.',
    )
    expect(greaterThan(10)('10', { locale: 'en' })).toMatch(
      /must be greater than 10/,
    )
    expect(greaterThan(0)('', { locale: 'es' })).toBeNull()
  })

  it('rejects dates in the future but accepts today and past', () => {
    const today = new Date()
    const iso = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const fmt = (date: Date) =>
      formatDate(`${iso(date)}`, 'es')
    const todayDate = new Date(`${iso(today)}T00:00:00`)
    const tomorrow = new Date(todayDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(todayDate)
    yesterday.setDate(yesterday.getDate() - 1)
    expect(notInFuture()(fmt(tomorrow), { locale: 'es' })).toBe(
      'La fecha no puede ser posterior a hoy.',
    )
    expect(notInFuture()(fmt(todayDate), { locale: 'es' })).toBeNull()
    expect(notInFuture()(fmt(yesterday), { locale: 'en' })).toBeNull()
    expect(notInFuture()('', { locale: 'es' })).toBeNull()
  })

  it('validates DD/MM/YYYY dates and rejects impossible dates', () => {
    expect(isValidDate()('31/12/2026', { locale: 'es' })).toBeNull()
    expect(isValidDate()('31/13/2026', { locale: 'en' })).toMatch(
      /valid date \(DD\/MM\/YYYY\)/,
    )
    expect(isValidDate()('30/02/2026', { locale: 'en' })).toMatch(
      /valid date \(DD\/MM\/YYYY\)/,
    )
    expect(isValidDate()('01/01/2025', { locale: 'en' })).toBeNull()
  })

  it('validateField applies the first failing rule', () => {
    const error = validateField('', [required(), minValue(5)], 'en')
    expect(error).toBe('This field is required.')
  })

  it('validateFields collects a map of errors keyed by field', () => {
    const errors = validateFields(
      { name: { value: 'abcdef', validators: [maxLength(5)] } },
      'en',
    )
    expect(errors).toEqual({ name: expect.stringContaining('Cannot exceed 5') })
  })
})