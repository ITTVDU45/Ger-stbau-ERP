import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Projekt, Angebot } from '@/lib/db/types'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// POST - Angebot zu Projekt zuweisen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { angebotId } = body

    if (!angebotId || !ObjectId.isValid(angebotId)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Angebots-ID' },
        { status: 400 }
      )
    }

    // Projekt laden
    const projekt = await db.collection<Projekt>('projekte').findOne({ _id: new ObjectId(id) })
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // Angebot laden
    const angebot = await db.collection<Angebot>('angebote').findOne({ _id: new ObjectId(angebotId) })
    if (!angebot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Angebot nicht gefunden' },
        { status: 404 }
      )
    }

    // Prüfen ob Angebot angenommen wurde
    if (angebot.status !== 'angenommen') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Angebot muss erst angenommen werden' },
        { status: 400 }
      )
    }

    // Neue Aktivität
    const neueAktivitaet = {
      aktion: 'Angebot zugewiesen',
      benutzer: body.benutzer || 'admin',
      zeitpunkt: new Date(),
      details: `Angebot ${angebot.angebotsnummer} wurde diesem Projekt zugewiesen`,
      typ: 'angebot'
    }

    // Berechne Netto OHNE Einheitspreise für Budget
    const nettoOhneEPBudget = angebot.positionen
      ?.filter(pos => 
        pos.preisTyp !== 'einheitspreis' && 
        pos.typ !== 'miete'
      )
      .reduce((sum, pos) => sum + (pos.gesamtpreis || 0), 0) || angebot.netto
    
    // Projekt aktualisieren
    await db.collection('projekte').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'aktiv',
          angebotId: new ObjectId(angebotId), // ← FIX: Als ObjectId speichern!
          angebotsnummer: angebot.angebotsnummer,
          angebotssumme: angebot.brutto || 0,
          budget: nettoOhneEPBudget, // Budget OHNE Einheitspreise
          offenerBetrag: angebot.brutto || 0,
          zuletztGeaendert: new Date()
        },
        $push: {
          aktivitaeten: neueAktivitaet as any
        }
      }
    )
    
    console.log(`✓ Projekt aktualisiert mit angebotId: ${angebotId} (als ObjectId)`)
    console.log(`✓ Budget gesetzt: ${nettoOhneEPBudget} (ohne E.P.), Angebotsnummer: ${angebot.angebotsnummer}`)

    // Angebot aktualisieren (Status auf "projekt_zugeordnet")
    await db.collection('angebote').updateOne(
      { _id: new ObjectId(angebotId) },
      {
        $set: {
          projektId: id,
          projektnummer: projekt.projektnummer,
          zuletztGeaendert: new Date()
        }
      }
    )

    // ====================================
    // AUTOMATISCHE VORKALKULATION ERSTELLEN
    // ====================================
    try {
      // Berechne Netto OHNE Einheitspreise (E.P. / Miete)
      const nettoOhneEP = angebot.positionen
        ?.filter(pos => 
          pos.preisTyp !== 'einheitspreis' && 
          pos.typ !== 'miete'
        )
        .reduce((sum, pos) => sum + (pos.gesamtpreis || 0), 0) || angebot.netto
      
      console.log(`[Angebot-Zuweisen] Netto gesamt: ${angebot.netto}, Netto ohne E.P.: ${nettoOhneEP}`)
      
      const anzahlMitarbeiter = projekt.zugewieseneMitarbeiter?.length || 1
      const parameter = await KalkulationService.getKalkulationsParameter()
      const stundensatz = parameter.standardStundensatz

      // Berechnung (OHNE Einheitspreise)
      const gesamtStundenKolonne = nettoOhneEP / stundensatz
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
        angebotId: angebotId
      }

      await KalkulationService.speichereVorkalkulation(id, vorkalkulation, body.benutzer || 'system-auto')
      await KalkulationService.berechneNachkalkulation(id)
      
      console.log(`✓ Vorkalkulation automatisch erstellt beim Angebot-Zuweisen: ${anzahlMitarbeiter} MA, ${gesamtSollStunden.toFixed(2)}h`)
    } catch (error) {
      console.warn('Fehler bei automatischer Vorkalkulation-Erstellung:', error)
      // Nicht kritisch, Angebot-Zuweisung war erfolgreich
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Angebot erfolgreich zugewiesen und Vorkalkulation erstellt',
      projekt: {
        status: 'aktiv',
        angebotsnummer: angebot.angebotsnummer,
        angebotssumme: angebot.brutto
      }
    })
  } catch (error) {
    console.error('Fehler beim Zuweisen des Angebots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

