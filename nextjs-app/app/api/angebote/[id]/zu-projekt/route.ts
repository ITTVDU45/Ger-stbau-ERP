import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Angebot in Projekt umwandeln
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Angebot-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Angebot laden
    const angebot = await db.collection('angebote').findOne({ _id: new ObjectId(id) })
    
    if (!angebot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Angebot nicht gefunden' },
        { status: 404 }
      )
    }

    console.log('Angebot Status:', angebot.status)
    console.log('Angebot ProjektId:', angebot.projektId)

    // Prüfen ob Angebot angenommen wurde oder gesendet ist
    // (Lockere Validierung - auch gesendete Angebote können in Projekte umgewandelt werden)
    if (angebot.status === 'entwurf') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Entwürfe können nicht in Projekte umgewandelt werden. Bitte senden Sie das Angebot zuerst.' },
        { status: 400 }
      )
    }

    // Prüfen ob bereits ein Projekt existiert
    if (angebot.projektId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Für dieses Angebot existiert bereits ein Projekt' },
        { status: 400 }
      )
    }

    // Projektnummer generieren
    const jahr = new Date().getFullYear()
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    const projektnummer = `P-${jahr}-${random}`

    // Projekt aus Angebot erstellen
    const neuesProjekt = {
      projektnummer,
      projektname: angebot.betreff || `Projekt ${projektnummer}`,
      kundeId: angebot.kundeId,
      kundeName: angebot.kundeName,
      angebotId: angebot._id.toString(),
      angebotsnummer: angebot.angebotsnummer,
      angebotssumme: angebot.brutto || 0,
      standort: angebot.kundeAdresse || '',
      status: 'geplant',
      beginn: new Date(),
      ende: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage später
      fortschritt: 0,
      budget: angebot.brutto || 0,
      ausgaben: 0,
      offenerBetrag: angebot.brutto || 0,
      zugewieseneMitarbeiter: [],
      notizen: angebot.einleitung || '',
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }

    const result = await db.collection('projekte').insertOne(neuesProjekt)
    const projektId = result.insertedId.toString()

    // Angebot aktualisieren
    await db.collection('angebote').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          projektId,
          projektnummer,
          zuletztGeaendert: new Date()
        }
      }
    )

    // Anfrage aktualisieren (falls vorhanden)
    if (angebot.anfrageId) {
      await db.collection('anfragen').updateOne(
        { _id: new ObjectId(angebot.anfrageId) },
        {
          $set: {
            projektId,
            zuletztGeaendert: new Date()
          },
          $push: {
            aktivitaeten: {
              aktion: 'Projekt erstellt',
              benutzer: 'admin',
              zeitpunkt: new Date(),
              details: `Projekt ${projektnummer} aus Angebot ${angebot.angebotsnummer} erstellt`
            }
          }
        }
      )
    }

    return NextResponse.json({
      erfolg: true,
      projektId,
      projektnummer,
      nachricht: 'Projekt erfolgreich erstellt'
    })

  } catch (error) {
    console.error('Fehler beim Erstellen des Projekts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
