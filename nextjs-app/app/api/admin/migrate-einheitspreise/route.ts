import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Angebot } from '@/lib/db/types'

/**
 * POST /api/admin/migrate-einheitspreise
 * 
 * Migrations-Endpoint: Setzt preisTyp='einheitspreis' für alle Miete-Positionen
 * die als Einheitspreis erkannt werden (einzelpreis=0 oder "bezieht sich" in Beschreibung)
 */
export async function POST() {
  try {
    console.log('🔧 Starte Migration: Einheitspreise in Angeboten markieren...\n')
    
    const db = await getDatabase()
    const angeboteCollection = db.collection<Angebot>('angebote')
    
    // Finde alle Angebote
    const alleAngebote = await angeboteCollection.find({}).toArray()
    
    console.log(`📊 Gefunden: ${alleAngebote.length} Angebote\n`)
    
    const results = {
      total: alleAngebote.length,
      updated: 0,
      skipped: 0,
      positionenAktualisiert: 0,
      details: [] as any[]
    }
    
    for (const angebot of alleAngebote) {
      const angebotId = angebot._id.toString()
      const angebotsnummer = angebot.angebotsnummer
      
      console.log(`\n🔍 Angebot: ${angebotsnummer} (${angebotId})`)
      
      if (!angebot.positionen || angebot.positionen.length === 0) {
        console.log(`   ⏭️  Keine Positionen - überspringe`)
        results.skipped++
        continue
      }
      
      // Prüfe ob Positionen aktualisiert werden müssen
      let hatAenderungen = false
      const aktualisiertepositionen = angebot.positionen.map((pos, index) => {
        // NEUE LOGIK: Alle Miete-Positionen sind standardmäßig Einheitspreise
        // Auch wenn sie bereits als 'fest' markiert wurden!
        if (pos.typ === 'miete' && pos.preisTyp !== 'einheitspreis') {
          console.log(`   ✓ Position ${pos.position}: "${pos.beschreibung}" → preisTyp='einheitspreis' (Miete)`)
          hatAenderungen = true
          results.positionenAktualisiert++
          
          return {
            ...pos,
            preisTyp: 'einheitspreis' as const,
            // Falls verknuepftMitPosition nicht gesetzt ist, versuche es aus Beschreibung zu extrahieren
            verknuepftMitPosition: pos.verknuepftMitPosition || extractPositionFromDescription(pos.beschreibung),
            // Speichere den aktuellen Preis als finalerEinzelpreis wenn vorhanden
            finalerEinzelpreis: pos.einzelpreis > 0 ? pos.einzelpreis : undefined,
            finalerGesamtpreis: pos.gesamtpreis > 0 ? pos.gesamtpreis : undefined
          }
        }
        
        // Alle anderen Positionen ohne preisTyp → 'fest'
        if (!pos.preisTyp && pos.typ !== 'miete') {
          return {
            ...pos,
            preisTyp: 'fest' as const
          }
        }
        
        return pos
      })
      
      if (hatAenderungen) {
        // Update Angebot
        await angeboteCollection.updateOne(
          { _id: angebot._id },
          {
            $set: {
              positionen: aktualisiertepositionen,
              zuletztGeaendert: new Date()
            }
          }
        )
        
        console.log(`   ✅ Angebot aktualisiert`)
        results.updated++
        
        results.details.push({
          angebotId,
          angebotsnummer,
          status: 'updated',
          positionenAktualisiert: aktualisiertepositionen.filter(p => p.preisTyp === 'einheitspreis').length
        })
      } else {
        console.log(`   ⏭️  Keine Änderungen nötig`)
        results.skipped++
        
        results.details.push({
          angebotId,
          angebotsnummer,
          status: 'skipped'
        })
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📋 ZUSAMMENFASSUNG:')
    console.log('='.repeat(60))
    console.log(`✅ Aktualisiert:    ${results.updated} Angebote`)
    console.log(`⏭️  Übersprungen:   ${results.skipped} Angebote`)
    console.log(`📝 Positionen:      ${results.positionenAktualisiert} auf 'einheitspreis' gesetzt`)
    console.log('='.repeat(60))
    
    return NextResponse.json({
      erfolg: true,
      nachricht: `Migration abgeschlossen: ${results.updated} Angebote aktualisiert, ${results.positionenAktualisiert} Positionen auf 'einheitspreis' gesetzt`,
      results
    })
    
  } catch (error) {
    console.error('❌ Fehler bei Migration:', error)
    return NextResponse.json(
      { 
        erfolg: false, 
        fehler: 'Fehler bei Migration', 
        details: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    )
  }
}

/**
 * Versucht die Position aus der Beschreibung zu extrahieren
 * z.B. "Miete (bezieht sich auf Pos. 1)" → "01"
 */
function extractPositionFromDescription(beschreibung?: string): string | undefined {
  if (!beschreibung) return undefined
  
  // Suche nach Patterns wie "Pos. 1", "Position 1", "pos 01"
  const patterns = [
    /Pos\.\s*(\d+)/i,
    /Position\s*(\d+)/i,
    /pos\s*(\d+)/i
  ]
  
  for (const pattern of patterns) {
    const match = beschreibung.match(pattern)
    if (match && match[1]) {
      // Formatiere mit führender 0 wenn nötig
      const num = parseInt(match[1])
      return num < 10 ? `0${num}` : `${num}`
    }
  }
  
  return undefined
}

