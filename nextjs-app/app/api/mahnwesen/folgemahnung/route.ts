import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Mahnung, Rechnung } from '@/lib/db/types'
import { addDays } from 'date-fns'

/**
 * POST /api/mahnwesen/folgemahnung
 * 
 * Erstellt eine Folgemahnung aus einer bestehenden Mahnung
 * 
 * Body: {
 *   parentMahnungId: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parentMahnungId } = body

    // Validierung
    if (!parentMahnungId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Parent-Mahnung-ID ist erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mahnungenCollection = db.collection<Mahnung>('mahnungen')
    const rechnungenCollection = db.collection<Rechnung>('rechnungen')
    const settingsCollection = db.collection('mahnwesen_settings')

    // 0. Einstellungen laden
    const settings = await settingsCollection.findOne({ aktiv: true })

    // 1. Parent-Mahnung abrufen
    const parent = await mahnungenCollection.findOne({ _id: new ObjectId(parentMahnungId) })
    if (!parent) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Parent-Mahnung nicht gefunden' },
        { status: 404 }
      )
    }

    // 2. Validierungen
    if (parent.status !== 'versendet') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Parent-Mahnung muss versendet sein' },
        { status: 400 }
      )
    }

    if (parent.mahnstufe >= 3) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Maximale Mahnstufe 3 erreicht' },
        { status: 400 }
      )
    }

    if (parent.childMahnungId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Folgemahnung existiert bereits' },
        { status: 400 }
      )
    }

    // 3. Rechnung prüfen
    const rechnung = await rechnungenCollection.findOne({ _id: new ObjectId(parent.rechnungId) })
    if (!rechnung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    if (rechnung.status === 'bezahlt') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Rechnung ist bereits bezahlt. Keine Mahnung möglich.' },
        { status: 400 }
      )
    }

    // 4. Offenen Betrag berechnen
    let offenerBetrag = rechnung.brutto
    if (rechnung.status === 'teilweise_bezahlt' && rechnung.bezahltBetrag) {
      offenerBetrag = rechnung.brutto - rechnung.bezahltBetrag
    }

    // 5. Neue Mahnung erstellen
    const neueMahnstufe = (parent.mahnstufe + 1) as 1 | 2 | 3
    
    // Mahngebühren und Zahlungsfrist aus Einstellungen
    let mahngebuehren = 0
    let zahlungsziel = 7
    let verzugszinsen = 0
    
    if (settings) {
      const gebuehrenField = `mahngebuehrenStufe${neueMahnstufe}` as keyof typeof settings
      mahngebuehren = (settings[gebuehrenField] as number) || 0
      
      const fristField = `zahlungsfristStufe${neueMahnstufe}` as keyof typeof settings
      zahlungsziel = (settings[fristField] as number) || 7
      
      verzugszinsen = settings.verzugszinssatz || 0
    } else {
      // Fallback auf Standard-Werte
      mahngebuehren = neueMahnstufe === 1 ? 5.0 : neueMahnstufe === 2 ? 15.0 : 25.0
    }
    
    // Mahnungsnummer generieren: M-YYYY-XXXX
    const year = new Date().getFullYear()
    const count = await mahnungenCollection.countDocuments({
      mahnungsnummer: { $regex: `^M-${year}-` }
    })
    const mahnungsnummer = `M-${year}-${String(count + 1).padStart(4, '0')}`

    // Mahnungstext-Template generieren
    let mahnungstext = generateMahnungstextTemplate(neueMahnstufe, parent, rechnung)
    
    // Verwende Standard-Text aus Einstellungen, falls vorhanden
    if (settings) {
      const textField = `standardTextStufe${neueMahnstufe}` as keyof typeof settings
      const standardText = settings[textField] as string
      if (standardText && standardText.trim() !== '') {
        mahnungstext = standardText
      }
    }

    const neueMahnung: Omit<Mahnung, '_id'> = {
      rechnungId: parent.rechnungId,
      rechnungsnummer: parent.rechnungsnummer,
      projektId: parent.projektId,
      projektName: parent.projektName,
      kundeId: parent.kundeId,
      kundeName: parent.kundeName,
      
      mahnungsnummer,
      mahnstufe: neueMahnstufe,
      parentMahnungId: parent._id!.toString(),
      datum: new Date(),
      
      rechnungsbetrag: rechnung.brutto,
      offenerBetrag,
      mahngebuehren,
      verzugszinsen,
      gesamtforderung: offenerBetrag + mahngebuehren + verzugszinsen,
      
      zahlungsziel,
      faelligAm: addDays(new Date(), zahlungsziel),
      
      status: 'zur_genehmigung', // Manual approval!
      genehmigung: {
        status: 'ausstehend'
      },
      
      mahnungstext,
      mahnungstextVersion: 1,
      
      chronik: [{
        aktion: 'erstellt',
        benutzer: 'System', // TODO: Aus Session holen
        zeitpunkt: new Date(),
        details: `Folgemahnung ${neueMahnstufe} erstellt aus Mahnung ${parent.mahnstufe}`,
        verknuepfteMahnungId: parent._id!.toString()
      }],
      
      erstelltAm: new Date(),
      zuletztGeaendert: new Date(),
      erstelltVon: 'System' // TODO: Aus Session holen
    }

    // 6. Neue Mahnung speichern
    const result = await mahnungenCollection.insertOne(neueMahnung as any)
    const neueMahnungId = result.insertedId.toString()

    // 7. Parent-Mahnung aktualisieren
    await mahnungenCollection.updateOne(
      { _id: parent._id },
      {
        $set: { 
          childMahnungId: neueMahnungId,
          zuletztGeaendert: new Date()
        },
        $push: {
          chronik: {
            aktion: 'folgemahnung_erstellt',
            benutzer: 'System', // TODO: Aus Session holen
            zeitpunkt: new Date(),
            details: `Folgemahnung ${neueMahnstufe} erstellt`,
            verknuepfteMahnungId: neueMahnungId
          }
        } as any
      }
    )

    return NextResponse.json({
      erfolg: true,
      mahnung: {
        ...neueMahnung,
        _id: neueMahnungId
      },
      parentMahnung: parent
    })

  } catch (error) {
    console.error('Fehler beim Erstellen der Folgemahnung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

/**
 * Generiert ein Mahnungstext-Template basierend auf der Mahnstufe
 */
