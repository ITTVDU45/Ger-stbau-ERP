import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// GET - Gibt vollständige Kalkulation (Vor- + Nachkalkulation) für ein Projekt zurück
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projektId: string }> }
) {
  try {
    const { projektId } = await params
    
    if (!projektId || projektId === 'undefined') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt-ID ist erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const projekt = await db.collection<Projekt>('projekte').findOne({ 
      _id: new ObjectId(projektId) 
    })
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Falls Vorkalkulation vorhanden, aber Nachkalkulation fehlt oder veraltet,
    // berechne Nachkalkulation neu
    let nachkalkulation = projekt.nachkalkulation
    if (projekt.vorkalkulation && !nachkalkulation) {
      nachkalkulation = await KalkulationService.berechneNachkalkulation(projektId)
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      vorkalkulation: projekt.vorkalkulation,
      nachkalkulation,
      kalkulationsVerlauf: projekt.kalkulationsVerlauf || []
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Kalkulation:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Kalkulation' },
      { status: 500 }
    )
  }
}

