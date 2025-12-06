import { NextRequest, NextResponse } from 'next/server'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// POST - Triggert manuelle Neuberechnung der Nachkalkulation
export async function POST(
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
    
    // Berechne Nachkalkulation neu
    const nachkalkulation = await KalkulationService.berechneNachkalkulation(projektId)
    
    if (!nachkalkulation) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Nachkalkulation konnte nicht berechnet werden. Ist eine Vorkalkulation vorhanden?' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      nachkalkulation,
      nachricht: 'Nachkalkulation erfolgreich neu berechnet'
    })
  } catch (error) {
    console.error('Fehler bei der Neuberechnung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler bei der Neuberechnung der Nachkalkulation' },
      { status: 500 }
    )
  }
}

