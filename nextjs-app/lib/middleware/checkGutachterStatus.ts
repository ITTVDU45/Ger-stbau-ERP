import { getDatabase } from '@/lib/db/client'

/**
 * Prüft ob ein Gutachter aktiv und berechtigt ist, Aktionen durchzuführen
 */
export async function checkGutachterStatus(userId: string): Promise<{
  aktiv: boolean
  verifiziert: boolean
  kannFaelleErstellen: boolean
  nachricht?: string
}> {
  try {
    const db = await getDatabase()
    const usersCollection = db.collection('users')

    const gutachter = await usersCollection.findOne({ _id: userId })

    if (!gutachter) {
      return {
        aktiv: false,
        verifiziert: false,
        kannFaelleErstellen: false,
        nachricht: 'Gutachter nicht gefunden'
      }
    }

    if (gutachter.rolle !== 'gutachter') {
      return {
        aktiv: true,
        verifiziert: true,
        kannFaelleErstellen: true
      }
    }

    const aktiv = gutachter.aktiv !== false // Default: true
    const verifiziert = gutachter.verifiziert === true

    if (!aktiv) {
      return {
        aktiv: false,
        verifiziert,
        kannFaelleErstellen: false,
        nachricht: 'Ihr Account wurde deaktiviert. Bitte kontaktieren Sie den Support.'
      }
    }

    if (!verifiziert) {
      return {
        aktiv: true,
        verifiziert: false,
        kannFaelleErstellen: false,
        nachricht: 'Ihr Account ist noch nicht verifiziert. Bitte warten Sie auf die Verifizierung durch einen Administrator.'
      }
    }

    return {
      aktiv: true,
      verifiziert: true,
      kannFaelleErstellen: true
    }

  } catch (error) {
    console.error('[checkGutachterStatus] Error:', error)
    return {
      aktiv: false,
      verifiziert: false,
      kannFaelleErstellen: false,
      nachricht: 'Fehler bei der Statusprüfung'
    }
  }
}

