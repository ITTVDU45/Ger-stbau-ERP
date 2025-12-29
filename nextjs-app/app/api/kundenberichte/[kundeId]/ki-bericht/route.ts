import { NextResponse, NextRequest } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { ZeitraumFilter, KIBerichtSnapshot } from '@/lib/db/types'
import { generiereKIBericht } from '@/lib/services/openaiService'
import { subDays, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subMonths, subQuarters, format } from 'date-fns'
import { de } from 'date-fns/locale'

function getDateRangeFromFilter(filter: ZeitraumFilter): { von: Date; bis: Date } {
  const now = new Date()
  
  switch (filter.typ) {
    case 'letzte_30_tage':
      return { von: subDays(now, 30), bis: now }
    case 'letzte_90_tage':
      return { von: subDays(now, 90), bis: now }
    case 'letztes_jahr':
      return { von: subDays(now, 365), bis: now }
    case 'aktuelles_jahr':
      return { von: startOfYear(now), bis: endOfYear(now) }
    case 'aktuelles_quartal':
      return { von: startOfQuarter(now), bis: endOfQuarter(now) }
    case 'vorjahr':
      const lastYear = subMonths(now, 12)
      return { von: startOfYear(lastYear), bis: endOfYear(lastYear) }
    case 'letztes_quartal':
      const lastQuarter = subQuarters(now, 1)
      return { von: startOfQuarter(lastQuarter), bis: endOfQuarter(lastQuarter) }
    case 'benutzerdefiniert':
      if (!filter.von || !filter.bis) {
        throw new Error('Benutzerdefinierter Zeitraum erfordert von und bis Datum')
      }
      return { von: new Date(filter.von), bis: new Date(filter.bis) }
    default:
      return { von: subDays(now, 30), bis: now }
  }
}

// GET: KI-Bericht abrufen (neueste oder nach ID)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kundeId: string }> }
) {
  try {
    const { kundeId } = await params
    const { searchParams } = new URL(request.url)
    const snapshotId = searchParams.get('snapshotId')
    
    const db = await getDatabase()
    const snapshotsCollection = db.collection<KIBerichtSnapshot>('kundenbericht_snapshots')
    
    let snapshot: KIBerichtSnapshot | null = null
    
    if (snapshotId) {
      // Spezifischen Snapshot abrufen
      snapshot = await snapshotsCollection.findOne({ _id: new ObjectId(snapshotId) })
    } else {
      // Neuesten aktiven Snapshot abrufen
      snapshot = await snapshotsCollection
        .findOne({ kundeId, aktiv: true })
        .sort({ generiertAm: -1 }) as KIBerichtSnapshot | null
    }
    
    if (!snapshot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kein KI-Bericht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true, snapshot })
  } catch (error) {
    console.error('Fehler beim Abrufen des KI-Berichts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Berichts' },
      { status: 500 }
    )
  }
}

