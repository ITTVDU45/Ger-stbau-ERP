/**
 * API Route: /api/einsatz
 * 
 * GET: Lädt Einsätze mit optionalen Filtern
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Einsatz } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

/**
 * GET /api/einsatz
 * 
 * Query-Parameter:
 * - projektId: Filter nach Projekt-ID
 * - mitarbeiterId: Filter nach Mitarbeiter-ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const projektId = searchParams.get('projektId')
    const mitarbeiterId = searchParams.get('mitarbeiterId')
    
    const db = await getDatabase()
    
    // Query erstellen
    const query: any = {}
    
    if (projektId) {
      query.projektId = projektId
    }
    
    if (mitarbeiterId) {
      query.mitarbeiterId = mitarbeiterId
    }
    
    // Einsätze laden
    const einsaetze = await db.collection<Einsatz>('einsatz')
      .find(query)
      .sort({ von: -1 })
      .toArray()
    
    // IDs zu Strings konvertieren
    const einsaetzeFormatted = einsaetze.map(e => ({
      ...e,
      _id: e._id?.toString()
    }))
    
    return NextResponse.json({
      erfolg: true,
      einsaetze: einsaetzeFormatted,
      meta: {
        total: einsaetzeFormatted.length,
        projektId,
        mitarbeiterId
      }
    })
    
  } catch (error) {
    console.error('Fehler beim Laden der Einsätze:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Einsätze' },
      { status: 500 }
    )
  }
}
