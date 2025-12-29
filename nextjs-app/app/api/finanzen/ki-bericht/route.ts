import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { generateFinanzenKIBericht } from '@/lib/services/openaiService'
import { FinanzenKIBericht } from '@/lib/db/types'

export async function POST(request: NextRequest) {
  try {
    const { mandantId, zeitraum } = await request.json()
    
    const db = await getDatabase()
    
    // Lade Transaktionen im Zeitraum
    const filter: any = {
      datum: { $gte: new Date(zeitraum.von), $lte: new Date(zeitraum.bis) },
      status: { $ne: 'storniert' }
    }
    if (mandantId) filter.mandantId = mandantId
    
    const transaktionen = await db.collection('transaktionen')
      .find(filter)
      .toArray()
    
    // Berechne Statistiken
    const einnahmen = transaktionen.filter(t => t.typ === 'einnahme')
    const ausgaben = transaktionen.filter(t => t.typ === 'ausgabe')
    const einnahmenGesamt = einnahmen.reduce((sum, t) => sum + t.betrag, 0)
    const ausgabenGesamt = ausgaben.reduce((sum, t) => sum + t.betrag, 0)
    
    // Top-Kategorien
    const kategorienMap = new Map<string, number>()
    ausgaben.forEach(t => {
      const current = kategorienMap.get(t.kategorieName) || 0
      kategorienMap.set(t.kategorieName, current + t.betrag)
    })
    const sortiert = Array.from(kategorienMap.entries())
      .sort((a, b) => b[1] - a[1])
    const topKategorieAusgaben = sortiert[0]?.[0] || 'Keine'
    
    // Lade aktuellen Kontostand
    const kontostandFilter: any = {}
    if (mandantId) kontostandFilter.mandantId = mandantId
    const kontostandSnapshot = await db.collection('kontostand_snapshots')
      .findOne(kontostandFilter, { sort: { datum: -1 } })
    const kontostand = kontostandSnapshot?.betrag || 0
    
    // Lade Kategorien
    const kategorien = await db.collection('finanzen_kategorien')
      .find({ aktiv: true })
      .toArray()
    
    // Berechne Budget-Status (mit Ausgaben)
    const budgetStatusRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/finanzen/budgets/status?${new URLSearchParams(mandantId ? { mandantId } : {}).toString()}`)
    let budgetStatus: any[] = []
    if (budgetStatusRes.ok) {
      const budgetStatusData = await budgetStatusRes.json()
      budgetStatus = budgetStatusData.budgets || []
    }
    
    // Generiere KI-Bericht
    const bericht = await generateFinanzenKIBericht({
      transaktionen,
      einnahmenGesamt,
      ausgabenGesamt,
      zeitraum,
      kontostand,
      kategorien,
      budgets: budgetStatus
    })
    
    // Speichern
    const finanzKIBericht: FinanzenKIBericht = {
      mandantId,
      zeitraum,
      zeitraumBeschreibung: `${new Date(zeitraum.von).toLocaleDateString('de-DE')} - ${new Date(zeitraum.bis).toLocaleDateString('de-DE')}`,
      kontostand, // NEU
      bericht,
      datenSnapshot: {
        einnahmenGesamt,
        ausgabenGesamt,
        saldo: einnahmenGesamt - ausgabenGesamt,
        anzahlTransaktionen: transaktionen.length,
        topKategorieAusgaben
      },
      generiertAm: new Date(),
      generiertVon: 'System', // TODO: aus Session
      modelVersion: 'gpt-4o',
      version: 1,
      aktiv: true
    }
    
    const result = await db.collection('finanzen_ki_berichte').insertOne(finanzKIBericht)
    const gespeichert = await db.collection('finanzen_ki_berichte').findOne({ _id: result.insertedId })
    
    return NextResponse.json({ erfolg: true, bericht: gespeichert })
  } catch (error: any) {
    console.error('Fehler beim Generieren des KI-Berichts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Fehler beim Generieren des KI-Berichts' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mandantId = searchParams.get('mandantId')
    
    const db = await getDatabase()
    
    const filter: any = { aktiv: true }
    if (mandantId) filter.mandantId = mandantId
    
    const berichte = await db.collection<FinanzenKIBericht>('finanzen_ki_berichte')
      .find(filter)
      .sort({ generiertAm: -1 })
      .limit(10)
      .toArray()
    
    return NextResponse.json({ erfolg: true, berichte })
  } catch (error) {
    console.error('Fehler beim Laden der KI-Berichte:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der KI-Berichte' },
      { status: 500 }
    )
  }
}

