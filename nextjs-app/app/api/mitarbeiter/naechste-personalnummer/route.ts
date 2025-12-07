import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Mitarbeiter } from '@/lib/db/types'

// GET - Nächste verfügbare Personalnummer abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    // Alle Mitarbeiter mit Personalnummern im Format M-XXX holen
    const alleMitarbeiter = await mitarbeiterCollection
      .find({ personalnummer: { $regex: /^M-\d+$/ } })
      .sort({ personalnummer: -1 })
      .limit(1)
      .toArray()
    
    let naechstePersonalnummer = 'M-001'
    
    if (alleMitarbeiter.length > 0) {
      const hoechsteNummer = alleMitarbeiter[0].personalnummer
      const match = hoechsteNummer.match(/^M-(\d+)$/)
      
      if (match) {
        const naechsteNummer = parseInt(match[1], 10) + 1
        naechstePersonalnummer = `M-${String(naechsteNummer).padStart(3, '0')}`
      }
    }
    
    return NextResponse.json({ 
      erfolg: true, 
      personalnummer: naechstePersonalnummer 
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der nächsten Personalnummer:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der nächsten Personalnummer' },
      { status: 500 }
    )
  }
}

