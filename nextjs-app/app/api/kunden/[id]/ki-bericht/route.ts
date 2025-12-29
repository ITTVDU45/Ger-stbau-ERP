import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { KIBerichtSnapshot } from '@/lib/db/types'
import { generiereKundenbericht } from '@/lib/services/openaiService'
import { ObjectId } from 'mongodb'

// POST - Generiere einen neuen KI-Bericht und speichere ihn
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { zeitraumTyp, von, bis, benutzer } = body

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { erfolg: false, fehler: 'OpenAI API-Key nicht konfiguriert' },
        { status: 500 }
      )
    }

    // Lade Detail-Bericht
    const params2 = new URLSearchParams({
      zeitraumTyp: zeitraumTyp || 'aktuelles_jahr'
    })

    if (zeitraumTyp === 'benutzerdefiniert' && von && bis) {
      params2.append('von', von)
      params2.append('bis', bis)
    }

    const berichtResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/kunden/${id}/detail-bericht?${params2}`
    )
    const berichtData = await berichtResponse.json()

    if (!berichtData.erfolg) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Fehler beim Laden der Kundendaten' },
        { status: 500 }
      )
    }

    const detailBericht = berichtData.bericht

    // Generiere KI-Bericht
    const kiBericht = await generiereKundenbericht(detailBericht)

    // Speichere Snapshot
    const db = await getDatabase()
    const snapshotsCollection = db.collection<KIBerichtSnapshot>('ki_bericht_snapshots')

    // Deaktiviere alle vorherigen Snapshots für diesen Kunden
    await snapshotsCollection.updateMany(
      { kundeId: id, aktiv: true },
      { $set: { aktiv: false } }
    )

    const zeitraumBeschreibung = getZeitraumBeschreibung(
      detailBericht.zeitraum,
      von,
      bis
    )

    const snapshot: KIBerichtSnapshot = {
      kundeId: id,
      kundeName: detailBericht.kunde.firma || `${detailBericht.kunde.vorname || ''} ${detailBericht.kunde.nachname || ''}`.trim(),
      zeitraum: detailBericht.zeitraum,
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
        anzahlAnfragen: detailBericht.kpis.anzahlAnfragen,
        anzahlAngebote: 0, // TODO: Add to KPI
        anzahlRechnungen: 0, // TODO: Add to KPI
        anzahlProjekte: detailBericht.kpis.gesamtprojekte,
        anzahlMahnungen: detailBericht.kpis.mahnungenOffen,
        gesamtumsatz: detailBericht.kpis.rechnungsvolumen,
        offenerBetrag: detailBericht.kpis.offenerBetrag
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
    console.error('Fehler bei der KI-Berichterstellung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error instanceof Error ? error.message : 'Fehler bei der KI-Berichterstellung' },
      { status: 500 }
    )
  }
}

// GET - Lade den neuesten oder einen spezifischen KI-Bericht
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const snapshotId = searchParams.get('snapshotId')

    const db = await getDatabase()
    const snapshotsCollection = db.collection<KIBerichtSnapshot>('ki_bericht_snapshots')

    let snapshot: KIBerichtSnapshot | null

    if (snapshotId) {
      snapshot = await snapshotsCollection.findOne({ _id: new ObjectId(snapshotId) })
    } else {
      snapshot = await snapshotsCollection.findOne(
        { kundeId: id, aktiv: true },
        { sort: { generiertAm: -1 } }
      )
    }

    if (!snapshot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kein Bericht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ erfolg: true, bericht: snapshot })
  } catch (error) {
    console.error('Fehler beim Laden des KI-Berichts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden des KI-Berichts' },
      { status: 500 }
    )
  }
}

function getZeitraumBeschreibung(
  zeitraum: any,
  von?: string,
  bis?: string
): string {
  if (zeitraum.typ === 'benutzerdefiniert' && von && bis) {
    const vonDate = new Date(von)
    const bisDate = new Date(bis)
    return `${vonDate.toLocaleDateString('de-DE')} - ${bisDate.toLocaleDateString('de-DE')}`
  }

  const labels: Record<string, string> = {
    all: 'Alle Daten',
    letzte_30_tage: 'Letzte 30 Tage',
    letzte_90_tage: 'Letzte 90 Tage',
    letztes_jahr: 'Letztes Jahr',
    aktuelles_jahr: 'Aktuelles Jahr',
    aktuelles_quartal: 'Aktuelles Quartal',
    vorjahr: 'Vorjahr',
    letztes_quartal: 'Letztes Quartal'
  }

  return labels[zeitraum.typ] || 'Unbekannter Zeitraum'
}

