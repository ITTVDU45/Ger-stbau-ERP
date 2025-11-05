/**
 * Generiert lesbare Fall-IDs aus MongoDB ObjectIDs
 * Format: GUT001-F12345
 */

/**
 * Extrahiert eine kurze Zahl aus einer MongoDB ObjectID
 */
function extractShortId(objectId: string): string {
  // Nimm die letzten 6 Zeichen der ObjectID und konvertiere zu Dezimal
  const hex = objectId.substring(objectId.length - 6)
  const decimal = parseInt(hex, 16)
  // Reduziere auf 5 Stellen
  return String(decimal % 100000).padStart(5, '0')
}

/**
 * Generiert eine lesbare Fall-ID
 * @param objectId MongoDB ObjectID
 * @param gutachterId Gutachter User-ID (z.B. "gutachter-1")
 * @param gutachterNummer Optional: Gutachternummer (z.B. "GUT-001")
 */
export function generateReadableFallId(
  objectId: string,
  gutachterId?: string,
  gutachterNummer?: string
): string {
  // Extrahiere Gutachter-Nummer
  let gutPrefix = 'GUT000'
  
  if (gutachterNummer) {
    // Wenn Gutachternummer vorhanden (z.B. "GUT-001")
    gutPrefix = gutachterNummer.replace(/[^A-Z0-9]/g, '')
  } else if (gutachterId) {
    // Extrahiere Nummer aus gutachter-ID (z.B. "gutachter-1" → "001")
    const match = gutachterId.match(/\d+/)
    if (match) {
      gutPrefix = `GUT${match[0].padStart(3, '0')}`
    }
  }
  
  // Generiere kurze Fall-Nummer
  const fallNummer = extractShortId(objectId)
  
  return `${gutPrefix}-F${fallNummer}`
}

/**
 * Formatiert einen Timestamp für die Anzeige
 */
export function formatTimestamp(date: Date | string | undefined): string {
  if (!date) return '-'
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    
    // Deutsches Format: 10.01.2025, 14:30
    return d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '-'
  }
}

/**
 * Formatiert nur das Datum (ohne Uhrzeit)
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return '-'
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return '-'
  }
}

