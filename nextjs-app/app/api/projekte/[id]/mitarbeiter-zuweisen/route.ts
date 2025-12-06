import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Zeiterfassung, Angebot, Projekt } from '@/lib/db/types'
import { KalkulationService } from '@/lib/db/services/kalkulationService'

// POST - Mitarbeiter zuweisen und automatisch Zeiterfassungen erstellen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projektId } = await params
    const body = await request.json()
    
    if (!body.neueMitarbeiter || !Array.isArray(body.neueMitarbeiter)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Mitarbeiter-Daten übergeben' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const projekteCollection = db.collection('projekte')
    const zeiterfassungCollection = db.collection<Zeiterfassung>('zeiterfassung')
    
    // Projekt laden
    const projekt = await projekteCollection.findOne({ _id: new ObjectId(projektId) })
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // Bestehende Mitarbeiter mit neuen kombinieren
    const alleMitarbeiter = [...(projekt.zugewieseneMitarbeiter || []), ...body.neueMitarbeiter]

    // Projekt aktualisieren
    await projekteCollection.updateOne(
      { _id: new ObjectId(projektId) },
      {
        $set: {
          zugewieseneMitarbeiter: alleMitarbeiter,
          zuletztGeaendert: new Date()
        }
      }
    )

    // Für jeden neuen Mitarbeiter Zeiterfassungen erstellen
    let erstellteZeiterfassungen = 0

    for (const mitarbeiter of body.neueMitarbeiter) {
      if (!mitarbeiter.von || !mitarbeiter.stundenProTag) continue

      const vonDatum = new Date(mitarbeiter.von)
      // Wenn kein Bis-Datum: nur der erste Tag, sonst von-bis
      const bisDatum = mitarbeiter.bis ? new Date(mitarbeiter.bis) : new Date(vonDatum)
      
      // Erstelle Zeiterfassungen für jeden Arbeitstag
      const zeiterfassungen: Zeiterfassung[] = []
      const currentDate = new Date(vonDatum)

      while (currentDate <= bisDatum) {
        const dayOfWeek = currentDate.getDay()
        
        // Überspringe Wochenenden (0 = Sonntag, 6 = Samstag)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const datumString = currentDate.toISOString().split('T')[0]
          
          // Prüfe ob für diesen Tag bereits eine Zeiterfassung existiert
          const existiert = await zeiterfassungCollection.findOne({
            mitarbeiterId: mitarbeiter.mitarbeiterId,
            projektId: projektId,
            datum: { 
              $gte: new Date(datumString + 'T00:00:00'),
              $lt: new Date(datumString + 'T23:59:59')
            }
          })
          
          // Nur erstellen, wenn noch keine Zeiterfassung für diesen Tag existiert
          if (!existiert) {
            zeiterfassungen.push({
              mitarbeiterId: mitarbeiter.mitarbeiterId,
              mitarbeiterName: mitarbeiter.mitarbeiterName,
              projektId: projektId,
              projektName: projekt.projektname,
              datum: new Date(currentDate),
              stunden: mitarbeiter.stundenProTag,
              von: '08:00',
              bis: mitarbeiter.stundenProTag === 8 ? '17:00' : undefined,
              pause: mitarbeiter.stundenProTag >= 6 ? 60 : undefined,
              status: 'offen',
              beschreibung: `Automatisch erstellt für ${mitarbeiter.rolle || 'Mitarbeiter'}`,
              erstelltAm: new Date(),
              zuletztGeaendert: new Date()
            } as Zeiterfassung)
          }
        }

        // Nächster Tag
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Zeiterfassungen in DB speichern
      if (zeiterfassungen.length > 0) {
        await zeiterfassungCollection.insertMany(zeiterfassungen as any[])
        erstellteZeiterfassungen += zeiterfassungen.length
      }
    }

    // Automatische Neuberechnung der Vorkalkulation basierend auf neuer Mitarbeiteranzahl
    try {
      // Hole aktualisiertes Projekt mit neuer Mitarbeiteranzahl
      const aktualisiertesProjekt = await projekteCollection.findOne({ _id: new ObjectId(projektId) }) as Projekt | null
      
      if (aktualisiertesProjekt?.angebotId) {
        // Nur automatisch neu berechnen, wenn ein Angebot zugewiesen ist
        const angeboteCollection = db.collection<Angebot>('angebote')
        const angebot = await angeboteCollection.findOne({ _id: new ObjectId(aktualisiertesProjekt.angebotId) })
        
        if (angebot) {
          const angebotNetto = angebot.netto
          const anzahlMitarbeiter = aktualisiertesProjekt.zugewieseneMitarbeiter?.length || 1
          const parameter = await KalkulationService.getKalkulationsParameter()
          const stundensatz = parameter.standardStundensatz

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
            angebotId: aktualisiertesProjekt.angebotId
          }

          await KalkulationService.speichereVorkalkulation(projektId, vorkalkulation, 'system-auto')
          await KalkulationService.berechneNachkalkulation(projektId)
          
          console.log(`✓ Vorkalkulation automatisch neu berechnet: ${anzahlMitarbeiter} Mitarbeiter, ${gesamtSollStunden.toFixed(2)}h gesamt`)
        }
      }
    } catch (error) {
      console.warn('Fehler bei automatischer Vorkalkulation-Neuberechnung:', error)
      // Nicht kritisch, Mitarbeiter-Zuweisung war erfolgreich
    }

    return NextResponse.json({
      erfolg: true,
      message: `${body.neueMitarbeiter.length} Mitarbeiter zugewiesen`,
      erstellteZeiterfassungen
    })
  } catch (error) {
    console.error('Fehler beim Zuweisen der Mitarbeiter:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Zuweisen der Mitarbeiter' },
      { status: 500 }
    )
  }
}

