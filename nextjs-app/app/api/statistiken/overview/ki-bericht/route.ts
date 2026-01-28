import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { generiereOverviewBericht } from '@/lib/services/openaiService'
import { KIBerichtSnapshot } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// POST - Generiere einen neuen KI-Bericht und speichere ihn
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { zeitraumTyp, von, bis, benutzer } = body

    // Prüfe ob API-Key gesetzt ist (nur grundlegende Validierung)
    // In Produktion wird der Key automatisch aus der Umgebungsvariable OPENAI_API_KEY geladen
    const apiKey = process.env.OPENAI_API_KEY
    // Nur prüfen ob Key vorhanden und nicht offensichtlicher Platzhalter
    const isPlaceholder = !apiKey || 
                         apiKey.trim() === '' || 
                         apiKey.includes('your-ope') || 
                         apiKey === 'sk-placeholder' || 
                         apiKey.startsWith('your-') ||
                         apiKey === 'your-openai-api-key'
    
    if (isPlaceholder) {
      return NextResponse.json(
        { 
          erfolg: false, 
          fehler: 'OpenAI API-Key nicht konfiguriert. Bitte setzen Sie die OPENAI_API_KEY Umgebungsvariable. In der Produktionsumgebung wird der Key automatisch aus der Umgebungsvariable geladen.' 
        },
        { status: 500 }
      )
    }

    // Lade Overview-Daten
    const params = new URLSearchParams()
    if (von && bis) {
      params.append('von', von)
      params.append('bis', bis)
    }

    const overviewResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/statistiken/overview?${params}`
    )
    const overviewData = await overviewResponse.json()

    if (!overviewData.erfolg) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Fehler beim Laden der Overview-Daten' },
        { status: 500 }
      )
    }

    // Generiere KI-Bericht
    const kiBericht = await generiereOverviewBericht(overviewData.data)

    // Speichere Snapshot
    const db = await getDatabase()
    const snapshotsCollection = db.collection<KIBerichtSnapshot>('ki_bericht_snapshots')

    // Deaktiviere alle vorherigen Overview-Snapshots
    await snapshotsCollection.updateMany(
      { typ: 'overview', aktiv: true },
      { $set: { aktiv: false } }
    )

    const zeitraumBeschreibung = getZeitraumBeschreibung(zeitraumTyp, von, bis)

    const snapshot: KIBerichtSnapshot = {
      typ: 'overview',
      zeitraum: {
        typ: zeitraumTyp || 'monat',
        von: von ? new Date(von) : undefined,
        bis: bis ? new Date(bis) : undefined
      },
      zeitraumBeschreibung,
      bericht: {
        executiveSummary: kiBericht.executiveSummary,
        aktivitaeten: kiBericht.aktivitaeten,
        finanzen: kiBericht.finanzen,
        projekte: kiBericht.projekte,
        risikenUndEmpfehlungen: kiBericht.risikenUndEmpfehlungen,
        highlights: kiBericht.highlights,
        offenePunkte: kiBericht.offenePunkte,
        naechsteSchritte: kiBericht.naechsteSchritte
      },
      datenSnapshot: {
        anzahlProjekte: overviewData.data.overview.find((k: any) => k.id === 'aktive-projekte')?.wert || 0,
        anzahlMitarbeiter: overviewData.data.overview.find((k: any) => k.id === 'aktive-mitarbeiter')?.wert || 0,
        gesamtumsatz: overviewData.data.overview.find((k: any) => k.id === 'umsatz')?.wert || 0,
        offenerBetrag: overviewData.data.overview.find((k: any) => k.id === 'offene-rechnungen')?.untertitel?.match(/[\d.,]+/) ? 
          parseFloat(overviewData.data.overview.find((k: any) => k.id === 'offene-rechnungen')?.untertitel?.replace(/[^\d.,]/g, '').replace(',', '.') || '0') : 0
      },
      generiertAm: new Date(),
      generiertVon: benutzer || 'system',
      modelVersion: 'gpt-4-turbo-preview',
      tokenCount: kiBericht.tokenCount,
      generierungsdauer: kiBericht.generierungsdauer,
      version: 1,
      aktiv: true
    }

    const result = await snapshotsCollection.insertOne(snapshot)
    const gespeicherterSnapshot = await snapshotsCollection.findOne({ _id: result.insertedId })

    return NextResponse.json({
      erfolg: true,
      bericht: gespeicherterSnapshot
    })
  } catch (error) {
    console.error('[POST /api/statistiken/overview/ki-bericht] Fehler:', error)
    
    // Spezifische Fehlermeldungen für bessere UX
    let fehlermeldung = 'Fehler bei der KI-Berichterstellung'
    
    if (error instanceof Error) {
      fehlermeldung = error.message
      
      // Übersetze technische Fehler in benutzerfreundliche Meldungen
      if (error.message.includes('API-Key') || error.message.includes('invalid_api_key')) {
        fehlermeldung = 'OpenAI API-Key ist ungültig oder nicht konfiguriert. Bitte überprüfen Sie die Umgebungsvariable OPENAI_API_KEY in Ihrer .env-Datei.'
      } else if (error.message.includes('Rate-Limit') || error.message.includes('429')) {
        fehlermeldung = 'OpenAI API-Rate-Limit erreicht. Bitte versuchen Sie es in ein paar Minuten erneut.'
      }
    }
    
    return NextResponse.json(
      { erfolg: false, fehler: fehlermeldung },
      { status: 500 }
    )
  }
}

// GET - Lade den neuesten Overview-KI-Bericht
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const snapshotId = searchParams.get('snapshotId')

    const db = await getDatabase()
    const snapshotsCollection = db.collection<KIBerichtSnapshot>('ki_bericht_snapshots')

    let snapshot: KIBerichtSnapshot | null

    if (snapshotId) {
      if (!ObjectId.isValid(snapshotId)) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Ungültige Snapshot-ID' },
          { status: 400 }
        )
      }
      snapshot = await snapshotsCollection.findOne({ _id: new ObjectId(snapshotId) })
    } else {
      snapshot = await snapshotsCollection.findOne(
        { typ: 'overview', aktiv: true },
        { sort: { generiertAm: -1 } }
      )
    }

    if (!snapshot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kein Bericht gefunden', bericht: null },
        { status: 200 }
      )
    }

    return NextResponse.json({ erfolg: true, bericht: snapshot })
  } catch (error) {
    console.error('[GET /api/statistiken/overview/ki-bericht] Fehler:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden des KI-Berichts' },
      { status: 500 }
    )
  }
}

function getZeitraumBeschreibung(
  zeitraumTyp?: string,
  von?: string,
  bis?: string
): string {
  if (zeitraumTyp === 'custom' && von && bis) {
    const vonDate = new Date(von)
    const bisDate = new Date(bis)
    return `${vonDate.toLocaleDateString('de-DE')} - ${bisDate.toLocaleDateString('de-DE')}`
  }

  const labels: Record<string, string> = {
    tag: 'Heute',
    woche: 'Diese Woche',
    monat: 'Dieser Monat',
    quartal: 'Dieses Quartal',
    jahr: 'Dieses Jahr',
    custom: 'Benutzerdefiniert'
  }

  return labels[zeitraumTyp || 'monat'] || 'Unbekannter Zeitraum'
}
