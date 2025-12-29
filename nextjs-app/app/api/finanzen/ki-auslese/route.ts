import { NextRequest, NextResponse } from 'next/server'
import { leseBelegAus } from '@/lib/services/openaiService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * KI-gestützte Beleg-Auslese mit OpenAI Vision API
 * POST /api/finanzen/ki-auslese
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const typ = formData.get('typ') as 'einnahme' | 'ausgabe'

    // Validierung
    if (!file) {
      return NextResponse.json({ 
        fehler: 'Keine Datei hochgeladen' 
      }, { status: 400 })
    }

    if (!typ || (typ !== 'einnahme' && typ !== 'ausgabe')) {
      return NextResponse.json({ 
        fehler: 'Typ muss "einnahme" oder "ausgabe" sein' 
      }, { status: 400 })
    }

    // Bilder und PDFs für KI-Auslese erlaubt
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.some(type => file.type === type)) {
      return NextResponse.json({ 
        erfolg: false,
        fehler: 'Für die KI-Auslese sind nur Bilder (JPG, PNG, WebP) und PDFs unterstützt.',
        confidence: 0,
        daten: {}
      }, { status: 400 })
    }

    // Größen-Limit für KI-Auslese (5MB für Performance)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        fehler: 'Bild zu groß für KI-Auslese (max 5MB)' 
      }, { status: 400 })
    }

    // Datei in Base64 konvertieren
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')

    // KI-Auslese durchführen
    console.log(`🤖 Starte KI-Auslese für ${typ}: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`)
    const startTime = Date.now()
    
    const result = await leseBelegAus(base64, file.type, typ)
    
    const duration = Date.now() - startTime
    console.log(`✅ KI-Auslese abgeschlossen in ${duration}ms, Konfidenz: ${(result.confidence * 100).toFixed(1)}%`)

    if (!result.erfolg) {
      return NextResponse.json({ 
        erfolg: false,
        fehler: result.fehler || 'KI-Auslese fehlgeschlagen',
        confidence: 0,
        daten: {}
      }, { status: 500 })
    }

    return NextResponse.json({
      erfolg: true,
      confidence: result.confidence,
      daten: result.daten,
      verarbeitungsdauer: duration,
      hinweis: result.confidence < 0.7 
        ? 'Niedrige Konfidenz - Bitte Daten sorgfältig prüfen' 
        : 'Daten erfolgreich extrahiert',
      pdfVerarbeitung: file.type === 'application/pdf' ? 'Text-Extraktion' : undefined
    })
  } catch (error: any) {
    console.error('❌ Fehler bei KI-Auslese:', error)
    return NextResponse.json({ 
      erfolg: false,
      fehler: error.message || 'Interner Serverfehler bei KI-Auslese',
      confidence: 0,
      daten: {}
    }, { status: 500 })
  }
}

