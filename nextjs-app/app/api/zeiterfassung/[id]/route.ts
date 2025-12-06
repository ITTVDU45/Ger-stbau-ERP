import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Zeiterfassung } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// GET - Einzelnen Zeiteintrag abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const zeiterfassungCollection = db.collection<Zeiterfassung>('zeiterfassung')
    
    const eintrag = await zeiterfassungCollection.findOne({ 
      _id: new ObjectId(id) 
    })
    
    if (!eintrag) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Zeiteintrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      eintrag 
    })
  } catch (error) {
    console.error('Fehler beim Abrufen des Zeiteintrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Zeiteintrags' },
      { status: 500 }
    )
  }
}

// PUT - Zeiteintrag aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validierung
    if (!body.mitarbeiterId || !body.datum || !body.stunden) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter, Datum und Stunden sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const zeiterfassungCollection = db.collection<Zeiterfassung>('zeiterfassung')
    
    // Hole alten Eintrag für Projekt-ID
    const alterEintrag = await zeiterfassungCollection.findOne({ _id: new ObjectId(id) })
    
    const { _id, ...updateData } = body
    
    const result = await zeiterfassungCollection.updateOne(
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
        { erfolg: false, fehler: 'Zeiteintrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Wenn Zeiteintrag mit Projekt verknüpft ist und freigegeben, berechne Nachkalkulation neu
    const projektId = body.projektId || alterEintrag?.projektId
    if (projektId && (body.status === 'freigegeben' || alterEintrag?.status === 'freigegeben')) {
      KalkulationService.berechneNachkalkulation(projektId).catch(err => {
        console.error('Fehler bei automatischer Nachkalkulation:', err)
      })
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Zeiteintrag erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Zeiteintrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Aktualisieren des Zeiteintrags' },
      { status: 500 }
    )
  }
}

// DELETE - Zeiteintrag löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const zeiterfassungCollection = db.collection<Zeiterfassung>('zeiterfassung')
    
    // Hole Eintrag vor dem Löschen für Projekt-ID
    const eintrag = await zeiterfassungCollection.findOne({ _id: new ObjectId(id) })
    
    const result = await zeiterfassungCollection.deleteOne({ 
      _id: new ObjectId(id) 
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Zeiteintrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Wenn Zeiteintrag mit Projekt verknüpft war und freigegeben, berechne Nachkalkulation neu
    if (eintrag?.projektId && eintrag.status === 'freigegeben') {
      KalkulationService.berechneNachkalkulation(eintrag.projektId).catch(err => {
        console.error('Fehler bei automatischer Nachkalkulation:', err)
      })
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Zeiteintrag erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Zeiteintrags:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Zeiteintrags' },
      { status: 500 }
    )
  }
}

