// Simple i18n helper (synchronous) for server and client use
const translations: Record<string, Record<string, string>> = {
  de: {
    'invalid_email': 'Ungültige E‑Mail',
    'invalid_url': 'Ungültige URL',
    'invalid_date': 'Ungültiges Datum / Uhrzeit',
    'required': 'Pflichtfeld',
    'too_short': 'Wert zu kurz',
    'too_long': 'Wert zu lang',
    'invalid_value': 'Ungültiger Wert',
    'format_mismatch': 'Format stimmt nicht überein',
    'could_not_parse': 'Konnte nicht geparst werden',
    'not_empty': 'Darf nicht leer sein',
    'not_number': 'Keine gültige Zahl',
    'integer_expected': 'Ganze Zahl erwartet',
    'boolean_expected': 'Boolescher Wert erwartet',
    'array_expected': 'Liste/Array erwartet',
    'object_expected': 'Objekt erwartet',
    'validation_failed': 'Validierung fehlgeschlagen'
  }
}

export function t(key: string, locale = 'de') {
  return translations[locale]?.[key] ?? key
}

// heuristics: map raw zod messages to translation keys
export function mapZodMessageToKey(msg: string): string {
  const m = (msg || '').toLowerCase()
  if (m.includes('email')) return 'invalid_email'
  if (m.includes('url')) return 'invalid_url'
  if (m.includes('date') || m.includes('time')) return 'invalid_date'
  if (m.includes('required') || m.includes('pflicht')) return 'required'
  if (m.includes('at least') || m.includes('min') || m.includes('too small')) return 'too_short'
  if (m.includes('at most') || m.includes('max') || m.includes('too large')) return 'too_long'
  if (m.includes('invalid') || m.includes('not a valid') || m.includes('expected')) return 'invalid_value'
  if (m.includes('regex') || m.includes('match')) return 'format_mismatch'
  if (m.includes('parse')) return 'could_not_parse'
  if (m.includes('empty') || m.includes('nonempty')) return 'not_empty'
  if (m.includes('nan')) return 'not_number'
  if (m.includes('integer')) return 'integer_expected'
  if (m.includes('boolean')) return 'boolean_expected'
  if (m.includes('array')) return 'array_expected'
  if (m.includes('object')) return 'object_expected'
  return 'validation_failed'
}

export default { t, mapZodMessageToKey }