function generateMahnungstextTemplate(
  mahnstufe: 1 | 2 | 3,
  parent: Mahnung,
  rechnung: Rechnung
): string {
  const templates = {
    1: `Sehr geehrte Damen und Herren,

wir haben festgestellt, dass die Rechnung ${rechnung.rechnungsnummer} über ${rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € trotz Fälligkeit noch nicht beglichen wurde.

Bitte überweisen Sie den offenen Betrag innerhalb von 7 Tagen auf unser Konto.

Mit freundlichen Grüßen`,

    2: `Sehr geehrte Damen und Herren,

trotz unserer ersten Mahnung vom ${new Date(parent.datum).toLocaleDateString('de-DE')} haben wir noch keine Zahlung für die Rechnung ${rechnung.rechnungsnummer} über ${rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € erhalten.

Wir bitten Sie dringend, den offenen Betrag innerhalb von 7 Tagen zu begleichen, um weitere rechtliche Schritte zu vermeiden.

Mit freundlichen Grüßen`,

    3: `Sehr geehrte Damen und Herren,

trotz mehrfacher Mahnung (zuletzt am ${new Date(parent.datum).toLocaleDateString('de-DE')}) haben wir noch keine Zahlung für die Rechnung ${rechnung.rechnungsnummer} über ${rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € erhalten.

Dies ist unsere letzte Mahnung. Sollten wir innerhalb von 7 Tagen keine Zahlung erhalten, werden wir rechtliche Schritte einleiten.

Mit freundlichen Grüßen`
  }

  return templates[mahnstufe]
}

