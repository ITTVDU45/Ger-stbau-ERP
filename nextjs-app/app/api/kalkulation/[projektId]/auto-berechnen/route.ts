import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Projekt, Angebot, CompanySettings } from '@/lib/db/types'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

/**
 * POST /api/kalkulation/[projektId]/auto-berechnen
 * 
 * Berechnet automatisch die Vorkalkulation basierend auf:
 * - Angebot (Netto-Summe)
 * - Anzahl zugewiesener Mitarbeiter
 * - Stundensatz (aus Einstellungen oder projektspezifisch)
 * 
 * Wird getriggert:
 * 1. Wenn ein Angebot angenommen wird
 * 2. Wenn Mitarbeiter zugewiesen/entfernt werden
 */
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

    const db = await getDatabase()
    const projekteCollection = db.collection<Projekt>('projekte')
    const angeboteCollection = db.collection<Angebot>('angebote')

    // Projekt laden
    const projekt = await projekteCollection.findOne({ _id: new ObjectId(projektId) })
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // Angebot laden (falls vorhanden)
    let angebotNettoOhneEP = projekt.budget || 0
    let angebotId: string | undefined = undefined

    if (projekt.angebotId) {
      const angebot = await angeboteCollection.findOne({ _id: new ObjectId(projekt.angebotId) })
      if (angebot) {
        // Berechne Netto OHNE Einheitspreise (E.P. / Miete)
        angebotNettoOhneEP = angebot.positionen
          ?.filter(pos => 
            pos.preisTyp !== 'einheitspreis' && 
            pos.typ !== 'miete'
          )
          .reduce((sum, pos) => sum + (pos.gesamtpreis || 0), 0) || angebot.netto
        
        console.log(`[Auto-Berechnen] Netto gesamt: ${angebot.netto}, Netto ohne E.P.: ${angebotNettoOhneEP}`)
        angebotId = projekt.angebotId
      }
    }

    if (angebotNettoOhneEP <= 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kein gültiger Netto-Betrag gefunden. Bitte Angebot oder Budget hinterlegen.' },
        { status: 400 }
      )
    }

    // Anzahl zugewiesener Mitarbeiter
    const anzahlMitarbeiter = projekt.zugewieseneMitarbeiter?.length || 1

    // Kalkulationsparameter abrufen
    const parameter = await KalkulationService.getKalkulationsParameter()
    const stundensatz = parameter.standardStundensatz

    // ============================
    // BERECHNUNG (OHNE Einheitspreise)
    // ============================
    
    // 1. Gesamt-Stunden für gesamte Kolonne = Netto (ohne E.P.) / Stundensatz
    const gesamtStundenKolonne = angebotNettoOhneEP / stundensatz
    
    // 2. Verteilung nach 70/30 (Aufbau/Abbau) für gesamte Kolonne
    const sollStundenAufbauKolonne = gesamtStundenKolonne * (parameter.verteilungsfaktor.aufbau / 100)
    const sollStundenAbbauKolonne = gesamtStundenKolonne * (parameter.verteilungsfaktor.abbau / 100)
    
    // 3. Umsätze berechnen
    const sollUmsatzAufbau = sollStundenAufbauKolonne * stundensatz
    const sollUmsatzAbbau = sollStundenAbbauKolonne * stundensatz
    
    // 4. Gesamt-Soll (einfache Summe, nicht gewichtet)
    const gesamtSollStunden = sollStundenAufbauKolonne + sollStundenAbbauKolonne
    const gesamtSollUmsatz = sollUmsatzAufbau + sollUmsatzAbbau
    
    // 5. Vorkalkulation erstellen
    const vorkalkulation = {
      sollStundenAufbau: Math.round(sollStundenAufbauKolonne * 100) / 100,
      sollStundenAbbau: Math.round(sollStundenAbbauKolonne * 100) / 100,
      sollUmsatzAufbau: Math.round(sollUmsatzAufbau * 100) / 100,
      sollUmsatzAbbau: Math.round(sollUmsatzAbbau * 100) / 100,
      stundensatz,
      gesamtSollStunden: Math.round(gesamtSollStunden * 100) / 100,
      gesamtSollUmsatz: Math.round(gesamtSollUmsatz * 100) / 100,
      erstelltAm: new Date(),
      erstelltVon: 'system-auto',
      quelle: angebotId ? 'angebot' : 'manuell',
      angebotId
    }

    // Speichern
    const erfolg = await KalkulationService.speichereVorkalkulation(
      projektId,
      vorkalkulation,
      'system-auto'
    )

    if (!erfolg) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Fehler beim Speichern der Vorkalkulation' },
        { status: 500 }
      )
    }

    // Initiale Nachkalkulation berechnen
    await KalkulationService.berechneNachkalkulation(projektId)

    // Aktivität hinzufügen
    const neueAktivitaet = {
      aktion: 'Vorkalkulation automatisch berechnet',
      benutzer: 'system',
      zeitpunkt: new Date(),
      details: `Automatisch berechnet aus Angebot (${angebotNettoOhneEP.toLocaleString('de-DE')} € ohne E.P., ${anzahlMitarbeiter} Mitarbeiter, ${stundensatz} €/h)`,
      typ: 'projekt' as const
    }

    await projekteCollection.updateOne(
      { _id: new ObjectId(projektId) },
      {
        $push: {
          aktivitaeten: neueAktivitaet
        } as any
      }
    )

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Vorkalkulation erfolgreich automatisch berechnet',
      vorkalkulation,
      berechnungsgrundlage: {
        angebotNetto: angebotNettoOhneEP,
        anzahlMitarbeiter,
        stundensatz,
        verteilungsfaktor: parameter.verteilungsfaktor,
        hinweis: 'Einheitspreise (E.P./Miete) sind ausgeschlossen'
      }
    })
  } catch (error) {
    console.error('Fehler bei der automatischen Berechnung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler bei der automatischen Berechnung' },
      { status: 500 }
    )
  }
}

