import { NextRequest, NextResponse } from 'next/server'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// POST/PUT - Erstellt oder aktualisiert die Vorkalkulation für ein Projekt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projektId: string }> }
) {
  const resolvedParams = await params
  return handleVorkalkulation(request, resolvedParams)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projektId: string }> }
) {
  const resolvedParams = await params
  return handleVorkalkulation(request, resolvedParams)
}

async function handleVorkalkulation(
  request: NextRequest,
  { projektId }: { projektId: string }
) {
  try {
    const body = await request.json()
    
    if (!projektId || projektId === 'undefined') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt-ID ist erforderlich' },
        { status: 400 }
      )
    }
    
    // Validierung
    if (!body.sollStundenAufbau || !body.sollStundenAbbau || !body.stundensatz) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Soll-Stunden (Aufbau/Abbau) und Stundensatz sind erforderlich' },
        { status: 400 }
      )
    }
    
    // Berechne Umsätze
    const sollUmsatzAufbau = body.sollStundenAufbau * body.stundensatz
    const sollUmsatzAbbau = body.sollStundenAbbau * body.stundensatz
    
    const vorkalkulation = {
      sollStundenAufbau: Number(body.sollStundenAufbau),
      sollStundenAbbau: Number(body.sollStundenAbbau),
      sollUmsatzAufbau,
      sollUmsatzAbbau,
      stundensatz: Number(body.stundensatz),
      materialkosten: body.materialkosten ? Number(body.materialkosten) : undefined,
      gemeinkosten: body.gemeinkosten ? Number(body.gemeinkosten) : undefined,
      gewinn: body.gewinn ? Number(body.gewinn) : undefined,
      quelle: body.quelle || 'manuell',
      angebotId: body.angebotId
    }
    
    // Speichere Vorkalkulation
    const erfolg = await KalkulationService.speichereVorkalkulation(
      projektId,
      vorkalkulation,
      body.erstelltVon || 'system'
    )
    
    if (!erfolg) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Fehler beim Speichern der Vorkalkulation' },
        { status: 500 }
      )
    }
    
    // Berechne initiale Nachkalkulation
    await KalkulationService.berechneNachkalkulation(projektId)
    
    return NextResponse.json({ 
      erfolg: true, 
      nachricht: 'Vorkalkulation erfolgreich gespeichert'
    })
  } catch (error) {
    console.error('Fehler beim Speichern der Vorkalkulation:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Speichern der Vorkalkulation' },
      { status: 500 }
    )
  }
}

