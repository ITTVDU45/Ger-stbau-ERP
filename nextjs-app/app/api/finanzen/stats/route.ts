import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mandantId = searchParams.get('mandantId')
    const von = searchParams.get('von')
    const bis = searchParams.get('bis')
    
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
    
    console.log('📊 Stats-API Filter:', JSON.stringify(filter, null, 2))
    console.log('📊 Stats-API Zeitraum:', { von, bis, mandantId })
    
    // Aggregation für Stats nach Typ
    const stats = await collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$typ',
          gesamt: { $sum: '$betrag' },
          anzahl: { $sum: 1 }
        }
      }
    ]).toArray()
    
    // Top-Kategorien Ausgaben
    const topKategorienAusgaben = await collection.aggregate([
      { $match: { ...filter, typ: 'ausgabe' } },
      {
        $group: {
          _id: '$kategorieName',
          gesamt: { $sum: '$betrag' }
        }
      },
      { $sort: { gesamt: -1 } },
      { $limit: 5 }
    ]).toArray()
    
    // Top-Kategorien Einnahmen
    const topKategorienEinnahmen = await collection.aggregate([
      { $match: { ...filter, typ: 'einnahme' } },
      {
        $group: {
          _id: '$kategorieName',
          gesamt: { $sum: '$betrag' }
        }
      },
      { $sort: { gesamt: -1 } },
      { $limit: 5 }
    ]).toArray()
    
    // Berechne KPIs
    const einnahmenGesamt = stats.find(s => s._id === 'einnahme')?.gesamt || 0
    const ausgabenGesamt = stats.find(s => s._id === 'ausgabe')?.gesamt || 0
    const saldo = einnahmenGesamt - ausgabenGesamt
    
    const topKategorieAusgabe = topKategorienAusgaben[0]?._id || 'Keine'
    const topKategorieEinnahme = topKategorienEinnahmen[0]?._id || 'Keine'
    
    // Durchschnitt pro Monat (basierend auf Zeitraum)
    let durchschnittEinnahmenProMonat = 0
    let durchschnittAusgabenProMonat = 0
    if (von && bis) {
      const vonDate = new Date(von)
      const bisDate = new Date(bis)
      const monate = (bisDate.getFullYear() - vonDate.getFullYear()) * 12 + 
                     (bisDate.getMonth() - vonDate.getMonth()) + 1
      durchschnittEinnahmenProMonat = einnahmenGesamt / Math.max(monate, 1)
      durchschnittAusgabenProMonat = ausgabenGesamt / Math.max(monate, 1)
    }
    
    // Anzahl Transaktionen
    const anzahlTransaktionen = stats.reduce((sum, s) => sum + s.anzahl, 0)
    
    console.log('📊 Stats berechnet:', {
      einnahmenGesamt,
      ausgabenGesamt,
      durchschnittEinnahmenProMonat,
      durchschnittAusgabenProMonat,
      anzahlTransaktionen
    })
    
    return NextResponse.json({
      erfolg: true,
      stats: {
        einnahmenGesamt,
        ausgabenGesamt,
        saldo,
        topKategorienAusgaben,
        topKategorienEinnahmen,
        topKategorieAusgabe,
        topKategorieEinnahme,
        durchschnittEinnahmenProMonat,
        durchschnittAusgabenProMonat,
        anzahlTransaktionen
      }
    })
  } catch (error) {
    console.error('Fehler beim Laden der Statistiken:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Statistiken' },
      { status: 500 }
    )
  }
}

