import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Anfrage zu Projekt zuweisen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Anfrage-ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { projektId, neuesProjekt } = body

    if (!projektId && !neuesProjekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Bitte wählen Sie ein Projekt aus oder erstellen Sie ein neues' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Anfrage laden
    const anfrage = await db.collection('anfragen').findOne({ _id: new ObjectId(id) })
    
    if (!anfrage) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Anfrage nicht gefunden' },
        { status: 404 }
      )
    }

    let finalProjektId = projektId
    let projektnummer = ''

    // Falls neues Projekt erstellt werden soll
    if (neuesProjekt) {
      // Projektnummer generieren
      const jahr = new Date().getFullYear()
      const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
      projektnummer = `P-${jahr}-${random}`

      // Neues Projekt erstellen mit Daten aus Anfrage
      const neuesProjektDaten = {
        projektnummer,
        projektname: neuesProjekt.projektname,
        kundeId: anfrage.kundeId,
        kundeName: anfrage.kundeName,
        kundenAnsprechpartner: anfrage.ansprechpartner,
        anfrageIds: [id],
        bauvorhaben: {
          adresse: anfrage.bauvorhaben.strasse || '',
          plz: anfrage.bauvorhaben.plz || '',
          ort: anfrage.bauvorhaben.ort || '',
          beschreibung: anfrage.bauvorhaben.objektname || '',
          arbeitstypen: {
            dach: anfrage.artDerArbeiten.dachdecker || false,
            fassade: anfrage.artDerArbeiten.fassade || false,
            daemmung: anfrage.artDerArbeiten.daemmung || false,
            sonderaufbau: anfrage.artDerArbeiten.sonstige || false,
            beschreibung: anfrage.artDerArbeiten.sonstigeText || ''
          },
          geruestseiten: {
            vorderseite: anfrage.geruestseiten.vorderseite || false,
            rueckseite: anfrage.geruestseiten.rueckseite || false,
            rechts: anfrage.geruestseiten.rechteSeite || false,
            links: anfrage.geruestseiten.linkeSeite || false,
            gesamtflaeche: anfrage.geruestseiten.gesamtflaeche || 0
          },
          besonderheiten: anfrage.bauvorhaben.besonderheiten || '',
          zufahrtsbeschraenkungen: '',
          bauzeitraum: '',
          sicherheitsanforderungen: ''
        },
        status: 'in_planung',
        zugewieseneMitarbeiter: [],
        dokumente: [],
        aktivitaeten: [{
          aktion: 'Projekt erstellt',
          benutzer: 'admin',
          zeitpunkt: new Date(),
          details: `Projekt aus Anfrage ${anfrage.anfragenummer} erstellt`
        }],
        erstelltAm: new Date(),
        zuletztGeaendert: new Date(),
        erstelltVon: 'admin'
      }

      const result = await db.collection('projekte').insertOne(neuesProjektDaten)
      finalProjektId = result.insertedId.toString()
    } else {
      // Bestehendes Projekt aktualisieren
      const projekt = await db.collection('projekte').findOne({ _id: new ObjectId(projektId) })
      
      if (!projekt) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Projekt nicht gefunden' },
          { status: 404 }
        )
      }

      projektnummer = projekt.projektnummer

      // Füge anfrageId zu Projekt hinzu
      await db.collection('projekte').updateOne(
        { _id: new ObjectId(projektId) },
        {
          $addToSet: { anfrageIds: id },
          $set: { zuletztGeaendert: new Date() },
          $push: {
            aktivitaeten: {
              aktion: 'Anfrage zugewiesen',
              benutzer: 'admin',
              zeitpunkt: new Date(),
              details: `Anfrage ${anfrage.anfragenummer} wurde dem Projekt zugewiesen`
            }
          }
        }
      )
    }

    // Anfrage mit projektId aktualisieren
    await db.collection('anfragen').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          projektId: finalProjektId,
          zuletztGeaendert: new Date()
        },
        $push: {
          aktivitaeten: {
            aktion: 'Zu Projekt zugewiesen',
            benutzer: 'admin',
            zeitpunkt: new Date(),
            details: `Anfrage wurde zu Projekt ${projektnummer} zugewiesen`
          }
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      projektId: finalProjektId,
      projektnummer,
      nachricht: neuesProjekt 
        ? 'Neues Projekt erstellt und Anfrage zugewiesen'
        : 'Anfrage zu Projekt zugewiesen'
    })

  } catch (error) {
    console.error('Fehler beim Zuweisen der Anfrage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

