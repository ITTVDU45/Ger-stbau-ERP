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

    // Bestehende Mitarbeiter mit neuen kombinieren - aber Duplikate zusammenführen
    const existierendeMitarbeiter = projekt.zugewieseneMitarbeiter || []
    const alleMitarbeiter = [...existierendeMitarbeiter]
    
    // Für jeden neuen Mitarbeiter prüfen, ob er bereits zugewiesen ist
    for (const neuerMitarbeiter of body.neueMitarbeiter) {
      const existierendeZuweisung = alleMitarbeiter.find(
        m => m.mitarbeiterId === neuerMitarbeiter.mitarbeiterId
      )
      
      if (existierendeZuweisung) {
        // Mitarbeiter existiert bereits - addiere Aufbau/Abbau-Stunden
        existierendeZuweisung.stundenAufbau = 
          ((existierendeZuweisung as any).stundenAufbau || 0) + (neuerMitarbeiter.stundenAufbau || 0)
        existierendeZuweisung.stundenAbbau = 
          ((existierendeZuweisung as any).stundenAbbau || 0) + (neuerMitarbeiter.stundenAbbau || 0)
        
        // Aktualisiere Zeitraum falls erforderlich (erweitere auf frühestes Von und spätestes Bis)
        if (neuerMitarbeiter.von) {
          const neuesVon = new Date(neuerMitarbeiter.von)
          const bestehendesVon = existierendeZuweisung.von ? new Date(existierendeZuweisung.von) : new Date()
          if (neuesVon < bestehendesVon) {
            existierendeZuweisung.von = neuesVon
          }
        }
        
        if (neuerMitarbeiter.bis) {
          const neuesBis = new Date(neuerMitarbeiter.bis)
          const bestehendesBis = existierendeZuweisung.bis ? new Date(existierendeZuweisung.bis) : undefined
          if (!bestehendesBis || neuesBis > bestehendesBis) {
            existierendeZuweisung.bis = neuesBis
          }
        }
        
        console.log(`✓ Mitarbeiter ${neuerMitarbeiter.mitarbeiterName} bereits zugewiesen - Stunden addiert`)
      } else {
        // Neuer Mitarbeiter - hinzufügen
        alleMitarbeiter.push(neuerMitarbeiter)
      }
    }

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

    // Für jeden Mitarbeiter (neu oder aktualisiert) Zeiterfassungen erstellen
    let erstellteZeiterfassungen = 0

    // Verarbeite alle neuen Mitarbeiter-Zuweisungen
    for (const mitarbeiter of body.neueMitarbeiter) {
      if (!mitarbeiter.von) continue

      const vonDatum = new Date(mitarbeiter.von)
      // Wenn kein Bis-Datum: nur der erste Tag, sonst von-bis
      const bisDatum = mitarbeiter.bis ? new Date(mitarbeiter.bis) : new Date(vonDatum)
      
      // Berechne Anzahl Arbeitstage
      let arbeitstage = 0
      const checkDate = new Date(vonDatum)
      while (checkDate <= bisDatum) {
        const dayOfWeek = checkDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          arbeitstage++
        }
        checkDate.setDate(checkDate.getDate() + 1)
      }

      // Berechne Stunden pro Tag für Aufbau und Abbau
      const stundenAufbauProTag = arbeitstage > 0 && mitarbeiter.stundenAufbau > 0 
        ? mitarbeiter.stundenAufbau / arbeitstage 
        : 0
      const stundenAbbauProTag = arbeitstage > 0 && mitarbeiter.stundenAbbau > 0 
        ? mitarbeiter.stundenAbbau / arbeitstage 
        : 0
      
      console.log(`[Zeiterfassung] Mitarbeiter: ${mitarbeiter.mitarbeiterName}`)
      console.log(`[Zeiterfassung] Arbeitstage: ${arbeitstage}`)
      console.log(`[Zeiterfassung] Aufbau gesamt: ${mitarbeiter.stundenAufbau}h, pro Tag: ${stundenAufbauProTag}h`)
      console.log(`[Zeiterfassung] Abbau gesamt: ${mitarbeiter.stundenAbbau}h, pro Tag: ${stundenAbbauProTag}h`)
      
      // Erstelle Zeiterfassungen für jeden Arbeitstag
      const zeiterfassungen: Zeiterfassung[] = []
      const currentDate = new Date(vonDatum)

      while (currentDate <= bisDatum) {
        const dayOfWeek = currentDate.getDay()
        
        // Überspringe Wochenenden (0 = Sonntag, 6 = Samstag)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const datumString = currentDate.toISOString().split('T')[0]
          
          // Erstelle separate Einträge für Aufbau und Abbau, falls beide vorhanden
          if (stundenAufbauProTag > 0) {
            const existiert = await zeiterfassungCollection.findOne({
              mitarbeiterId: mitarbeiter.mitarbeiterId,
              projektId: projektId,
              taetigkeitstyp: 'aufbau',
              datum: { 
                $gte: new Date(datumString + 'T00:00:00'),
                $lt: new Date(datumString + 'T23:59:59')
              }
            })
            
            if (!existiert) {
              zeiterfassungen.push({
                mitarbeiterId: mitarbeiter.mitarbeiterId,
                mitarbeiterName: mitarbeiter.mitarbeiterName,
                projektId: projektId,
                projektName: projekt.projektname,
                datum: new Date(currentDate),
                stunden: Math.round(stundenAufbauProTag * 10) / 10,
                von: '08:00',
                bis: undefined,
                pause: stundenAufbauProTag >= 6 ? 60 : undefined,
                taetigkeitstyp: 'aufbau',
                status: 'offen',
                beschreibung: `Aufbau - ${mitarbeiter.rolle || 'Mitarbeiter'}`,
                erstelltAm: new Date(),
                zuletztGeaendert: new Date()
              } as Zeiterfassung)
            }
          }

          if (stundenAbbauProTag > 0) {
            const existiert = await zeiterfassungCollection.findOne({
              mitarbeiterId: mitarbeiter.mitarbeiterId,
              projektId: projektId,
              taetigkeitstyp: 'abbau',
              datum: { 
                $gte: new Date(datumString + 'T00:00:00'),
                $lt: new Date(datumString + 'T23:59:59')
              }
            })
            
            if (!existiert) {
              zeiterfassungen.push({
                mitarbeiterId: mitarbeiter.mitarbeiterId,
                mitarbeiterName: mitarbeiter.mitarbeiterName,
                projektId: projektId,
                projektName: projekt.projektname,
                datum: new Date(currentDate),
                stunden: Math.round(stundenAbbauProTag * 10) / 10,
                von: '08:00',
                bis: undefined,
                pause: stundenAbbauProTag >= 6 ? 60 : undefined,
                taetigkeitstyp: 'abbau',
                status: 'offen',
                beschreibung: `Abbau - ${mitarbeiter.rolle || 'Mitarbeiter'}`,
                erstelltAm: new Date(),
                zuletztGeaendert: new Date()
              } as Zeiterfassung)
            }
          }

          // Falls weder Aufbau noch Abbau-Stunden angegeben, erstelle Eintrag mit stundenProTag
          if (stundenAufbauProTag === 0 && stundenAbbauProTag === 0 && mitarbeiter.stundenProTag) {
            const existiert = await zeiterfassungCollection.findOne({
              mitarbeiterId: mitarbeiter.mitarbeiterId,
              projektId: projektId,
              datum: { 
                $gte: new Date(datumString + 'T00:00:00'),
                $lt: new Date(datumString + 'T23:59:59')
              }
            })
            
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
                taetigkeitstyp: 'aufbau',
                status: 'offen',
                beschreibung: `${mitarbeiter.rolle || 'Mitarbeiter'}`,
                erstelltAm: new Date(),
                zuletztGeaendert: new Date()
              } as Zeiterfassung)
            }
          }
        }

        // Nächster Tag
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Zeiterfassungen in DB speichern
      if (zeiterfassungen.length > 0) {
        console.log(`[Zeiterfassung] Speichere ${zeiterfassungen.length} Zeiterfassungen für ${mitarbeiter.mitarbeiterName}`)
        await zeiterfassungCollection.insertMany(zeiterfassungen as any[])
        erstellteZeiterfassungen += zeiterfassungen.length
        console.log(`[Zeiterfassung] ✓ Erfolgreich gespeichert`)
      } else {
        console.log(`[Zeiterfassung] ⚠️ Keine Zeiterfassungen zu erstellen für ${mitarbeiter.mitarbeiterName}`)
      }
    }
    
    console.log(`[Zeiterfassung] Gesamt erstellt: ${erstellteZeiterfassungen} Zeiterfassungen`)

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

