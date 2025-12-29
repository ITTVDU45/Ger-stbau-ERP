import { getDatabase } from '@/lib/db/client'
import { User } from '@/lib/db/types'

/**
 * Generiert die nächste verfügbare Personalnummer
 * Format: MA-XXX (z.B. MA-001, MA-002, ...)
 */
export async function generatePersonalnummer(): Promise<string> {
  const db = await getDatabase()
  const usersCollection = db.collection<User>('users')

  // Finde die höchste bestehende Personalnummer
  const users = await usersCollection
    .find({ 'profile.personalnummer': { $exists: true, $ne: null } })
    .toArray()

  // Extrahiere Nummern aus allen Personalnummern
  let highestNumber = 0
  
  for (const user of users) {
    const personalnummer = user.profile?.personalnummer
    if (personalnummer) {
      // Extrahiere die Nummer aus dem Format "MA-XXX"
      const match = personalnummer.match(/MA-(\d+)/)
      if (match) {
        const number = parseInt(match[1], 10)
        if (number > highestNumber) {
          highestNumber = number
        }
      }
    }
  }

  // Generiere die nächste Nummer
  const nextNumber = highestNumber + 1
  const paddedNumber = nextNumber.toString().padStart(3, '0')
  
  return `MA-${paddedNumber}`
}

