import type { Locale } from './dates'

export const messages = {
  es: {
    'required.field': 'Este campo es obligatorio.',
    'required.select': 'Seleccione una opción.',
    'number.invalid': 'Introduzca un número válido.',
    'number.min': 'El valor mínimo es {min}.',
    'number.max': 'El valor máximo es {max}.',
    'number.greater': 'El valor debe ser mayor que {min}.',
    'text.tooShort': 'Debe tener al menos {min} caracteres.',
    'text.tooLong': 'No puede superar los {max} caracteres.',
    'date.invalid': 'Introduzca una fecha válida (DD/MM/AAAA).',
    'date.future': 'La fecha no puede ser anterior a hoy.',
    'date.notFuture': 'La fecha no puede ser posterior a hoy.',
  },
  en: {
    'required.field': 'This field is required.',
    'required.select': 'Please select an option.',
    'number.invalid': 'Please enter a valid number.',
    'number.min': 'The minimum value is {min}.',
    'number.max': 'The maximum value is {max}.',
    'number.greater': 'The value must be greater than {min}.',
    'text.tooShort': 'Must be at least {min} characters.',
    'text.tooLong': 'Cannot exceed {max} characters.',
    'date.invalid': 'Please enter a valid date (DD/MM/YYYY).',
    'date.future': 'The date cannot be before today.',
    'date.notFuture': 'The date cannot be after today.',
  },
} as const satisfies Record<Locale, Record<string, string>>

export type MessageKey = keyof (typeof messages)['es']

const MESSAGES = messages

export function message(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES.es[key] ?? key
}

export function formatMessage(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let template = message(locale, key)
  for (const [name, value] of Object.entries(params ?? {})) {
    template = template.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value))
  }
  return template
}

export interface ValidatorOptions {
  locale: Locale
}

export type Validator = (value: unknown, opts: ValidatorOptions) => string | null

export function required(messageKey: MessageKey = 'required.field'): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null) return formatMessage(locale, messageKey)
    const s = String(value).trim()
    return s.length === 0 ? formatMessage(locale, messageKey) : null
  }
}

export function requiredSelect(): Validator {
  return (value, { locale }) =>
    value === undefined || value === null || String(value) === ''
      ? formatMessage(locale, 'required.select')
      : null
}

export function mustBeNumber(): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    if (Number.isNaN(Number(String(value).replace(',', '.')))) {
      return formatMessage(locale, 'number.invalid')
    }
    return null
  }
}

export function minValue(min: number): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    const n = Number(String(value).replace(',', '.'))
    if (Number.isNaN(n)) return formatMessage(locale, 'number.invalid')
    return n < min ? formatMessage(locale, 'number.min', { min }) : null
  }
}

export function maxValue(max: number): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    const n = Number(String(value).replace(',', '.'))
    if (Number.isNaN(n)) return formatMessage(locale, 'number.invalid')
    return n > max ? formatMessage(locale, 'number.max', { max }) : null
  }
}

export function greaterThan(min: number): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    const n = Number(String(value).replace(',', '.'))
    if (Number.isNaN(n)) return formatMessage(locale, 'number.invalid')
    return n <= min ? formatMessage(locale, 'number.greater', { min }) : null
  }
}

export function minLength(min: number): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    const len = String(value).trim().length
    return len < min ? formatMessage(locale, 'text.tooShort', { min }) : null
  }
}

export function maxLength(max: number): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null) return null
    const len = String(value).trim().length
    return len > max ? formatMessage(locale, 'text.tooLong', { max }) : null
  }
}

export function isValidDate(): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    const s = String(value).trim()
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
    if (!match) return formatMessage(locale, 'date.invalid')
    const day = Number(match[1])
    const month = Number(match[2])
    const year = Number(match[3])
    const iso = new Date(Date.UTC(year, month - 1, day))
    const ok =
      iso.getUTCFullYear() === year &&
      iso.getUTCMonth() === month - 1 &&
      iso.getUTCDate() === day
    return ok ? null : formatMessage(locale, 'date.invalid')
  }
}

export function notBeforeToday(): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    const s = String(value).trim()
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
    if (!match) return null
    const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return date < today ? formatMessage(locale, 'date.future') : null
  }
}

export function notInFuture(): Validator {
  return (value, { locale }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null
    const s = String(value).trim()
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
    if (!match) return null
    const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return date > today ? formatMessage(locale, 'date.notFuture') : null
  }
}

export function validateField(
  value: unknown,
  validators: Validator[],
  locale: Locale,
): string | null {
  for (const v of validators) {
    const error = v(value, { locale })
    if (error) return error
  }
  return null
}

export function validateFields(
  fields: Record<string, { value: unknown; validators: Validator[] }>,
  locale: Locale,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [name, spec] of Object.entries(fields)) {
    const error = validateField(spec.value, spec.validators, locale)
    if (error) errors[name] = error
  }
  return errors
}