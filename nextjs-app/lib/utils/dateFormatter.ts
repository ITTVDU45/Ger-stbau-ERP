/**
 * Utility-Funktionen für deutsches Datums- und Zeitformat
 */

/**
 * Konvertiert ein ISO-Datum (z.B. "2024-03-15T14:30:00") in deutsches Format (dd.mm.yyyy)
 */
export function formatGermanDate(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return '-'
  
  try {
    const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate
    if (isNaN(date.getTime())) return '-'
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}.${month}.${year}`
  } catch {
    return '-'
  }
}

/**
 * Extrahiert die Uhrzeit aus einem ISO-Datum im Format hh:mm
 */
export function formatGermanTime(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return '-'
  
  try {
    const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate
    if (isNaN(date.getTime())) return '-'
    
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${hours}:${minutes}`
  } catch {
    return '-'
  }
}

/**
 * Kombiniert deutsches Datum (dd.mm.yyyy) und Uhrzeit (hh:mm) zu ISO-String
 */
export function combineToISOString(germanDate: string, germanTime: string): string {
  try {
    // Parse deutsches Datum
    const dateParts = germanDate.split('.')
    if (dateParts.length !== 3) return ''
    
    const day = parseInt(dateParts[0])
    const month = parseInt(dateParts[1]) - 1 // Monate sind 0-basiert
    const year = parseInt(dateParts[2])
    
    // Parse Uhrzeit
    const timeParts = germanTime.split(':')
    if (timeParts.length !== 2) return ''
    
    const hours = parseInt(timeParts[0])
    const minutes = parseInt(timeParts[1])
    
    // Erstelle Date-Objekt
    const date = new Date(year, month, day, hours, minutes)
    
    if (isNaN(date.getTime())) return ''
    
    return date.toISOString()
  } catch {
    return ''
  }
}

/**
 * Konvertiert ISO-String zu Datum-Input-Format (yyyy-mm-dd)
 */
export function isoToDateInput(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return ''
  
  try {
    const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate
    if (isNaN(date.getTime())) return ''
    
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * Konvertiert ISO-String zu Zeit-Input-Format (hh:mm)
 */
export function isoToTimeInput(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return ''
  
  try {
    const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate
    if (isNaN(date.getTime())) return ''
    
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * Kombiniert date-input (yyyy-mm-dd) und time-input (hh:mm) zu ISO-String
 */
export function dateTimeInputsToISO(dateInput: string, timeInput: string): string {
  try {
    if (!dateInput) return ''
    
    // Wenn keine Zeit angegeben, nutze 00:00
    const time = timeInput || '00:00'
    
    // Kombiniere und parse
    const dateTimeString = `${dateInput}T${time}:00`
    const date = new Date(dateTimeString)
    
    if (isNaN(date.getTime())) return ''
    
    return date.toISOString()
  } catch {
    return ''
  }
}

/**
 * Formatiert ein ISO-Datum komplett im deutschen Format (dd.mm.yyyy hh:mm)
 */
export function formatGermanDateTime(isoDate: string | Date | null | undefined): string {
  const date = formatGermanDate(isoDate)
  const time = formatGermanTime(isoDate)
  
  if (date === '-' && time === '-') return '-'
  if (date === '-') return time
  if (time === '-') return date
  
  return `${date} ${time}`
}

