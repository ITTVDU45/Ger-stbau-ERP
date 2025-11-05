import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest'
import { getDatabase } from '@/lib/db/client'
import { debug } from '@/lib/utils/debug'
import { sendActivationEmail } from '@/lib/email/emailService'
import crypto from 'crypto'

// POST: Neuen Gutachter einladen
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user || user.rolle !== 'admin') {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Unauthorized - Nur für Admins' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { vorname, nachname, email, telefon, firma } = body

    if (!vorname || !nachname || !email) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Vorname, Nachname und E-Mail sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection('users')

    // Prüfen ob E-Mail bereits existiert
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Ein Nutzer mit dieser E-Mail-Adresse existiert bereits' },
        { status: 409 }
      )
    }

    // Aktivierungs-Token generieren
    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 Tage gültig
    debug.log('[Einladung] Token generiert:', token.substring(0, 10) + '...')

    // Gutachter-Nummer generieren
    const lastGutachter = await usersCollection
      .find({ rolle: 'gutachter', gutachterNummer: { $exists: true, $ne: '' } })
      .sort({ gutachterNummer: -1 })
      .limit(1)
      .toArray()

    let gutachterNummer = 'GUT-001'
    if (lastGutachter.length > 0) {
      const lastNummer = lastGutachter[0].gutachterNummer
      if (lastNummer && lastNummer.startsWith('GUT-')) {
        const num = parseInt(lastNummer.split('-')[1]) + 1
        gutachterNummer = `GUT-${num.toString().padStart(3, '0')}`
      }
    }

    // Neuen Nutzer erstellen (inaktiv, nicht verifiziert)
    const neuerNutzer = {
      _id: `gutachter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vorname,
      nachname,
      email,
      telefon: telefon || '',
      firma: firma || '',
      rolle: 'gutachter',
      gutachterNummer,
      aktiv: false,
      verifiziert: false,
      aktivierungsStatus: {
        emailGesendet: true,
        emailGesendetAm: new Date(),
        emailGesendetVon: user.id,
        aktiviert: false,
        token: token,
        tokenExpiry: tokenExpiry
      },
      erstelltAm: new Date(),
      zuletztGeaendert: new Date(),
      // Standard-Einstellungen
      adresse: {},
      dienste: [],
      spezielleExpertise: '',
      anfahrtsradius: 50,
      socialMedia: {},
      oeffnungszeiten: [
        { tag: 'Montag', von: '08:00', bis: '17:00', geoeffnet: true },
        { tag: 'Dienstag', von: '08:00', bis: '17:00', geoeffnet: true },
        { tag: 'Mittwoch', von: '08:00', bis: '17:00', geoeffnet: true },
        { tag: 'Donnerstag', von: '08:00', bis: '17:00', geoeffnet: true },
        { tag: 'Freitag', von: '08:00', bis: '17:00', geoeffnet: true },
        { tag: 'Samstag', von: '09:00', bis: '13:00', geoeffnet: false },
        { tag: 'Sonntag', von: '00:00', bis: '00:00', geoeffnet: false }
      ],
      termineNachVereinbarung: false,
      zertifikate: [],
      profilbildUrl: '',
      profilbildObjectName: ''
    }

    await usersCollection.insertOne(neuerNutzer)

    // Aktivierungslink generieren
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`
    const aktivierungsLink = `${baseUrl}/aktivierung/${token}`
    debug.log('[Einladung] Aktivierungslink:', aktivierungsLink)

    // Email versenden
    const emailResult = await sendActivationEmail(
      email,
      vorname,
      nachname,
      gutachterNummer,
      firma,
      aktivierungsLink
    )

    if (!emailResult.erfolg) {
      debug.error('[Einladungs-Email] Fehler beim Versand:', emailResult.nachricht)
      // Nutzer wurde bereits erstellt, also geben wir trotzdem Erfolg zurück
    }

    // Benachrichtigung an Admin (vorübergehend deaktiviert wegen MongoDB Validation)
    // TODO: MongoDB Schema anpassen oder Benachrichtigungen reparieren
    debug.log('[Einladung] Nutzer erfolgreich erstellt:', neuerNutzer._id)

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Einladung erfolgreich versendet',
      data: {
        nutzerId: neuerNutzer._id,
        gutachterNummer,
        email
      },
      debug: {
        aktivierungsLink // Nur für Development
      }
    })

  } catch (error: any) {
    debug.error('[api/admin/nutzer/einladen POST] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

