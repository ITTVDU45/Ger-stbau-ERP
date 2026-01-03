import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

// GET - Prüfe ob Personalnummer verfügbar ist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personalnummer = searchParams.get('personalnummer')

    if (!personalnummer) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Personalnummer nicht angegeben' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Prüfe ob Personalnummer bereits existiert
    const existierenderMitarbeiter = await db.collection('mitarbeiter')
      .findOne({ personalnummer: personalnummer })

    const verfuegbar = !existierenderMitarbeiter

    return NextResponse.json({
      erfolg: true,
      verfuegbar,
      personalnummer,
      ...(existierenderMitarbeiter && {
        existierenderMitarbeiter: {
          id: existierenderMitarbeiter._id.toString(),
          name: `${existierenderMitarbeiter.vorname} ${existierenderMitarbeiter.nachname}`
        }
      })
    })
  } catch (error) {
    console.error('Fehler beim Prüfen der Personalnummer:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

