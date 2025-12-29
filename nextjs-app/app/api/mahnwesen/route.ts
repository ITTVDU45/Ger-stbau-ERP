import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

/**
 * GET /api/mahnwesen
 * Liefert alle Mahnungen mit optionalen Filtern
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const mahnstufe = searchParams.get('mahnstufe')
    const kundeId = searchParams.get('kundeId')
    const projektId = searchParams.get('projektId')
    const genehmigungStatus = searchParams.get('genehmigungStatus')

    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')

    // Build filter object
    const filter: any = {}
    if (status) filter.status = status
    if (mahnstufe) filter.mahnstufe = parseInt(mahnstufe)
    if (kundeId) filter.kundeId = kundeId
    if (projektId) filter.projektId = projektId
    if (genehmigungStatus) filter['genehmigung.status'] = genehmigungStatus

    const mahnungen = await mahnungenCollection
      .find(filter)
      .sort({ erstelltAm: -1 })
      .toArray()

    const gesamt = await mahnungenCollection.countDocuments(filter)

    return NextResponse.json({
      erfolg: true,
      mahnungen,
      gesamt
    })
  } catch (error) {
    console.error('[GET /api/mahnwesen] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Mahnungen',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mahnwesen
 * Erstellt eine neue Mahnung
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      rechnungId,
      mahnstufe,
      mahnungstext
    } = body
    
    let { mahngebuehren, verzugszinsen, zahlungsziel } = body

    // Validierung
    if (!rechnungId || !mahnstufe) {
      return NextResponse.json(
        {
          erfolg: false,
          fehler: 'Pflichtfelder fehlen: rechnungId, mahnstufe'
        },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const rechnungenCollection = db.collection('rechnungen')
    const mahnungenCollection = db.collection('mahnungen')
    const settingsCollection = db.collection('mahnwesen_settings')
    
    // Lade Einstellungen
    const settings = await settingsCollection.findOne({ aktiv: true })
    
    // Verwende Einstellungen falls Werte nicht explizit übergeben wurden
    if (mahngebuehren === undefined && settings) {
      const fieldName = `mahngebuehrenStufe${mahnstufe}` as keyof typeof settings
      mahngebuehren = settings[fieldName] as number || 0
    } else if (mahngebuehren === undefined) {
      // Fallback auf Standard-Werte
      mahngebuehren = mahnstufe === 1 ? 5.0 : mahnstufe === 2 ? 15.0 : 25.0
    }
    
    if (zahlungsziel === undefined && settings) {
      const fieldName = `zahlungsfristStufe${mahnstufe}` as keyof typeof settings
      zahlungsziel = settings[fieldName] as number || 7
    } else if (zahlungsziel === undefined) {
      zahlungsziel = 7 // Fallback
    }
    
    if (verzugszinsen === undefined && settings) {
      verzugszinsen = settings.verzugszinssatz || 0
    }

    // Lade Rechnungsdetails
    const rechnung = await rechnungenCollection.findOne({ _id: new ObjectId(rechnungId) })
    if (!rechnung) {
      return NextResponse.json(
        {
          erfolg: false,
          fehler: 'Rechnung nicht gefunden'
        },
        { status: 404 }
      )
    }

    // Lade Projekt- und Kundendetails
    const projektCollection = db.collection('projekte')
    const kundenCollection = db.collection('kunden')

    const projekt = rechnung.projektId 
      ? await projektCollection.findOne({ _id: new ObjectId(rechnung.projektId) })
      : null

    const kunde = await kundenCollection.findOne({ _id: new ObjectId(rechnung.kundeId) })

    // Prüfe Mahnungs-Berechtigung
    if (kunde?.mahnwesen?.mahnung_erlaubt === false) {
      // Prüfe Projekt-Override
      if (!projekt?.mahnwesen_override?.mahnung_erlaubt) {
        return NextResponse.json(
          {
            erfolg: false,
            fehler: 'Mahnung für diesen Kunden nicht erlaubt',
            details: kunde.mahnwesen.mahnung_gesperrt_grund || 'Kunde ist für Mahnungen gesperrt'
          },
          { status: 403 }
        )
      }
    }

    // Generiere Mahnungsnummer
    const count = await mahnungenCollection.countDocuments()
    const mahnungsnummer = `M-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    // Berechne Fälligkeitsdatum
    const heute = new Date()
    const faelligAm = new Date(heute)
    faelligAm.setDate(faelligAm.getDate() + zahlungsziel)

    // Erstelle Mahnung
    const neueMahnung = {
      rechnungId: rechnung._id.toString(),
      rechnungsnummer: rechnung.rechnungsnummer,
      projektId: rechnung.projektId || '',
      projektName: projekt?.projektname || '',
      kundeId: rechnung.kundeId,
      kundeName: rechnung.kundeName,
      mahnungsnummer,
      mahnstufe,
      datum: heute,
      rechnungsbetrag: rechnung.brutto || 0,
      offenerBetrag: rechnung.brutto - (rechnung.bezahltBetrag || 0),
      mahngebuehren,
      verzugszinsen: verzugszinsen || 0,
      gesamtforderung: (rechnung.brutto - (rechnung.bezahltBetrag || 0)) + mahngebuehren + (verzugszinsen || 0),
      zahlungsziel,
      faelligAm,
      status: 'zur_genehmigung',
      genehmigung: {
        status: 'ausstehend'
      },
      mahnungstext,
      mahnungstextVersion: 1,
      chronik: [
        {
          aktion: 'erstellt',
          benutzer: 'admin', // TODO: Von Session holen
          zeitpunkt: heute,
          details: `Mahnung erstellt (Mahnstufe ${mahnstufe})`
        }
      ],
      erstelltAm: heute,
      zuletztGeaendert: heute,
      erstelltVon: 'admin' // TODO: Von Session holen
    }

    const result = await mahnungenCollection.insertOne(neueMahnung)

    // Update Rechnung mit Mahnstufe
    await rechnungenCollection.updateOne(
      { _id: new ObjectId(rechnungId) },
      {
        $set: {
          mahnstufe,
          letzeMahnungAm: heute
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      mahnung: {
        ...neueMahnung,
        _id: result.insertedId.toString()
      }
    })
  } catch (error) {
    console.error('[POST /api/mahnwesen] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Erstellen der Mahnung',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

