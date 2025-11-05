import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { debug } from '@/lib/utils/debug'

// POST: Verifizierungslink bestätigen (vom Gutachter aufgerufen)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Kein Token angegeben' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection('users')

    // Nutzer mit diesem Token finden
    const nutzer = await usersCollection.findOne({
      'verifizierungStatus.token': token
    })

    if (!nutzer) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Ungültiger oder bereits verwendeter Verifizierungslink' },
        { status: 404 }
      )
    }

    // Prüfen ob Token abgelaufen
    const tokenExpiry = new Date(nutzer.verifizierungStatus.tokenExpiry)
    if (tokenExpiry < new Date()) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Der Verifizierungslink ist abgelaufen. Bitte fordern Sie einen neuen an.' },
        { status: 410 } // Gone
      )
    }

    // Link als geklickt markieren
    await usersCollection.updateOne(
      { _id: nutzer._id },
      {
        $set: {
          'verifizierungStatus.linkGeklickt': true,
          'verifizierungStatus.linkGeklicktAm': new Date(),
          zuletztGeaendert: new Date()
        }
      }
    )

    debug.info(`[Verifizierung] Gutachter ${nutzer.email} hat Link bestätigt`)

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Vielen Dank! Ihre E-Mail-Adresse wurde erfolgreich bestätigt. Ein Administrator wird Ihren Account nun final verifizieren.'
    })

  } catch (error: any) {
    debug.error('[api/verifizierung/[token] POST] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

