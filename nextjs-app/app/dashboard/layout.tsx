import { NotificationProvider } from '@/lib/contexts/NotificationContext'
import DashboardLayoutClient from '@/components/DashboardLayoutClient'
import { getSession } from '@/lib/auth/session'
import { getDatabase } from '@/lib/db/client'
import { User } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { refreshProfilbildUrl } from '@/lib/storage/minioClient'

// Serialisierter User-Typ für Client-Komponente
type SerializedUser = {
  _id?: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  profile?: {
    telefon?: string
    geburtsdatum?: string
    personalnummer?: string
    adresse?: {
      strasse?: string
      hausnummer?: string
      plz?: string
      stadt?: string
      land?: string
    }
    notfallkontakt?: {
      name?: string
      beziehung?: string
      telefon?: string
    }
    bankdaten?: {
      iban?: string
      bic?: string
      bankname?: string
    }
    steuerDaten?: {
      steuerID?: string
      sozialversicherungsnummer?: string
    }
    profilbild?: {
      url?: string
      filename?: string
      uploadedAt?: string
    }
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Lade Session server-seitig
  const session = await getSession()
  
  let currentUser: User | null = null
  let serializedUser: SerializedUser | null = null
  
  if (session) {
    const db = await getDatabase()
    currentUser = await db.collection<User>('users').findOne({
      _id: new ObjectId(session.userId)
    })
    
    // Erneuere Profilbild-URL falls vorhanden
    if (currentUser?.profile?.profilbild?.filename) {
      try {
        const newUrl = await refreshProfilbildUrl(currentUser.profile.profilbild.filename)
        if (currentUser.profile.profilbild) {
          currentUser.profile.profilbild.url = newUrl
        }
        
        // Aktualisiere URL in Datenbank für zukünftige Requests
        await db.collection<User>('users').updateOne(
          { _id: currentUser._id },
          { $set: { 'profile.profilbild.url': newUrl } }
        )
      } catch (error) {
        console.error('Fehler beim Erneuern der Profilbild-URL:', error)
        // Fahre fort, auch wenn das Erneuern fehlschlägt
      }
    }
    
    // Serialisiere User für Client-Komponente
    if (currentUser) {
      serializedUser = {
        _id: currentUser._id?.toString(),
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        role: currentUser.role,
        status: currentUser.status,
        profile: currentUser.profile ? {
          telefon: currentUser.profile.telefon,
          geburtsdatum: currentUser.profile.geburtsdatum?.toISOString(),
          personalnummer: currentUser.profile.personalnummer,
          adresse: currentUser.profile.adresse,
          notfallkontakt: currentUser.profile.notfallkontakt,
          bankdaten: currentUser.profile.bankdaten,
          steuerDaten: currentUser.profile.steuerDaten,
          profilbild: currentUser.profile.profilbild ? {
            url: currentUser.profile.profilbild.url,
            filename: currentUser.profile.profilbild.filename,
            uploadedAt: currentUser.profile.profilbild.uploadedAt?.toISOString()
          } : undefined
        } : undefined
      }
    }
  }
  
  return (
    <NotificationProvider>
      <DashboardLayoutClient user={serializedUser}>
        {children}
      </DashboardLayoutClient>
    </NotificationProvider>
  )
}