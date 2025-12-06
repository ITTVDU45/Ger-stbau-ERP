import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Bauvorhabeninformationen aus Anfrage nachträglich laden
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Projekt laden
    const projekt = await db.collection('projekte').findOne({ _id: new ObjectId(id) })
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // Angebot laden (falls vorhanden)
    let angebotAdresse: string | null = null
    let anfrageId: string | null = null
    
    if (projekt.angebotId) {
      const angebotIdObj = typeof projekt.angebotId === 'string' 
        ? new ObjectId(projekt.angebotId) 
        : projekt.angebotId
      
      const angebot = await db.collection('angebote').findOne({ _id: angebotIdObj })
      if (angebot) {
        angebotAdresse = angebot.kundeAdresse || null
        anfrageId = angebot.anfrageId || null
      }
    }
    
    // Direkt aus projekt.anfrageIds holen (falls vorhanden)
    if (!anfrageId && projekt.anfrageIds && projekt.anfrageIds.length > 0) {
      anfrageId = projekt.anfrageIds[0]
    }

    // Bauvorhabeninformationen erstellen
    let bauvorhaben: any = {
      adresse: '',
      plz: '',
      ort: '',
      beschreibung: '',
      arbeitstypen: {
        dach: false,
        fassade: false,
        daemmung: false,
        sonderaufbau: false,
        beschreibung: ''
      },
      geruestseiten: {
        vorderseite: false,
        rueckseite: false,
        rechts: false,
        links: false,
        gesamtflaeche: 0
      },
      besonderheiten: '',
      zufahrtsbeschraenkungen: projekt.bauvorhaben?.zufahrtsbeschraenkungen || '',
      bauzeitraum: projekt.bauvorhaben?.bauzeitraum || '',
      sicherheitsanforderungen: projekt.bauvorhaben?.sicherheitsanforderungen || ''
    }

    // Priorität 1: Aus Anfrage laden (vollständige Daten)
    if (anfrageId) {
      const anfrage = await db.collection('anfragen').findOne({ 
        _id: new ObjectId(anfrageId) 
      })

      if (anfrage) {
        bauvorhaben = {
          adresse: anfrage.bauvorhaben?.strasse || angebotAdresse || '',
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
          zufahrtsbeschraenkungen: projekt.bauvorhaben?.zufahrtsbeschraenkungen || '',
          bauzeitraum: projekt.bauvorhaben?.bauzeitraum || '',
          sicherheitsanforderungen: projekt.bauvorhaben?.sicherheitsanforderungen || ''
        }
        console.log(`[Bauvorhaben-Aktualisierung] Daten aus Anfrage ${anfrageId} übernommen`)
      }
    }
    
    // Priorität 2: Falls keine Anfrage, nur Angebots-Adresse verwenden
    if (!anfrageId && angebotAdresse) {
      bauvorhaben.adresse = angebotAdresse
      bauvorhaben.beschreibung = projekt.projektname || ''
      console.log(`[Bauvorhaben-Aktualisierung] Nur Adresse aus Angebot übernommen: ${angebotAdresse}`)
    }

    // Prüfen ob überhaupt Daten vorhanden sind
    if (!bauvorhaben.adresse && !angebotAdresse && !anfrageId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Bauvorhabeninformationen in Angebot oder Anfrage gefunden' },
        { status: 400 }
      )
    }

    // Projekt aktualisieren
    await db.collection('projekte').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          bauvorhaben,
          zuletztGeaendert: new Date()
        },
        $push: {
          aktivitaeten: {
            aktion: 'Bauvorhabeninformationen aktualisiert',
            benutzer: 'system',
            zeitpunkt: new Date(),
            details: `Bauvorhabeninformationen automatisch aus Anfrage übernommen`,
            typ: 'projekt'
          }
        } as any
      }
    )

    console.log(`[Bauvorhaben-Aktualisierung] Projekt ${id} mit Daten aus Anfrage ${anfrageId} aktualisiert`)

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Bauvorhabeninformationen erfolgreich aktualisiert',
      bauvorhaben
    })

  } catch (error) {
    console.error('Fehler beim Aktualisieren der Bauvorhabeninformationen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

