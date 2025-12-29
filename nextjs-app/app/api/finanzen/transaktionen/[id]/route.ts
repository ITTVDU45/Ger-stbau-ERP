import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Transaktion } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const collection = db.collection<Transaktion>('transaktionen')
    
    const transaktion = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!transaktion) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Transaktion nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true, transaktion })
  } catch (error) {
    console.error('Fehler beim Laden der Transaktion:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Transaktion' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }
    
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
    
    const updateData = {
      ...body,
      datum, // Explizit als Date setzen
      zuletztGeaendert: new Date()
    }
    
    // Verhindere Änderung bestimmter Felder
    delete updateData._id
    delete updateData.erstelltAm
    delete updateData.erstelltVon
    
    console.log('📝 Aktualisiere Transaktion:', id, {
      typ: updateData.typ,
      datum: updateData.datum,
      betrag: updateData.betrag,
      kategorieName: updateData.kategorieName
    })
    
    // Hole alte Transaktion für Kontostand-Korrektur
    const alteTransaktion = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!alteTransaktion) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Transaktion nicht gefunden' },
        { status: 404 }
      )
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Transaktion nicht gefunden' },
        { status: 404 }
      )
    }
    
    const transaktion = await collection.findOne({ _id: new ObjectId(id) })
    
    // 🔄 KONTOSTAND NEU BERECHNEN
    try {
      const kontostandCollection = db.collection('kontostand_snapshots')
      
      // Hole letzten manuellen Kontostand-Snapshot
      const filter: any = { typ: 'manuell' }
      if (updateData.mandantId) filter.mandantId = updateData.mandantId
      
      const letzterManuellerSnapshot = await kontostandCollection
        .findOne(filter, { sort: { datum: -1 } })
      
      if (!letzterManuellerSnapshot) {
        console.log('⚠️ Kein manueller Kontostand-Snapshot gefunden')
        return NextResponse.json({ erfolg: true, transaktion })
      }
      
      const basisKontostand = letzterManuellerSnapshot.betrag
      const basisDatum = letzterManuellerSnapshot.datum
      
      // Hole ALLE Transaktionen nach dem Snapshot
      const transaktionenFilter: any = {
        datum: { $gt: basisDatum },
        status: { $ne: 'storniert' }
      }
      if (updateData.mandantId) transaktionenFilter.mandantId = updateData.mandantId
      
      const transaktionen = await collection.find(transaktionenFilter).toArray()
      
      const einnahmen = transaktionen
        .filter(t => t.typ === 'einnahme')
        .reduce((sum, t) => sum + t.betrag, 0)
      
      const ausgaben = transaktionen
        .filter(t => t.typ === 'ausgabe')
        .reduce((sum, t) => sum + t.betrag, 0)
      
      const neuerKontostand = basisKontostand + einnahmen - ausgaben
      
      // Lösche alte automatische Snapshots
      await kontostandCollection.deleteMany({
        typ: 'automatisch',
        datum: { $gt: basisDatum },
        ...(updateData.mandantId ? { mandantId: updateData.mandantId } : {})
      })
      
      // Erstelle neuen Snapshot
      await kontostandCollection.insertOne({
        mandantId: updateData.mandantId || null,
        betrag: neuerKontostand,
        datum: new Date(),
        notiz: `Auto-Update: Basis ${basisKontostand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} + ${einnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} - ${ausgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`,
        typ: 'automatisch',
        erstelltVon: 'System',
        erstelltAm: new Date()
      })
      
      console.log('💰 Kontostand neu berechnet:', {
        basis: basisKontostand,
        einnahmen: `+${einnahmen}`,
        ausgaben: `-${ausgaben}`,
        neu: neuerKontostand
      })
    } catch (error) {
      console.error('⚠️ Fehler beim Neu-Berechnen des Kontostands:', error)
    }
    
    return NextResponse.json({ erfolg: true, transaktion })
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Transaktion:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren der Transaktion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const collection = db.collection<Transaktion>('transaktionen')
    
    // Hole Transaktion vor dem Löschen für Kontostand-Korrektur
    const transaktion = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!transaktion) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Transaktion nicht gefunden' },
        { status: 404 }
      )
    }
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Transaktion nicht gefunden' },
        { status: 404 }
      )
    }
    
    // 🔄 KONTOSTAND NEU BERECHNEN
    try {
      const kontostandCollection = db.collection('kontostand_snapshots')
      
      // Hole letzten manuellen Kontostand-Snapshot
      const filter: any = { typ: 'manuell' }
      if (transaktion.mandantId) filter.mandantId = transaktion.mandantId
      
      const letzterManuellerSnapshot = await kontostandCollection
        .findOne(filter, { sort: { datum: -1 } })
      
      if (!letzterManuellerSnapshot) {
        console.log('⚠️ Kein manueller Kontostand-Snapshot gefunden')
        return NextResponse.json({ erfolg: true })
      }
      
      const basisKontostand = letzterManuellerSnapshot.betrag
      const basisDatum = letzterManuellerSnapshot.datum
      
      // Hole ALLE verbleibenden Transaktionen nach dem Snapshot
      const transaktionenFilter: any = {
        datum: { $gt: basisDatum },
        status: { $ne: 'storniert' }
      }
      if (transaktion.mandantId) transaktionenFilter.mandantId = transaktion.mandantId
      
      const transaktionen = await collection.find(transaktionenFilter).toArray()
      
      const einnahmen = transaktionen
        .filter(t => t.typ === 'einnahme')
        .reduce((sum, t) => sum + t.betrag, 0)
      
      const ausgaben = transaktionen
        .filter(t => t.typ === 'ausgabe')
        .reduce((sum, t) => sum + t.betrag, 0)
      
      const neuerKontostand = basisKontostand + einnahmen - ausgaben
      
      // Lösche alte automatische Snapshots
      await kontostandCollection.deleteMany({
        typ: 'automatisch',
        datum: { $gt: basisDatum },
        ...(transaktion.mandantId ? { mandantId: transaktion.mandantId } : {})
      })
      
      // Erstelle neuen Snapshot
      await kontostandCollection.insertOne({
        mandantId: transaktion.mandantId || null,
        betrag: neuerKontostand,
        datum: new Date(),
        notiz: `Auto-Update: Basis ${basisKontostand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} + ${einnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} - ${ausgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`,
        typ: 'automatisch',
        erstelltVon: 'System',
        erstelltAm: new Date()
      })
      
      console.log('💰 Kontostand neu berechnet:', {
        basis: basisKontostand,
        einnahmen: `+${einnahmen}`,
        ausgaben: `-${ausgaben}`,
        neu: neuerKontostand
      })
    } catch (error) {
      console.error('⚠️ Fehler beim Neu-Berechnen des Kontostands:', error)
    }
    
    return NextResponse.json({ erfolg: true })
  } catch (error) {
    console.error('Fehler beim Löschen der Transaktion:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen der Transaktion' },
      { status: 500 }
    )
  }
}

