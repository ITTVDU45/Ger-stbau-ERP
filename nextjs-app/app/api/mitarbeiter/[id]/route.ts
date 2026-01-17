import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Mitarbeiter } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// GET - Einzelnen Mitarbeiter abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    const mitarbeiter = await mitarbeiterCollection.findOne({ 
      _id: new ObjectId(id) 
    })
    
    if (!mitarbeiter) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      mitarbeiter 
    })
  } catch (error) {
    console.error('Fehler beim Abrufen des Mitarbeiters:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Mitarbeiters' },
      { status: 500 }
    )
  }
}

// PUT - Mitarbeiter aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validierung
    if (!body.vorname || !body.nachname || !body.email) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorname, Nachname und E-Mail sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    // Prüfen ob E-Mail bereits von einem anderen Mitarbeiter verwendet wird
    const existing = await mitarbeiterCollection.findOne({ 
      email: body.email,
      _id: { $ne: new ObjectId(id) }
    })
    
    if (existing) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ein anderer Mitarbeiter verwendet bereits diese E-Mail' },
        { status: 400 }
      )
    }

    const { _id, ...updateData } = body
    
    const result = await mitarbeiterCollection.updateOne(
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
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Mitarbeiter erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Mitarbeiters:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Mitarbeiters' },
      { status: 500 }
    )
  }
}

// PATCH - Partielle Aktualisierung (z.B. nur Jahresurlaub)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Daten zum Aktualisieren' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    // Entferne _id falls vorhanden
    const { _id, ...updateData } = body
    
    const result = await mitarbeiterCollection.updateOne(
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
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Mitarbeiter erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Mitarbeiters:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Mitarbeiters' },
      { status: 500 }
    )
  }
}

// DELETE - Mitarbeiter löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    
    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    // Prüfen ob Mitarbeiter verknüpfte Daten hat
    const zeiteintraege = await db.collection('zeiterfassung').countDocuments({ mitarbeiterId: id })
    const projekte = await db.collection('projekte').countDocuments({ 'team.mitarbeiterId': id })
    const urlaube = await db.collection('urlaube').countDocuments({ mitarbeiterId: id })
    const dokumente = await db.collection('dokumente').countDocuments({ mitarbeiterId: id })
    
    const hasRelatedData = zeiteintraege > 0 || projekte > 0 || urlaube > 0
    
    if (hasRelatedData && !force) {
      return NextResponse.json(
        { 
          erfolg: false, 
          fehler: 'Mitarbeiter hat zugeordnete Zeiteinträge, Projekte oder Urlaube und kann nicht gelöscht werden.',
          hasRelatedData: true,
          relatedData: {
            zeiteintraege,
            projekte,
            urlaube,
            dokumente
          }
        },
        { status: 400 }
      )
    }
    
    // Wenn force=true, alle zugehörigen Daten löschen
    if (force && hasRelatedData) {
      await db.collection('zeiterfassung').deleteMany({ mitarbeiterId: id })
      await db.collection('projekte').updateMany(
        { 'team.mitarbeiterId': id },
        { $pull: { team: { mitarbeiterId: id } } }
      )
      await db.collection('urlaube').deleteMany({ mitarbeiterId: id })
      await db.collection('dokumente').deleteMany({ mitarbeiterId: id })
      
      console.log(`Force-Delete: Gelöscht für Mitarbeiter ${id}:`, {
        zeiteintraege,
        projekte,
        urlaube,
        dokumente
      })
    }
    
    const result = await mitarbeiterCollection.deleteOne({ 
      _id: new ObjectId(id) 
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: force ? 'Mitarbeiter und alle zugehörigen Daten erfolgreich gelöscht' : 'Mitarbeiter erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Mitarbeiters:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Mitarbeiters' },
      { status: 500 }
    )
  }
}

