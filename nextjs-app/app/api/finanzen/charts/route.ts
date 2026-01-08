import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mandantId = searchParams.get('mandantId')
    const von = searchParams.get('von')
    const bis = searchParams.get('bis')
    const intervall = searchParams.get('intervall') || 'monat' // 'tag', 'woche', 'monat'
    
    const db = await getDatabase()
    const collection = db.collection('transaktionen')
    
    const filter: any = { status: { $ne: 'storniert' } }
    if (mandantId) filter.mandantId = mandantId
    if (von || bis) {
      filter.datum = {}
      if (von) {
        const vonDate = new Date(von)
        // Stelle sicher, dass der Tag auf 00:00:00 gesetzt ist
        vonDate.setHours(0, 0, 0, 0)
        filter.datum.$gte = vonDate
      }
      if (bis) {
        const bisDate = new Date(bis)
        // Stelle sicher, dass der Tag auf 23:59:59 gesetzt ist
        bisDate.setHours(23, 59, 59, 999)
        filter.datum.$lte = bisDate
      }
    }
    
    // WICHTIG: Stelle sicher, dass nur das Transaktionsdatum (datum) verwendet wird, nicht createdAt oder erstelltAm
    // Das datum-Feld ist das vom Benutzer eingegebene Datum der Transaktion
    
    console.log('📊 Chart-API Filter:', JSON.stringify(filter, null, 2))
    console.log('📊 Chart-API Zeitraum:', { von, bis, intervall, mandantId })
    
    // Zeitreihen-Daten: Einnahmen vs. Ausgaben pro Intervall
    // WICHTIG: Wir verwenden '$datum' (Transaktionsdatum), nicht 'createdAt' oder 'erstelltAm'
    // Das 'datum'-Feld ist das vom Benutzer eingegebene Datum der Transaktion
    let groupByExpression
    
    switch (intervall) {
      case 'tag':
        groupByExpression = { 
          $dateToString: { format: '%Y-%m-%d', date: '$datum' } // Transaktionsdatum, nicht Erstellungsdatum
        }
        break
      case 'woche':
        groupByExpression = {
          $dateToString: { format: '%Y-W%V', date: '$datum' } // Transaktionsdatum, nicht Erstellungsdatum
        }
        break
      case 'monat':
      default:
        groupByExpression = {
          $dateToString: { format: '%Y-%m', date: '$datum' } // Transaktionsdatum, nicht Erstellungsdatum
        }
        break
    }
    
    // Aggregation: Gruppiere nach Transaktionsdatum (datum), nicht nach Erstellungsdatum
    const zeitreihe = await collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            periode: groupByExpression, // Verwendet '$datum' (Transaktionsdatum)
            typ: '$typ'
          },
          gesamt: { $sum: '$betrag' }
        }
      },
      { $sort: { '_id.periode': 1 } }
    ]).toArray()
    
    console.log('📊 Zeitreihe-Aggregation:', {
      verwendetesFeld: 'datum (Transaktionsdatum)',
      anzahlErgebnisse: zeitreihe.length,
      beispiel: zeitreihe.slice(0, 3)
    })
    
    // Umformatieren für Chart
    const zeitreiheDaten: any[] = []
    const perioden = new Set<string>()
    
    zeitreihe.forEach(item => {
      perioden.add(item._id.periode)
    })
    
    // Hilfsfunktion für Wochennummer
    function getWeekNumber(date: Date): number {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    }
    
    // Generiere alle Perioden im Zeitraum (auch wenn keine Daten vorhanden sind)
    const allePerioden: string[] = []
    if (von && bis) {
      const startDate = new Date(von)
      const endDate = new Date(bis)
      const currentDate = new Date(startDate)
      
      if (intervall === 'tag') {
        // Tagesebene: Alle Tage im Zeitraum
        while (currentDate <= endDate) {
          const periode = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
          allePerioden.push(periode)
          currentDate.setDate(currentDate.getDate() + 1)
        }
      } else if (intervall === 'monat') {
        // Monatsebene: Alle Monate im Zeitraum
        while (currentDate <= endDate) {
          const periode = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
          allePerioden.push(periode)
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
      } else if (intervall === 'woche') {
        // Wochenebene: Alle Wochen im Zeitraum
        while (currentDate <= endDate) {
          const woche = getWeekNumber(currentDate)
          const periode = `${currentDate.getFullYear()}-W${String(woche).padStart(2, '0')}`
          allePerioden.push(periode)
          currentDate.setDate(currentDate.getDate() + 7)
        }
      } else {
        // Fallback: Nur Perioden mit Daten
        allePerioden.push(...Array.from(perioden).sort())
      }
    } else {
      // Fallback: Nur Perioden mit Daten
      allePerioden.push(...Array.from(perioden).sort())
    }
    
    allePerioden.forEach(periode => {
      const einnahmen = zeitreihe.find(
        i => i._id.periode === periode && i._id.typ === 'einnahme'
      )?.gesamt || 0
      
      const ausgaben = zeitreihe.find(
        i => i._id.periode === periode && i._id.typ === 'ausgabe'
      )?.gesamt || 0
      
      zeitreiheDaten.push({
        periode,
        einnahmen: Math.abs(einnahmen), // Sicherstellen, dass Einnahmen positiv sind
        ausgaben: Math.abs(ausgaben), // Sicherstellen, dass Ausgaben positiv sind
        saldo: einnahmen - ausgaben
      })
    })
    
    console.log('📊 Zeitreihe-Daten generiert:', {
      periodenMitDaten: perioden.size,
      allePerioden: allePerioden.length,
      zeitreiheDatenAnzahl: zeitreiheDaten.length,
      beispiel: zeitreiheDaten.slice(0, 5)
    })
    
    // Kategorien-Verteilung (Top 5 + Rest)
    const kategorienAusgaben = await collection.aggregate([
      { $match: { ...filter, typ: 'ausgabe' } },
      {
        $group: {
          _id: '$kategorieName',
          gesamt: { $sum: '$betrag' }
        }
      },
      { $sort: { gesamt: -1 } }
    ]).toArray()
    
    const top5Kategorien = kategorienAusgaben.slice(0, 5)
    const restKategorien = kategorienAusgaben.slice(5)
    const restSumme = restKategorien.reduce((sum, k) => sum + k.gesamt, 0)
    
    const kategorienDaten = [
      ...top5Kategorien.map(k => ({ name: k._id, wert: k.gesamt })),
      ...(restSumme > 0 ? [{ name: 'Sonstige', wert: restSumme }] : [])
    ]
    
    // Cashflow (kumuliert)
    const cashflowDaten: any[] = []
    let kumulierterSaldo = 0
    
    zeitreiheDaten.forEach(item => {
      kumulierterSaldo += item.saldo
      cashflowDaten.push({
        periode: item.periode,
        kumulierterSaldo
      })
    })
    
    // Debug: Prüfe ob Daten vorhanden sind und validiere Summen
    const transaktionenCount = await collection.countDocuments(filter)
    const einnahmenCount = await collection.countDocuments({ ...filter, typ: 'einnahme' })
    const ausgabenCount = await collection.countDocuments({ ...filter, typ: 'ausgabe' })
    
    // Berechne Gesamtsummen zur Validierung
    const gesamtEinnahmen = zeitreiheDaten.reduce((sum, d) => sum + d.einnahmen, 0)
    const gesamtAusgaben = zeitreiheDaten.reduce((sum, d) => sum + d.ausgaben, 0)
    const gesamtSaldo = gesamtEinnahmen - gesamtAusgaben
    
    console.log('📊 Chart-Daten erstellt:', {
      transaktionenGesamt: transaktionenCount,
      einnahmenAnzahl: einnahmenCount,
      ausgabenAnzahl: ausgabenCount,
      zeitreihePerioden: zeitreiheDaten.length,
      gesamtEinnahmen: gesamtEinnahmen.toFixed(2),
      gesamtAusgaben: gesamtAusgaben.toFixed(2),
      gesamtSaldo: gesamtSaldo.toFixed(2),
      zeitreiheBeispiel: zeitreiheDaten.slice(0, 3),
      kategorienAusgaben: kategorienDaten.length,
      cashflow: cashflowDaten.length
    })

    return NextResponse.json({
      erfolg: true,
      charts: {
        zeitreihe: zeitreiheDaten,
        kategorienAusgaben: kategorienDaten,
        cashflow: cashflowDaten
      }
    })
  } catch (error) {
    console.error('❌ Fehler beim Laden der Chart-Daten:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Chart-Daten' },
      { status: 500 }
    )
  }
}

