import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Kunde } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// GET - Einzelnen Kunden mit KPIs abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const kundenCollection = db.collection<Kunde>('kunden')
    
    const kunde = await kundenCollection.findOne({ 
      _id: new ObjectId(id) 
    })
    
    if (!kunde) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }

    // KPIs berechnen
    const projekteCount = await db.collection('projekte').countDocuments({ kundeId: id })
    const angeboteCount = await db.collection('angebote').countDocuments({ kundeId: id })
    const rechnungenCount = await db.collection('rechnungen').countDocuments({ kundeId: id })
    
    // Umsatz berechnen (bezahlte Rechnungen)
    const umsatzAgg = await db.collection('rechnungen').aggregate([
      { $match: { kundeId: id, status: 'bezahlt' } },
      { $group: { _id: null, total: { $sum: '$brutto' } } }
    ]).toArray()
    
    // Offene Posten berechnen
    const offenePostenAgg = await db.collection('rechnungen').aggregate([
      { $match: { kundeId: id, status: { $in: ['gesendet', 'ueberfaellig', 'teilbezahlt'] } } },
      { $group: { _id: null, total: { $sum: '$brutto' } } }
    ]).toArray()

    const kundeMitKPIs: Kunde = {
      ...kunde,
      anzahlProjekte: projekteCount,
      anzahlAngebote: angeboteCount,
      anzahlRechnungen: rechnungenCount,
      umsatzGesamt: umsatzAgg[0]?.total || 0,
      offenePosten: offenePostenAgg[0]?.total || 0
    }
    
    return NextResponse.json({ erfolg: true, kunde: kundeMitKPIs })
  } catch (error) {
    console.error('Fehler beim Abrufen des Kunden:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Kunden' },
      { status: 500 }
    )
  }
}

// PUT - Kunde aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const db = await getDatabase()
    const kundenCollection = db.collection<Kunde>('kunden')
    
    const { _id, ...updateData } = body
    
    const result = await kundenCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          zuletztGeaendert: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Kunde erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Kunden:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Kunden' },
      { status: 500 }
    )
  }
}

// DELETE - Kunde löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    
    const db = await getDatabase()
    const kundenCollection = db.collection<Kunde>('kunden')
    
    // Prüfen ob Kunde Projekte/Rechnungen/Angebote/Anfragen hat
    const projekte = await db.collection('projekte').countDocuments({ kundeId: id })
    const rechnungen = await db.collection('rechnungen').countDocuments({ kundeId: id })
    const angebote = await db.collection('angebote').countDocuments({ kundeId: id })
    const anfragen = await db.collection('anfragen').countDocuments({ kundeId: id })
    const notizen = await db.collection('notizen').countDocuments({ kundeId: id })
    
    const hasRelatedData = projekte > 0 || rechnungen > 0 || angebote > 0 || anfragen > 0
    
    if (hasRelatedData && !force) {
      return NextResponse.json(
        { 
          erfolg: false, 
          fehler: 'Kunde hat zugeordnete Projekte, Angebote oder Rechnungen und kann nicht gelöscht werden.',
          hasRelatedData: true,
          relatedData: {
            projekte,
            rechnungen,
            angebote,
            anfragen,
            notizen
          }
        },
        { status: 400 }
      )
    }
    
    // Wenn force=true, alle zugehörigen Daten löschen
    if (force && hasRelatedData) {
      // Lösche alle zugehörigen Daten
      await db.collection('projekte').deleteMany({ kundeId: id })
      await db.collection('rechnungen').deleteMany({ kundeId: id })
      await db.collection('angebote').deleteMany({ kundeId: id })
      await db.collection('anfragen').deleteMany({ kundeId: id })
      await db.collection('notizen').deleteMany({ kundeId: id })
      await db.collection('dokumente').deleteMany({ kundeId: id })
      
      console.log(`Force-Delete: Gelöscht für Kunde ${id}:`, {
        projekte,
        rechnungen,
        angebote,
        anfragen,
        notizen
      })
    }
    
    const result = await kundenCollection.deleteOne({ 
      _id: new ObjectId(id) 
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: force ? 'Kunde und alle zugehörigen Daten erfolgreich gelöscht' : 'Kunde erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Kunden:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Kunden' },
      { status: 500 }
    )
  }
}

