import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Projekt, Angebot } from '@/lib/db/types'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

/**
 * POST /api/admin/link-projekt-to-angebot
 * 
 * Verknüpft ein Projekt mit einem Angebot anhand von Angebotsnummer
 * 
 * Body: { projektId: string, angebotsnummer: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projektId, angebotsnummer } = body
    
    if (!projektId || !angebotsnummer) {
      return NextResponse.json(
        { erfolg: false, fehler: 'projektId und angebotsnummer erforderlich' },
        { status: 400 }
      )
    }
    
    console.log(`🔗 Verknüpfe Projekt ${projektId} mit Angebot ${angebotsnummer}...`)
    
    const db = await getDatabase()
    
    // Finde das Projekt
    if (!ObjectId.isValid(projektId)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
        { status: 400 }
      )
    }
    
    const projekt = await db.collection<Projekt>('projekte').findOne({ 
      _id: new ObjectId(projektId) 
    })
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }
    
    console.log(`✓ Projekt gefunden: ${projekt.projektnummer}`)
    
    // Finde das Angebot
    const angebot = await db.collection<Angebot>('angebote').findOne({
      angebotsnummer: angebotsnummer
    })
    
    if (!angebot) {
      return NextResponse.json(
        { erfolg: false, fehler: `Angebot ${angebotsnummer} nicht gefunden` },
        { status: 404 }
      )
    }
    
    console.log(`✓ Angebot gefunden: ${angebot._id}`)
    console.log(`  Netto: ${angebot.netto}, Brutto: ${angebot.brutto}`)
    
    const angebotId = angebot._id
    
    // Update Projekt
    await db.collection('projekte').updateOne(
      { _id: new ObjectId(projektId) },
      {
        $set: {
          angebotId: angebotId, // Als ObjectId!
          angebotsnummer: angebot.angebotsnummer,
          angebotssumme: angebot.brutto || 0,
          budget: angebot.netto || 0,
          zuletztGeaendert: new Date()
        },
        $push: {
          aktivitaeten: {
            aktion: 'Angebot zugewiesen (Admin-Fix)',
            benutzer: 'admin',
            zeitpunkt: new Date(),
            details: `Angebot ${angebot.angebotsnummer} wurde manuell zugewiesen`,
            typ: 'angebot'
          } as any
        }
      }
    )
    
    console.log(`✅ Projekt aktualisiert mit angebotId: ${angebotId}`)
    
    // Update Angebot
    await db.collection('angebote').updateOne(
      { _id: angebotId },
      {
        $set: {
          projektId: projektId,
          projektnummer: projekt.projektnummer,
          zuletztGeaendert: new Date()
        }
      }
    )
    
    console.log(`✅ Angebot aktualisiert mit projektId: ${projektId}`)
    
    // Erstelle automatisch Vorkalkulation
    try {
      const anzahlMitarbeiter = projekt.zugewieseneMitarbeiter?.length || 1
      const parameter = await KalkulationService.getKalkulationsParameter()
      const stundensatz = parameter.standardStundensatz
      const angebotNetto = angebot.netto

      // Berechnung
      const gesamtStundenKolonne = angebotNetto / stundensatz
      const sollStundenAufbauKolonne = gesamtStundenKolonne * (parameter.verteilungsfaktor.aufbau / 100)
      const sollStundenAbbauKolonne = gesamtStundenKolonne * (parameter.verteilungsfaktor.abbau / 100)
      const sollUmsatzAufbau = sollStundenAufbauKolonne * stundensatz
      const sollUmsatzAbbau = sollStundenAbbauKolonne * stundensatz
      const gesamtSollStunden = sollStundenAufbauKolonne + sollStundenAbbauKolonne
      const gesamtSollUmsatz = sollUmsatzAufbau + sollUmsatzAbbau

      const vorkalkulation = {
        sollStundenAufbau: Math.round(sollStundenAufbauKolonne * 100) / 100,
        sollStundenAbbau: Math.round(sollStundenAbbauKolonne * 100) / 100,
        sollUmsatzAufbau: Math.round(sollUmsatzAufbau * 100) / 100,
        sollUmsatzAbbau: Math.round(sollUmsatzAbbau * 100) / 100,
        stundensatz,
        gesamtSollStunden: Math.round(gesamtSollStunden * 100) / 100,
        gesamtSollUmsatz: Math.round(gesamtSollUmsatz * 100) / 100,
        quelle: 'angebot' as const,
        angebotId: angebotId.toString()
      }

      await KalkulationService.speichereVorkalkulation(projektId, vorkalkulation, 'admin-fix')
      await KalkulationService.berechneNachkalkulation(projektId)
      
      console.log(`✅ Vorkalkulation erstellt: ${anzahlMitarbeiter} MA, ${gesamtSollStunden.toFixed(2)}h`)
      
      return NextResponse.json({
        erfolg: true,
        nachricht: 'Projekt erfolgreich mit Angebot verknüpft und Vorkalkulation erstellt',
        details: {
          projektId,
          projektnummer: projekt.projektnummer,
          angebotId: angebotId.toString(),
          angebotsnummer: angebot.angebotsnummer,
          budget: angebot.netto,
          angebotssumme: angebot.brutto,
          vorkalkulation: {
            gesamtSollStunden,
            gesamtSollUmsatz,
            anzahlMitarbeiter
          }
        }
      })
      
    } catch (kalkulationError) {
      console.warn('⚠️  Fehler bei Vorkalkulation:', kalkulationError)
      
      return NextResponse.json({
        erfolg: true,
        nachricht: 'Projekt mit Angebot verknüpft, aber Vorkalkulation fehlgeschlagen',
        warnung: 'Vorkalkulation konnte nicht erstellt werden',
        details: {
          projektId,
          projektnummer: projekt.projektnummer,
          angebotId: angebotId.toString(),
          angebotsnummer: angebot.angebotsnummer,
          budget: angebot.netto,
          angebotssumme: angebot.brutto
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error)
    return NextResponse.json(
      { 
        erfolg: false, 
        fehler: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

