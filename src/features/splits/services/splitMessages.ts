import type { Locale } from '../../../lib/dates'
import type { SplitErrorCode } from './splitCalculator'

const MESSAGES: Record<Locale, Record<SplitErrorCode, string>> = {
  es: {
    'no-participants': 'Selecciona al menos un participante.',
    'invalid-input': 'Introduce un valor válido en cada participante.',
    'percentages-sum': 'Los porcentajes deben sumar 100%.',
    'amounts-sum': 'La suma de los importes debe cuadrar con el total del gasto.',
  },
  en: {
    'no-participants': 'Pick at least one participant.',
    'invalid-input': 'Enter a valid value for each participant.',
    'percentages-sum': 'Percentages must add up to 100%.',
    'amounts-sum': 'The amounts must add up to the expense total.',
  },
}

export function splitErrorMessages(code: SplitErrorCode, locale: Locale): string {
  return MESSAGES[locale]?.[code] ?? MESSAGES.es[code] ?? code
}