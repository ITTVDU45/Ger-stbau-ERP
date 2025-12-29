import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST: Kontostand neu berechnen basierend auf letztem manuellen Snapshot + alle Transaktionen
 * 
 * Diese Route berechnet den Kontostand komplett neu:
 * 1. Holt den letzten manuellen Kontostand-Snapshot (Basis)
 * 2. Holt alle Transaktionen NACH diesem Snapshot
 * 3. Berechnet: Basis + Einnahmen - Ausgaben
 * 4. Löscht alte automatische Snapshots
 * 5. Erstellt neuen automatischen Snapshot mit korrektem Betrag
 */
export async function POST(request: NextRequest) {
  try {
    const { mandantId } = await request.json()
    
    const db = await getDatabase()
    const kontostandCollection = db.collection('kontostand_snapshots')
    const transaktionenCollection = db.collection('transaktionen')
    
    // Hole letzten manuellen Kontostand-Snapshot (Basis)
    const filter: any = { typ: 'manuell' }
    if (mandantId) filter.mandantId = mandantId
    
    const letzterManuellerSnapshot = await kontostandCollection
      .findOne(filter, { sort: { datum: -1 } })
    
    if (!letzterManuellerSnapshot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kein manueller Kontostand-Snapshot gefunden. Bitte legen Sie zuerst einen manuellen Kontostand an.' },
        { status: 404 }
      )
    }
    
    const basisKontostand = letzterManuellerSnapshot.betrag
    const basisDatum = letzterManuellerSnapshot.datum
    
    console.log('📊 Starte Neu-Berechnung:', {
      basis: basisKontostand,
      basisDatum: basisDatum.toISOString().split('T')[0]
    })
    
    // Hole ALLE Transaktionen NACH dem letzten manuellen Snapshot
    const transaktionenFilter: any = {
      datum: { $gt: basisDatum },
      status: { $ne: 'storniert' }
    }
    if (mandantId) transaktionenFilter.mandantId = mandantId
    
    const transaktionen = await transaktionenCollection
      .find(transaktionenFilter)
      .toArray()
    
    // Berechne Summen
    const einnahmen = transaktionen
      .filter(t => t.typ === 'einnahme')
      .reduce((sum, t) => sum + t.betrag, 0)
    
    const ausgaben = transaktionen
      .filter(t => t.typ === 'ausgabe')
      .reduce((sum, t) => sum + t.betrag, 0)
    
    const neuerKontostand = basisKontostand + einnahmen - ausgaben
    
    console.log('💰 Berechnung:', {
      basis: basisKontostand,
      einnahmen: `+${einnahmen}`,
      ausgaben: `-${ausgaben}`,
      transaktionen: transaktionen.length,
      neu: neuerKontostand
    })
    
    // Lösche ALLE alten automatischen Snapshots nach dem letzten manuellen
    const deleteFilter: any = {
      typ: 'automatisch',
      datum: { $gt: basisDatum }
    }
    if (mandantId) deleteFilter.mandantId = mandantId
    
    const deleteResult = await kontostandCollection.deleteMany(deleteFilter)
    console.log(`🗑️ ${deleteResult.deletedCount} alte automatische Snapshots gelöscht`)
    
    // Erstelle neuen automatischen Snapshot
    const neuerSnapshot = {
      mandantId: mandantId || null,
      betrag: neuerKontostand,
      datum: new Date(),
      notiz: `Neu berechnet: Basis ${basisKontostand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} (${new Date(basisDatum).toLocaleDateString('de-DE')}) + ${transaktionen.length} Transaktionen (${einnahmen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} - ${ausgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})`,
      typ: 'automatisch',
      erstelltVon: 'System',
      erstelltAm: new Date()
    }
    
    const result = await kontostandCollection.insertOne(neuerSnapshot)
    const snapshot = await kontostandCollection.findOne({ _id: result.insertedId })
    
    console.log('✅ Neuer Kontostand-Snapshot erstellt:', neuerKontostand)
    
    return NextResponse.json({
      erfolg: true,
      snapshot,
      details: {
        basisKontostand,
        basisDatum,
        einnahmen,
        ausgaben,
        anzahlTransaktionen: transaktionen.length,
        neuerKontostand,
        geloeschteSnapshots: deleteResult.deletedCount
      }
    })
  } catch (error) {
    console.error('❌ Fehler beim Neu-Berechnen des Kontostands:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Neu-Berechnen des Kontostands' },
      { status: 500 }
    )
  }
}

