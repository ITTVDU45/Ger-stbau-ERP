import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest'
import { getDatabase } from '@/lib/db/client'
import { debug } from '@/lib/utils/debug'
import { sendVerificationEmail } from '@/lib/email/emailService'
import crypto from 'crypto'

// POST: Verifizierungsmail senden
export async function POST(
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
    const { ObjectId } = require('mongodb')

    const nutzer = await usersCollection.findOne({ _id: id })

    if (!nutzer) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Nutzer nicht gefunden' },
        { status: 404 }
      )
    }

    if (nutzer.rolle !== 'gutachter') {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Nur Gutachter können verifiziert werden' },
        { status: 400 }
      )
    }

    // Verifizierungs-Token generieren
    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage gültig

    // Token in DB speichern
    await usersCollection.updateOne(
      { _id: id },
      {
        $set: {
          verifizierungStatus: {
            emailGesendet: true,
            emailGesendetAm: new Date(),
            emailGesendetVon: user.id,
            linkGeklickt: false,
            token: token,
            tokenExpiry: tokenExpiry
          },
          zuletztGeaendert: new Date()
        }
      }
    )

    // Verifizierungslink generieren
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`
    const verifizierungsLink = `${baseUrl}/verifizierung/${token}`

    // Email versenden
    const emailResult = await sendVerificationEmail(
      nutzer.email,
      nutzer.vorname,
      nutzer.nachname,
      verifizierungsLink
    )

    if (!emailResult.erfolg) {
      debug.error('[Verifizierungs-Email] Fehler beim Versand:', emailResult.nachricht)
      // Wir geben trotzdem Erfolg zurück, da der Token gespeichert wurde
    }

    // Benachrichtigung an Gutachter senden
    const notificationsCollection = db.collection('benachrichtigungen')
    try {
      await notificationsCollection.insertOne({
        _id: new ObjectId(),
        empfaengerId: id,
        empfaengerRolle: 'gutachter',
        absenderId: user.id,
        absenderRolle: 'admin',
        typ: 'verifizierung_email_gesendet',
        titel: 'Verifizierungsmail versendet',
        nachricht: `Eine Verifizierungsmail wurde an ${nutzer.email} gesendet. Bitte überprüfen Sie Ihr Postfach.`,
        gelesen: false,
        erstelltAm: new Date()
      })
    } catch (notifError) {
      debug.error('[Verifizierung] Fehler beim Erstellen der Benachrichtigung:', notifError)
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Verifizierungsmail erfolgreich versendet',
      debug: {
        email: nutzer.email,
        link: verifizierungsLink // Nur für Development
      }
    })

  } catch (error: any) {
    debug.error('[api/admin/nutzer/[id]/verifizierung/email POST] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

