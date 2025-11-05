import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest'
import { getDatabase } from '@/lib/db/client'
import { debug } from '@/lib/utils/debug'

// GET: Verifizierungsstatus abrufen
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params

    if (!user || user.rolle !== 'admin') {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection('users')

    const nutzer = await usersCollection.findOne({ _id: id })

    if (!nutzer) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Nutzer nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      status: nutzer.verifizierungStatus || {
        emailGesendet: false,
        linkGeklickt: false
      }
    })

  } catch (error: any) {
    debug.error('[api/admin/nutzer/[id]/verifizierung GET] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

// PUT: Nutzer verifizieren (finale Admin-Bestätigung)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params

    if (!user || user.rolle !== 'admin') {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { verifiziert } = body

    const db = await getDatabase()
    const usersCollection = db.collection('users')
    const notificationsCollection = db.collection('benachrichtigungen')

    // Prüfen ob Gutachter Link geklickt hat
    const nutzer = await usersCollection.findOne({ _id: id })

    if (!nutzer) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Nutzer nicht gefunden' },
        { status: 404 }
      )
    }

    if (!nutzer.verifizierungStatus?.linkGeklickt) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Der Gutachter muss zuerst den Verifizierungslink bestätigen' },
        { status: 400 }
      )
    }

    // Nutzer verifizieren
    const result = await usersCollection.updateOne(
      { _id: id },
      {
        $set: {
          verifiziert: verifiziert,
          verifizierungStatus: {
            ...nutzer.verifizierungStatus,
            verifiziert: verifiziert,
            verifizierungAbgeschlossenAm: new Date(),
            verifizierungAbgeschlossenVon: user.id
          },
          zuletztGeaendert: new Date()
        }
      }
    )

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Keine Änderung vorgenommen' },
        { status: 400 }
      )
    }

    // Benachrichtigung an Gutachter senden
    if (verifiziert) {
      const { ObjectId } = require('mongodb')
      try {
        await notificationsCollection.insertOne({
          _id: new ObjectId(),
          empfaengerId: id,
          empfaengerRolle: 'gutachter',
          absenderId: user.id,
          absenderRolle: 'admin',
          typ: 'nutzer_verifiziert',
          titel: 'Account verifiziert',
          nachricht: `Ihr Account wurde erfolgreich verifiziert! Sie können nun alle Funktionen nutzen.`,
          gelesen: false,
          erstelltAm: new Date(),
          url: '/dashboard/gutachter'
        })
      } catch (notifError) {
        debug.error('[Verifizierung] Fehler beim Erstellen der Benachrichtigung:', notifError)
      }
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: verifiziert ? 'Gutachter erfolgreich verifiziert' : 'Verifizierung aufgehoben'
    })

  } catch (error: any) {
    debug.error('[api/admin/nutzer/[id]/verifizierung PUT] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

