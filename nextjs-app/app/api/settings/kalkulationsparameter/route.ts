import { NextRequest, NextResponse } from 'next/server'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// GET - Holt globale Kalkulationsparameter
export async function GET(request: NextRequest) {
  try {
    const parameter = await KalkulationService.getKalkulationsParameter()
    
    return NextResponse.json({ 
      erfolg: true, 
      parameter
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Kalkulationsparameter:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Kalkulationsparameter' },
      { status: 500 }
    )
  }
}

// PUT - Aktualisiert globale Kalkulationsparameter
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validierung
    if (!body.standardStundensatz || body.standardStundensatz <= 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Gültiger Standard-Stundensatz ist erforderlich' },
        { status: 400 }
      )
    }
    
    if (!body.verteilungsfaktor || 
        body.verteilungsfaktor.aufbau + body.verteilungsfaktor.abbau !== 100) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Verteilungsfaktoren müssen zusammen 100% ergeben' },
        { status: 400 }
      )
    }
    
    const parameter = {
      standardStundensatz: Number(body.standardStundensatz),
      verteilungsfaktor: {
        aufbau: Number(body.verteilungsfaktor.aufbau),
        abbau: Number(body.verteilungsfaktor.abbau)
      },
      rundungsregel: body.rundungsregel || 'kaufmaennisch',
      farbschwellen: body.farbschwellen || {
        gruen: { min: 95, max: 105 },
        gelb: { min: 90, max: 110 },
        rot: { min: 0, max: 200 }
      },
      aktiv: body.aktiv !== undefined ? body.aktiv : true
    }
    
    const erfolg = await KalkulationService.speichereKalkulationsParameter(parameter)
    
    if (!erfolg) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Fehler beim Speichern der Parameter' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      nachricht: 'Kalkulationsparameter erfolgreich gespeichert'
    })
  } catch (error) {
    console.error('Fehler beim Speichern der Kalkulationsparameter:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Speichern der Kalkulationsparameter' },
      { status: 500 }
    )
  }
}

