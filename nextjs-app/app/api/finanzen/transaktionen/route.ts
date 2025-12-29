import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Transaktion } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mandantId = searchParams.get('mandantId')
    const typ = searchParams.get('typ') // 'einnahme', 'ausgabe', oder null für alle
    const von = searchParams.get('von') // Datum von
    const bis = searchParams.get('bis') // Datum bis
    const kategorieId = searchParams.get('kategorieId')
    
    const db = await getDatabase()
    const collection = db.collection<Transaktion>('transaktionen')
    
    const filter: any = {}
    if (mandantId) filter.mandantId = mandantId
    if (typ) filter.typ = typ
    if (von || bis) {
      filter.datum = {}
      if (von) filter.datum.$gte = new Date(von)
      if (bis) filter.datum.$lte = new Date(bis)
    }
    if (kategorieId) filter.kategorieId = kategorieId
    
    const transaktionen = await collection
      .find(filter)
      .sort({ datum: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, transaktionen })
  } catch (error) {
    console.error('Fehler beim Laden der Transaktionen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Transaktionen' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // MwSt-Berechnung wenn brutto gegeben
    if (body.betrag && body.mwstSatz && !body.nettobetrag) {
      body.nettobetrag = body.betrag / (1 + body.mwstSatz / 100)
      body.mwstBetrag = body.betrag - body.nettobetrag
    }
    
    const db = await getDatabase()
    const collection = db.collection<Transaktion>('transaktionen')
    
    // Datum explizit konvertieren falls String
    const datum = body.datum instanceof Date ? body.datum : new Date(body.datum)
    
    const neueTransaktion: Transaktion = {
      ...body,
      datum, // Explizit als Date setzen
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    console.log('💾 Neue Transaktion:', {
      typ: neueTransaktion.typ,
      datum: neueTransaktion.datum,
      betrag: neueTransaktion.betrag,
      kategorieName: neueTransaktion.kategorieName,
      beschreibung: neueTransaktion.beschreibung
    })
    
    const result = await collection.insertOne(neueTransaktion)
    const transaktion = await collection.findOne({ _id: result.insertedId })
    
    console.log('✅ Transaktion erstellt mit ID:', result.insertedId)
    
    // 🔄 KONTOSTAND AUTOMATISCH AKTUALISIEREN
    try {
      const kontostandCollection = db.collection('kontostand_snapshots')
      
      // Hole letzten manuellen Kontostand-Snapshot (Basis)
      const filter: any = { typ: 'manuell' }
      if (body.mandantId) filter.mandantId = body.mandantId
      
      const letzterManuellerSnapshot = await kontostandCollection
        .findOne(filter, { sort: { datum: -1 } })
      
      if (!letzterManuellerSnapshot) {
        console.log('⚠️ Kein manueller Kontostand-Snapshot gefunden, überspringe Auto-Update')
        return NextResponse.json({ erfolg: true, transaktion }, { status: 201 })
      }
      
      const basisKontostand = letzterManuellerSnapshot.betrag
      const basisDatum = letzterManuellerSnapshot.datum
      
      // Hole ALLE Transaktionen nach dem letzten manuellen Snapshot
      const transaktionenFilter: any = {
        datum: { $gt: basisDatum },
        status: { $ne: 'storniert' }
      }
      if (body.mandantId) transaktionenFilter.mandantId = body.mandantId
      
      const transaktionenNachSnapshot = await collection.find(transaktionenFilter).toArray()
      
      // Berechne Summe aller Einnahmen und Ausgaben nach dem Snapshot
      const einnahmen = transaktionenNachSnapshot
        .filter(t => t.typ === 'einnahme')
        .reduce((sum, t) => sum + t.betrag, 0)
      
      const ausgaben = transaktionenNachSnapshot
        .filter(t => t.typ === 'ausgabe')
        .reduce((sum, t) => sum + t.betrag, 0)
      
      // Berechne neuen Kontostand
      const neuerKontostand = basisKontostand + einnahmen - ausgaben
      
      // Lösche alte automatische Snapshots (nach dem letzten manuellen)
      await kontostandCollection.deleteMany({
        typ: 'automatisch',
        datum: { $gt: basisDatum },
        ...(body.mandantId ? { mandantId: body.mandantId } : {})
      })
      
      // Erstelle neuen Kontostand-Snapshot
      const neuerSnapshot = {
        mandantId: body.mandantId || null,
        betrag: neuerKontostand,
        datum: new Date(),
        notiz: `Auto-Update: Basis ${basisKontostand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} + ${einnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} Einnahmen - ${ausgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} Ausgaben`,
        typ: 'automatisch',
        erstelltVon: 'System',
        erstelltAm: new Date()
      }
      
      await kontostandCollection.insertOne(neuerSnapshot)
      
      console.log('💰 Kontostand aktualisiert:', {
        basis: basisKontostand,
        einnahmen: `+${einnahmen}`,
        ausgaben: `-${ausgaben}`,
        neu: neuerKontostand,
        transaktionen: transaktionenNachSnapshot.length
      })
    } catch (error) {
      console.error('⚠️ Fehler beim Aktualisieren des Kontostands:', error)
      // Transaktion wurde erstellt, aber Kontostand-Update fehlgeschlagen
      // → Nicht kritisch, daher kein Fehler werfen
    }
    
    return NextResponse.json({ erfolg: true, transaktion }, { status: 201 })
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Transaktion:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen der Transaktion' },
      { status: 500 }
    )
  }
}

