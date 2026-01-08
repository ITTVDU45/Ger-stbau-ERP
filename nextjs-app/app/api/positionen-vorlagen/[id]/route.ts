import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// GET - Einzelne Vorlage abrufen
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
    const vorlagenCollection = db.collection('positionen_vorlagen')
    
    const vorlage = await vorlagenCollection.findOne({ _id: new ObjectId(id) })
    
    if (!vorlage) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorlage nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true, vorlage })
  } catch (error) {
    console.error('Fehler beim Abrufen der Vorlage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Vorlage' },
      { status: 500 }
    )
  }
}

// PUT - Vorlage aktualisieren
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
    
    // Validierung
    if (!body.shortcode || !body.name || !body.beschreibung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Shortcode, Name und Beschreibung sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const vorlagenCollection = db.collection('positionen_vorlagen')
    
    // Prüfen, ob Vorlage existiert
    const existingVorlage = await vorlagenCollection.findOne({ _id: new ObjectId(id) })
    if (!existingVorlage) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorlage nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Prüfen, ob Shortcode bereits von anderer Vorlage verwendet wird
    const duplicateShortcode = await vorlagenCollection.findOne({
      shortcode: body.shortcode.toUpperCase(),
      _id: { $ne: new ObjectId(id) }
    })
    
    if (duplicateShortcode) {
      return NextResponse.json(
        { erfolg: false, fehler: `Shortcode "${body.shortcode}" wird bereits verwendet` },
        { status: 400 }
      )
    }
    
    const updateData = {
      shortcode: body.shortcode.toUpperCase().replace(/\s+/g, '_'),
      name: body.name,
      beschreibung: body.beschreibung,
      typ: body.typ || 'material',
      einheit: body.einheit || 'Stk',
      standardPreis: body.standardPreis || 0,
      standardMenge: body.standardMenge || 1,
      standardProzentsatz: body.standardProzentsatz || undefined,
      kategorie: body.kategorie || '',
      aktiv: body.aktiv !== false,
      zuletztGeaendert: new Date()
    }
    
    const result = await vorlagenCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorlage nicht gefunden' },
        { status: 404 }
      )
    }
    
    const updatedVorlage = await vorlagenCollection.findOne({ _id: new ObjectId(id) })
    
    return NextResponse.json({ erfolg: true, vorlage: updatedVorlage })
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Vorlage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren der Vorlage' },
      { status: 500 }
    )
  }
}

// DELETE - Vorlage löschen
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
    const vorlagenCollection = db.collection('positionen_vorlagen')
    
    const result = await vorlagenCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorlage nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ erfolg: true })
  } catch (error) {
    console.error('Fehler beim Löschen der Vorlage:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen der Vorlage' },
      { status: 500 }
    )
  }
}

