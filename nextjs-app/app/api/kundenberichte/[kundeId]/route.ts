import { NextResponse, NextRequest } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ZeitraumFilter, KundenDetailBericht } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns'

// Hilfsfunktion: Zeitraum-Filter zu Date-Range konvertieren
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kundeId: string }> }
) {
  try {
    const { kundeId } = await params
    const { searchParams } = new URL(request.url)
    
    // Zeitraum-Filter aus Query-Parametern
    const filterTyp = searchParams.get('filterTyp') || 'letzte_30_tage'
    const vonParam = searchParams.get('von')
    const bisParam = searchParams.get('bis')
    
    const zeitraumFilter: ZeitraumFilter = {
      typ: filterTyp as any,
      von: vonParam ? new Date(vonParam) : undefined,
      bis: bisParam ? new Date(bisParam) : undefined
    }
    
    const { von, bis } = getDateRangeFromFilter(zeitraumFilter)
    
    const db = await getDatabase()
    
    // 1. Kunde abrufen
    const kunde = await db.collection('kunden').findOne({ _id: new ObjectId(kundeId) })
    
    if (!kunde) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }
    
    // 2. KPIs berechnen
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
    
    const rechnungenOffen = rechnungen.filter(r => 
      ['offen', 'ueberfaellig', 'teilweise_bezahlt'].includes(r.status)
    )
    
    const rechnungenBezahlt = rechnungen.filter(r => r.status === 'bezahlt')
    
    const mahnungen = await db.collection('mahnungen').find({
      kundeId,
      datum: { $gte: von, $lte: bis }
    }).toArray()
    
    const mahnungenOffen = mahnungen.filter(m => 
      ['zur_genehmigung', 'genehmigt', 'versendet'].includes(m.status)
    )
    
    const projekte = await db.collection('projekte').find({
      kundeId
    }).toArray()
    
    const aktiveProjekte = projekte.filter(p => p.status === 'aktiv')
    const abgeschlosseneProjekte = projekte.filter(p => p.status === 'abgeschlossen')
    
    // Zahlungsquote berechnen
    const gesamtRechnungsbetrag = rechnungen.reduce((sum, r) => sum + (r.brutto || 0), 0)
    const bezahltBetrag = rechnungenBezahlt.reduce((sum, r) => sum + (r.brutto || 0), 0)
    const zahlungsquote = gesamtRechnungsbetrag > 0 
      ? Math.round((bezahltBetrag / gesamtRechnungsbetrag) * 100) 
      : 100
    
    // Durchschnittliche Zahlungszeit
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
    
    // 3. Aktivitäts-Timeline erstellen (letzte 20 Aktivitäten)
    const aktivitaeten = []
    
    // Anfragen
    for (const anfrage of anfragen.slice(0, 5)) {
      aktivitaeten.push({
        _id: anfrage._id?.toString() || '',
        typ: 'anfrage' as const,
        titel: `Anfrage ${anfrage.anfragenummer}`,
        beschreibung: anfrage.bauvorhaben.objektname || 'Neue Anfrage erstellt',
        referenzId: anfrage._id?.toString() || '',
        status: anfrage.status,
        zeitpunkt: anfrage.erstelltAm,
        benutzer: anfrage.erstelltVon || 'System'
      })
    }
    
    // Angebote
    for (const angebot of angebote.slice(0, 5)) {
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
    
    // Rechnungen
    for (const rechnung of rechnungen.slice(0, 5)) {
      aktivitaeten.push({
        _id: rechnung._id?.toString() || '',
        typ: 'rechnung' as const,
        titel: `Rechnung ${rechnung.rechnungsnummer}`,
        beschreibung: `Rechnung über ${rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`,
        referenzId: rechnung._id?.toString() || '',
        status: rechnung.status,
        betrag: rechnung.brutto,
        zeitpunkt: rechnung.rechnungsdatum,
        benutzer: rechnung.erstelltVon || 'System'
      })
    }
    
    // Mahnungen
    for (const mahnung of mahnungen.slice(0, 5)) {
      aktivitaeten.push({
        _id: mahnung._id?.toString() || '',
        typ: 'mahnung' as const,
        titel: `Mahnung ${mahnung.mahnstufe} - ${mahnung.mahnungsnummer}`,
        beschreibung: `Mahnung über ${mahnung.gesamtforderung.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`,
        referenzId: mahnung._id?.toString() || '',
        status: mahnung.status,
        betrag: mahnung.gesamtforderung,
        zeitpunkt: mahnung.datum,
        benutzer: mahnung.erstelltVon || 'System'
      })
    }
    
    // Projekte
    for (const projekt of projekte.slice(0, 5)) {
      aktivitaeten.push({
        _id: projekt._id?.toString() || '',
        typ: 'projekt' as const,
        titel: `Projekt ${projekt.projektnummer}`,
        beschreibung: projekt.projektname,
        referenzId: projekt._id?.toString() || '',
        status: projekt.status,
        zeitpunkt: projekt.erstelltAm,
        benutzer: projekt.erstelltVon || 'System'
      })
    }
    
    // Sortiere nach Zeitpunkt (neueste zuerst) und begrenze auf 20
    aktivitaeten.sort((a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime())
    const top20Aktivitaeten = aktivitaeten.slice(0, 20)
    
    const bericht: KundenDetailBericht = {
      kunde,
      zeitraum: zeitraumFilter,
      kpis,
      aktivitaeten: top20Aktivitaeten
    }
    
    return NextResponse.json({ erfolg: true, bericht })
  } catch (error) {
    console.error('Fehler beim Abrufen des Kundenberichts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Berichts' },
      { status: 500 }
    )
  }
}

