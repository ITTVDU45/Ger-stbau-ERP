import { NextResponse } from 'next/server'

/**
 * Test-Endpoint um zu prüfen, ob Google Maps API Key korrekt konfiguriert ist
 * GET /api/customer-import/test-config
 */
export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    const mongoUri = process.env.MONGODB_URI
    const mongoDb = process.env.MONGODB_DB

    const config = {
      googleMapsConfigured: !!apiKey,
      googleMapsKeyLength: apiKey ? apiKey.length : 0,
      googleMapsKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'nicht gesetzt',
      mongoDbConfigured: !!mongoUri,
      mongoDbName: mongoDb || 'nicht gesetzt',
      environment: process.env.NODE_ENV || 'development'
    }

    // Zusätzliche Validierung
    const warnings = []
    const errors = []

    if (!apiKey) {
      errors.push('GOOGLE_MAPS_API_KEY ist nicht gesetzt')
    } else if (apiKey.length < 30) {
      warnings.push('GOOGLE_MAPS_API_KEY erscheint zu kurz (typisch: 39 Zeichen)')
    }

    if (!mongoUri) {
      warnings.push('MONGODB_URI ist nicht gesetzt')
    }

    const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'

    return NextResponse.json({
      status,
      config,
      warnings,
      errors,
      message: status === 'ok' 
        ? '✅ Alle Konfigurationen sind korrekt gesetzt' 
        : status === 'warning'
          ? '⚠️ Konfiguration funktioniert, aber es gibt Warnungen'
          : '❌ Kritische Konfigurationsfehler gefunden'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Fehler beim Überprüfen der Konfiguration',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

