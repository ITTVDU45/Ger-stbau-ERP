import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Zeiterfassung } from '@/lib/db/types'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// POST - Zeiteintrag freigeben
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const db = await getDatabase()
    const zeiterfassungCollection = db.collection<Zeiterfassung>('zeiterfassung')
    
    // Hole den Zeiteintrag, um das Projekt zu kennen
    const zeiteintrag = await zeiterfassungCollection.findOne({ _id: new ObjectId(id) })
    
    const result = await zeiterfassungCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          status: 'freigegeben',
          freigegebenVon: 'admin', // TODO: Aktuellen User verwenden
          freigegebenAm: new Date(),
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
    
    // Wenn Zeiteintrag mit Projekt verknüpft ist, berechne Nachkalkulation neu
    if (zeiteintrag?.projektId) {
      KalkulationService.berechneNachkalkulation(zeiteintrag.projektId).catch(err => {
        console.error('Fehler bei automatischer Nachkalkulation:', err)
      })
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Zeiteintrag erfolgreich freigegeben'
    })
  } catch (error) {
    console.error('Fehler beim Freigeben:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Freigeben' },
      { status: 500 }
    )
  }
}

