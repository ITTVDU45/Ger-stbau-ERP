import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getDatabase } from '@/lib/db/client'
import { User } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { refreshProfilbildUrl } from '@/lib/storage/minioClient'

export async function GET() {
  try {
    const session = await requireAuth()
    const db = await getDatabase()
    
    const user = await db.collection<User>('users').findOne({
      _id: new ObjectId(session.userId)
    }, {
      projection: { passwordHash: 0 } // Passwort nicht zurückgeben
    })
    
    if (!user) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Erneuere Profilbild-URL falls vorhanden
    if (user.profile?.profilbild?.filename) {
      try {
        const newUrl = await refreshProfilbildUrl(user.profile.profilbild.filename)
        if (user.profile.profilbild) {
          user.profile.profilbild.url = newUrl
        }
        
        // Aktualisiere URL in Datenbank für zukünftige Requests
        await db.collection<User>('users').updateOne(
          { _id: user._id },
          { $set: { 'profile.profilbild.url': newUrl } }
        )
      } catch (error) {
        console.error('Fehler beim Erneuern der Profilbild-URL:', error)
        // Fahre fort, auch wenn das Erneuern fehlschlägt
      }
    }
    
    return NextResponse.json({ erfolg: true, user })
  } catch (error: any) {
    return NextResponse.json(
      { erfolg: false, fehler: error.message },
      { status: 500 }
    )
  }
}

