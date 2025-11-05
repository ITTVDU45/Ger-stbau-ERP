import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { debug } from '@/lib/utils/debug'

// POST: Aktivierungslink bestätigen (vom neuen Gutachter aufgerufen)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    debug.log('[Aktivierung] Token erhalten:', token)

    if (!token) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Kein Token angegeben' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection('users')
    const { ObjectId } = require('mongodb')

    // Nutzer mit diesem Token finden
    debug.log('[Aktivierung] Suche Nutzer mit Token...')
    const nutzer = await usersCollection.findOne({
      'aktivierungsStatus.token': token
    })
    debug.log('[Aktivierung] Nutzer gefunden:', nutzer ? `${nutzer.email} (${nutzer._id})` : 'NICHT GEFUNDEN')

    if (!nutzer) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Ungültiger oder bereits verwendeter Aktivierungslink' },
        { status: 404 }
      )
    }

    // Prüfen ob bereits aktiviert
    if (nutzer.aktivierungsStatus?.aktiviert) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Dieser Account wurde bereits aktiviert' },
        { status: 409 }
      )
    }

    // Prüfen ob Token abgelaufen
    const tokenExpiry = new Date(nutzer.aktivierungsStatus.tokenExpiry)
    if (tokenExpiry < new Date()) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Der Aktivierungslink ist abgelaufen. Bitte kontaktieren Sie den Support für einen neuen Link.' },
        { status: 410 } // Gone
      )
    }

    // Account aktivieren und verifizieren
    debug.log('[Aktivierung] Aktiviere Account für:', nutzer.email)
    const updateResult = await usersCollection.updateOne(
      { _id: nutzer._id },
      {
        $set: {
          aktiv: true,
          verifiziert: true,
          'aktivierungsStatus.aktiviert': true,
          'aktivierungsStatus.aktiviertAm': new Date(),
          zuletztGeaendert: new Date()
        }
      }
    )
    debug.log('[Aktivierung] Update-Result:', {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount
    })

    // Benachrichtigung an Admin
    const notificationsCollection = db.collection('benachrichtigungen')
    try {
      await notificationsCollection.insertOne({
        _id: new ObjectId(),
        empfaengerId: 'admin',
        empfaengerRolle: 'admin',
        absenderId: nutzer._id,
        absenderRolle: 'gutachter',
        typ: 'nutzer_aktiviert',
        titel: 'Neuer Gutachter aktiviert',
        nachricht: `${nutzer.vorname} ${nutzer.nachname} (${nutzer.gutachterNummer}) hat seinen Account aktiviert. Email: ${nutzer.email}`,
        gelesen: false,
        erstelltAm: new Date(),
        url: `/dashboard/admin/nutzer/${nutzer._id}`
      })
    } catch (notifError) {
      debug.error('[Aktivierung] Fehler beim Erstellen der Benachrichtigung:', notifError)
    }

    debug.log(`[Aktivierung] Nutzer ${nutzer.email} hat Account aktiviert`)

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Ihr Account wurde erfolgreich aktiviert! Sie können sich nun einloggen und alle Funktionen nutzen.',
      data: {
        email: nutzer.email,
        name: `${nutzer.vorname} ${nutzer.nachname}`,
        gutachterNummer: nutzer.gutachterNummer
      }
    })

  } catch (error: any) {
    debug.error('[api/aktivierung/[token] POST] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

