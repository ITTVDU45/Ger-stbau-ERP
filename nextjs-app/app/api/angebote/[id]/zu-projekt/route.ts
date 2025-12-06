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

    // Bauvorhabeninformationen von Anfrage holen (falls vorhanden)
    let bauvorhaben: any = {
      adresse: angebot.kundeAdresse || '',
      plz: '',
      ort: '',
      beschreibung: `Automatisch erstellt aus Angebot ${angebot.angebotsnummer}`,
      arbeitstypen: {
        dach: false,
        fassade: false,
        daemmung: false,
        sonderaufbau: false
      },
      geruestseiten: {
        vorderseite: false,
        rueckseite: false,
        rechts: false,
        links: false
      }
    }
    
    // Falls Angebot von einer Anfrage stammt, Bauvorhabeninformationen übernehmen
    if (angebot.anfrageId) {
      try {
        const anfrage = await db.collection('anfragen').findOne({ _id: new ObjectId(angebot.anfrageId) })
        if (anfrage) {
          bauvorhaben = {
            adresse: anfrage.bauvorhaben?.strasse || '',
            plz: anfrage.bauvorhaben?.plz || '',
            ort: anfrage.bauvorhaben?.ort || '',
            beschreibung: anfrage.bauvorhaben?.objektname || '',
            arbeitstypen: {
              dach: anfrage.artDerArbeiten?.dachdecker || false,
              fassade: anfrage.artDerArbeiten?.fassade || false,
              daemmung: anfrage.artDerArbeiten?.daemmung || false,
              sonderaufbau: anfrage.artDerArbeiten?.sonstige || false,
              beschreibung: anfrage.artDerArbeiten?.sonstigeText || ''
            },
            geruestseiten: {
              vorderseite: anfrage.geruestseiten?.vorderseite || false,
              rueckseite: anfrage.geruestseiten?.rueckseite || false,
              rechts: anfrage.geruestseiten?.rechteSeite || false,
              links: anfrage.geruestseiten?.linkeSeite || false,
              gesamtflaeche: anfrage.geruestseiten?.gesamtflaeche || 0
            },
            besonderheiten: anfrage.bauvorhaben?.besonderheiten || '',
            zufahrtsbeschraenkungen: '',
            bauzeitraum: '',
            sicherheitsanforderungen: ''
          }
          console.log(`[Zu-Projekt] Bauvorhabeninformationen von Anfrage ${angebot.anfrageId} übernommen`)
        }
      } catch (error) {
        console.error('[Zu-Projekt] Fehler beim Laden der Anfrage:', error)
      }
    }

    // Projekt aus Angebot erstellen
    const neuesProjekt = {
      projektnummer,
      projektname: angebot.betreff || `Projekt ${projektnummer}`,
      kundeId: angebot.kundeId,
      kundeName: angebot.kundeName,
      angebotId: angebot._id.toString(),
      angebotsnummer: angebot.angebotsnummer,
      anfrageIds: angebot.anfrageId ? [angebot.anfrageId] : [],
      bauvorhaben,
      angebotssumme: angebot.brutto || 0,
      status: 'in_planung',
      startdatum: new Date(),
      enddatum: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage später
      fortschritt: 0,
      budget: angebot.brutto || 0,
      istKosten: 0,
      offenerBetrag: angebot.brutto || 0,
      bereitsAbgerechnet: 0,
      zugewieseneMitarbeiter: [],
      dokumente: [],
      aktivitaeten: [{
        aktion: 'Projekt erstellt',
        benutzer: 'admin',
        zeitpunkt: new Date(),
        details: `Projekt aus Angebot ${angebot.angebotsnummer} erstellt`
      }],
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
