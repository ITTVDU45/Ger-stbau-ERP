import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Anfrage } from '@/lib/db/types'

// GET - Alle Anfragen laden
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const { searchParams } = new URL(request.url)
    
    // Filter-Optionen
    const status = searchParams.get('status')
    const kundeId = searchParams.get('kundeId')
    const zustaendig = searchParams.get('zustaendig')
    
    // Build query
    const query: any = {}
    if (status && status !== 'alle') {
      query.status = status
    }
    if (kundeId) {
      query.kundeId = kundeId
    }
    if (zustaendig) {
      query.zustaendig = zustaendig
    }
    
    const anfragen = await db
      .collection('anfragen')
      .find(query)
      .sort({ erstelltAm: -1 })
      .toArray()

    return NextResponse.json({
      erfolg: true,
      anfragen: anfragen.map(a => ({
        ...a,
        _id: a._id.toString()
      }))
    })
  } catch (error) {
    console.error('Fehler beim Laden der Anfragen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// POST - Neue Anfrage erstellen
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase()
    const body = await request.json()
    
    // Anfragenummer generieren
    const jahr = new Date().getFullYear()
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    const anfragenummer = `ANF-${jahr}-${random}`
    
    const neueAnfrage: Omit<Anfrage, '_id'> = {
      anfragenummer,
      kundeId: body.kundeId,
      kundeName: body.kundeName,
      ansprechpartner: body.ansprechpartner,
      bauvorhaben: body.bauvorhaben || {
        objektname: '',
        strasse: '',
        plz: '',
        ort: '',
        besonderheiten: ''
      },
      artDerArbeiten: body.artDerArbeiten || {
        dachdecker: false,
        fassade: false,
        daemmung: false,
        sonstige: false,
        sonstigeText: ''
      },
      geruestseiten: body.geruestseiten || {
        vorderseite: false,
        rueckseite: false,
        rechteSeite: false,
        linkeSeite: false,
        gesamtflaeche: 0
      },
      anmerkungen: body.anmerkungen,
      dokumente: body.dokumente || [],
      status: body.status || 'offen',
      zustaendig: body.zustaendig,
      angebotId: body.angebotId,
      aktivitaeten: [
        {
          aktion: 'Anfrage erstellt',
          benutzer: body.erstelltVon || 'admin',
          zeitpunkt: new Date(),
          details: 'Anfrage wurde neu angelegt'
        }
      ],
      erstelltAm: new Date(),
      zuletztGeaendert: new Date(),
      erstelltVon: body.erstelltVon || 'admin'
    }
    
    const result = await db.collection('anfragen').insertOne(neueAnfrage)
    
    return NextResponse.json({
      erfolg: true,
      anfrage: {
        ...neueAnfrage,
        _id: result.insertedId.toString()
      },
      nachricht: 'Anfrage erfolgreich erstellt'
    })
  } catch (error) {
    console.error('Fehler beim Erstellen der Anfrage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

