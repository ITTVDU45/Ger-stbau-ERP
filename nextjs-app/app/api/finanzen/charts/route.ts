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
      if (von) filter.datum.$gte = new Date(von)
      if (bis) filter.datum.$lte = new Date(bis)
    }
    
    // Zeitreihen-Daten: Einnahmen vs. Ausgaben pro Intervall
    let groupByExpression
    
    switch (intervall) {
      case 'tag':
        groupByExpression = { 
          $dateToString: { format: '%Y-%m-%d', date: '$datum' } 
        }
        break
      case 'woche':
        groupByExpression = {
          $dateToString: { format: '%Y-W%V', date: '$datum' }
        }
        break
      case 'monat':
      default:
        groupByExpression = {
          $dateToString: { format: '%Y-%m', date: '$datum' }
        }
        break
    }
    
    const zeitreihe = await collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            periode: groupByExpression,
            typ: '$typ'
          },
          gesamt: { $sum: '$betrag' }
        }
      },
      { $sort: { '_id.periode': 1 } }
    ]).toArray()
    
    // Umformatieren für Chart
    const zeitreiheDaten: any[] = []
    const perioden = new Set<string>()
    
    zeitreihe.forEach(item => {
      perioden.add(item._id.periode)
    })
    
    Array.from(perioden).sort().forEach(periode => {
      const einnahmen = zeitreihe.find(
        i => i._id.periode === periode && i._id.typ === 'einnahme'
      )?.gesamt || 0
      
      const ausgaben = zeitreihe.find(
        i => i._id.periode === periode && i._id.typ === 'ausgabe'
      )?.gesamt || 0
      
      zeitreiheDaten.push({
        periode,
        einnahmen,
        ausgaben,
        saldo: einnahmen - ausgaben
      })
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
    
    console.log('📊 Chart-Daten erstellt:', {
      zeitreihe: zeitreiheDaten.length,
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