// POST: KI-Bericht generieren und speichern
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kundeId: string }> }
) {
  try {
    const { kundeId } = await params
    const body = await request.json()
    const { zeitraumFilter, generiertVon } = body
    
    if (!zeitraumFilter || !generiertVon) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Zeitraum-Filter und Benutzer sind erforderlich' },
        { status: 400 }
      )
    }
    
    const { von, bis } = getDateRangeFromFilter(zeitraumFilter)
    
    const db = await getDatabase()
    
    // 1. Kundendaten abrufen (wie in der Hauptroute)
    const kunde = await db.collection('kunden').findOne({ _id: new ObjectId(kundeId) })
    
    if (!kunde) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }
    
    // 2. Daten für KI-Generierung sammeln
    const anfragen = await db.collection('anfragen').find({
      kundeId,
      erstelltAm: { $gte: von, $lte: bis }
    }).toArray()
    
    const angebote = await db.collection('angebote').find({
      kundeId,
      erstelltAm: { $gte: von, $lte: bis }
    }).toArray()
    
    const rechnungen = await db.collection('rechnungen').find({
      kundeId,
      rechnungsdatum: { $gte: von, $lte: bis }
    }).toArray()
    
    const mahnungen = await db.collection('mahnungen').find({
      kundeId,
      datum: { $gte: von, $lte: bis }
    }).toArray()
    
    const projekte = await db.collection('projekte').find({ kundeId }).toArray()
    
    const rechnungenOffen = rechnungen.filter(r => 
      ['offen', 'ueberfaellig', 'teilweise_bezahlt'].includes(r.status)
    )
    
    const rechnungenBezahlt = rechnungen.filter(r => r.status === 'bezahlt')
    
    const mahnungenOffen = mahnungen.filter(m => 
      ['zur_genehmigung', 'genehmigt', 'versendet'].includes(m.status)
    )
    
    const aktiveProjekte = projekte.filter(p => p.status === 'aktiv')
    const abgeschlosseneProjekte = projekte.filter(p => p.status === 'abgeschlossen')
    
    const gesamtRechnungsbetrag = rechnungen.reduce((sum, r) => sum + (r.brutto || 0), 0)
    const bezahltBetrag = rechnungenBezahlt.reduce((sum, r) => sum + (r.brutto || 0), 0)
    const zahlungsquote = gesamtRechnungsbetrag > 0 
      ? Math.round((bezahltBetrag / gesamtRechnungsbetrag) * 100) 
      : 100
    
    const zahlungszeitenInTagen = rechnungenBezahlt
      .filter(r => r.bezahltAm && r.rechnungsdatum)
      .map(r => {
        const rechnungsDatum = new Date(r.rechnungsdatum)
        const bezahltDatum = new Date(r.bezahltAm!)
        return Math.round((bezahltDatum.getTime() - rechnungsDatum.getTime()) / (1000 * 60 * 60 * 24))
      })
    
    const durchschnittlicheZahlungszeit = zahlungszeitenInTagen.length > 0
      ? Math.round(zahlungszeitenInTagen.reduce((a, b) => a + b, 0) / zahlungszeitenInTagen.length)
      : 0
    
    const kpis = {
      anzahlAnfragen: anfragen.length,
      angebotsvolumen: angebote.reduce((sum, a) => sum + (a.brutto || 0), 0),
      rechnungsvolumen: rechnungen.reduce((sum, r) => sum + (r.brutto || 0), 0),
      offenerBetrag: rechnungenOffen.reduce((sum, r) => sum + (r.brutto || 0), 0),
      mahnungenOffen: mahnungenOffen.length,
      zahlungsquote,
      durchschnittlicheZahlungszeit,
      aktiveProjekte: aktiveProjekte.length,
      abgeschlosseneProjekte: abgeschlosseneProjekte.length,
      gesamtprojekte: projekte.length
    }
    
    // Aktivitäten sammeln (nur eine Auswahl)
    const aktivitaeten = []
    
    for (const anfrage of anfragen.slice(0, 3)) {
      aktivitaeten.push({
        _id: anfrage._id?.toString() || '',
        typ: 'anfrage' as const,
        titel: `Anfrage ${anfrage.anfragenummer}`,
        beschreibung: anfrage.bauvorhaben.objektname || 'Neue Anfrage',
        referenzId: anfrage._id?.toString() || '',
        status: anfrage.status,
        zeitpunkt: anfrage.erstelltAm,
        benutzer: anfrage.erstelltVon || 'System'
      })
    }
    
    for (const angebot of angebote.slice(0, 3)) {
      aktivitaeten.push({
        _id: angebot._id?.toString() || '',
        typ: 'angebot' as const,
        titel: `Angebot ${angebot.angebotsnummer}`,
        beschreibung: `Angebot über ${angebot.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`,
        referenzId: angebot._id?.toString() || '',
        status: angebot.status,
        betrag: angebot.brutto,
        zeitpunkt: angebot.erstelltAm,
        benutzer: angebot.erstelltVon || 'System'
      })
    }
    
    aktivitaeten.sort((a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime())
    
    const kundenDetailBericht = {
      kunde,
      zeitraum: zeitraumFilter,
      kpis,
      aktivitaeten
    }
    
    // 3. KI-Bericht generieren
    const { bericht, tokenCount, generierungsdauer } = await generiereKIBericht({
      kunde: kundenDetailBericht as any,
      anzahlAnfragen: anfragen.length,
      anzahlAngebote: angebote.length,
      anzahlRechnungen: rechnungen.length,
      anzahlProjekte: projekte.length,
      anzahlMahnungen: mahnungen.length,
      gesamtumsatz: bezahltBetrag,
      offenerBetrag: kpis.offenerBetrag
    })
    
    // 4. Snapshot speichern
    const snapshotsCollection = db.collection<KIBerichtSnapshot>('kundenbericht_snapshots')
    
    // Vorherige aktive Snapshots deaktivieren
    await snapshotsCollection.updateMany(
      { kundeId, aktiv: true },
      { $set: { aktiv: false } }
    )
    
    // Aktuellen Snapshot zählen für Versionsnummer
    const existingSnapshots = await snapshotsCollection.countDocuments({ kundeId })
    
    const zeitraumBeschreibung = `${format(von, 'dd.MM.yyyy', { locale: de })} - ${format(bis, 'dd.MM.yyyy', { locale: de })}`
    
    const snapshot: Omit<KIBerichtSnapshot, '_id'> = {
      kundeId,
      kundeName: kunde.firma || `${kunde.vorname} ${kunde.nachname}`,
      zeitraum: zeitraumFilter,
      zeitraumBeschreibung,
      bericht,
      datenSnapshot: {
        anzahlAnfragen: anfragen.length,
        anzahlAngebote: angebote.length,
        anzahlRechnungen: rechnungen.length,
        anzahlProjekte: projekte.length,
        anzahlMahnungen: mahnungen.length,
        gesamtumsatz: bezahltBetrag,
        offenerBetrag: kpis.offenerBetrag
      },
      generiertAm: new Date(),
      generiertVon,
      modelVersion: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      tokenCount,
      generierungsdauer,
      version: existingSnapshots + 1,
      aktiv: true
    }
    
    const result = await snapshotsCollection.insertOne(snapshot as any)
    const savedSnapshot = await snapshotsCollection.findOne({ _id: result.insertedId })
    
    return NextResponse.json({ 
      erfolg: true, 
      snapshot: savedSnapshot,
      nachricht: 'KI-Bericht erfolgreich generiert und gespeichert'
    })
  } catch (error: any) {
    console.error('Fehler bei KI-Bericht-Generierung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Fehler bei der Bericht-Generierung' },
      { status: 500 }
    )
  }
}

// DELETE: KI-Bericht-Snapshot löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kundeId: string }> }
) {
  try {
    const { kundeId } = await params
    const { searchParams } = new URL(request.url)
    const snapshotId = searchParams.get('snapshotId')
    
    if (!snapshotId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Snapshot-ID erforderlich' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const snapshotsCollection = db.collection('kundenbericht_snapshots')
    
    const result = await snapshotsCollection.deleteOne({ 
      _id: new ObjectId(snapshotId),
      kundeId 
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Snapshot nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      nachricht: 'KI-Bericht-Snapshot erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Snapshots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen' },
      { status: 500 }
    )
  }
}

