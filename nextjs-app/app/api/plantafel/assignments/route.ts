/**
 * API Route: /api/plantafel/assignments
 * 
 * GET: Lädt alle Einsätze und (optional) Abwesenheiten für einen Zeitraum
 * POST: Erstellt einen neuen Einsatz
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Einsatz, Urlaub, Mitarbeiter, Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { format } from 'date-fns'
import {
  PlantafelEvent,
  PlantafelResource,
  PlantafelView,
  ConflictInfo,
  mapEinsatzToEvents,
  mapUrlaubToEvent,
  mapMitarbeiterToResource,
  mapProjektToResource,
  checkOverlap,
  getOverlapPeriod
} from '@/components/plantafel/types'
import { syncEinsatzToZeiterfassung } from '@/lib/services/plantafelSyncService'

/**
 * Berechnet Konflikte für eine Liste von Events
 */
function calculateConflicts(events: PlantafelEvent[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []
  const processedPairs = new Set<string>()
  
  // Gruppiere Events nach Mitarbeiter
  const eventsByEmployee = new Map<string, PlantafelEvent[]>()
  
  for (const event of events) {
    if (!event.mitarbeiterId) continue
    
    const existing = eventsByEmployee.get(event.mitarbeiterId) || []
    existing.push(event)
    eventsByEmployee.set(event.mitarbeiterId, existing)
  }
  
  // Prüfe Überlappungen pro Mitarbeiter
  for (const [mitarbeiterId, employeeEvents] of eventsByEmployee) {
    for (let i = 0; i < employeeEvents.length; i++) {
      for (let j = i + 1; j < employeeEvents.length; j++) {
        const event1 = employeeEvents[i]
        const event2 = employeeEvents[j]
        
        // Prüfe Überlappung
        if (checkOverlap(event1.start, event1.end, event2.start, event2.end)) {
          const pairKey = [event1.id, event2.id].sort().join('-')
          
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey)
            
            const overlap = getOverlapPeriod(event1.start, event1.end, event2.start, event2.end)
            
            // Bestimme Konflikt-Typ
            let conflictType: ConflictInfo['conflictType'] = 'double_booking'
            if (event1.sourceType === 'urlaub' || event2.sourceType === 'urlaub') {
              conflictType = 'work_during_absence'
            }
            
            // Bestimme Schweregrad
            const severity: ConflictInfo['severity'] = 
              (event1.bestaetigt && event2.bestaetigt) ? 'error' : 'warning'
            
            conflicts.push({
              id: `conflict-${pairKey}`,
              mitarbeiterId,
              mitarbeiterName: event1.mitarbeiterName || '',
              event1: {
                id: event1.id,
                title: event1.title,
                type: event1.type,
                start: event1.start,
                end: event1.end
              },
              event2: {
                id: event2.id,
                title: event2.title,
                type: event2.type,
                start: event2.start,
                end: event2.end
              },
              conflictType,
              severity,
              overlapStart: overlap?.start || event1.start,
              overlapEnd: overlap?.end || event1.end
            })
            
            // Markiere Events als konfliktbehaftet
            event1.hasConflict = true
            event1.conflictReason = conflictType === 'work_during_absence' 
              ? 'Einsatz während Abwesenheit' 
              : 'Doppelbelegung'
            event2.hasConflict = true
            event2.conflictReason = event1.conflictReason
          }
        }
      }
    }
  }
  
  return conflicts
}

/**
 * GET /api/plantafel/assignments
 * 
 * Query-Parameter:
 * - from: ISO-Datum (Pflicht)
 * - to: ISO-Datum (Pflicht)
 * - view: 'team' | 'project' (Default: 'team')
 * - employeeIds: Komma-getrennte IDs (Optional)
 * - projectIds: Komma-getrennte IDs (Optional)
 * - showAbsences: 'true' | 'false' (Default: 'true')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const view = (searchParams.get('view') || 'team') as PlantafelView
    const employeeIdsParam = searchParams.get('employeeIds')
    const projectIdsParam = searchParams.get('projectIds')
    const showAbsences = searchParams.get('showAbsences') !== 'false'
    
    // Validierung
    if (!from || !to) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Parameter "from" und "to" sind erforderlich' },
        { status: 400 }
      )
    }
    
    const fromDate = new Date(from)
    const toDate = new Date(to)
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültiges Datumsformat' },
        { status: 400 }
      )
    }
    
    // Parse Filter-IDs
    const employeeIds = employeeIdsParam 
      ? employeeIdsParam.split(',').filter(Boolean) 
      : []
    const projectIds = projectIdsParam 
      ? projectIdsParam.split(',').filter(Boolean) 
      : []
    
    const db = await getDatabase()
    
    // Lade Einsätze
    const einsatzQuery: any = {
      $or: [
        { von: { $lte: toDate }, bis: { $gte: fromDate } }
      ]
    }
    
    if (employeeIds.length > 0) {
      einsatzQuery.mitarbeiterId = { $in: employeeIds }
    }
    if (projectIds.length > 0) {
      einsatzQuery.projektId = { $in: projectIds }
    }
    
    const einsaetze = await db.collection<Einsatz>('einsatz')
      .find(einsatzQuery)
      .toArray()
    
    // Lade Urlaube (falls gewünscht)
    let urlaube: Urlaub[] = []
    if (showAbsences) {
      // Erst mal ALLE Urlaube laden um zu sehen was in der DB ist
      const alleUrlaube = await db.collection<Urlaub>('urlaub')
        .find({})
        .limit(5)
        .toArray()
      
      console.log(`[Plantafel DEBUG] Erste 5 Urlaube aus DB:`, 
        alleUrlaube.map(u => ({
          _id: u._id,
          mitarbeiterId: u.mitarbeiterId,
          mitarbeiterName: u.mitarbeiterName,
          von: u.von,
          bis: u.bis,
          typ: u.typ,
          status: u.status,
          vonType: typeof u.von,
          bisType: typeof u.bis
        }))
      )
      
      // Query für alle genehmigten Abwesenheiten (alle Typen)
      // Akzeptiere verschiedene Schreibweisen des Status
      // WICHTIG: Daten können als String oder Date gespeichert sein
      const fromStr = format(fromDate, 'yyyy-MM-dd')
      const toStr = format(toDate, 'yyyy-MM-dd')
      
      const urlaubQuery: any = {
        status: { $in: ['genehmigt', 'Genehmigt', 'GENEHMIGT'] },
        $or: [
          // Date-Objekte
          { von: { $lte: toDate }, bis: { $gte: fromDate } },
          // String-Format (YYYY-MM-DD)
          { von: { $lte: toStr }, bis: { $gte: fromStr } }
        ]
      }
      
      if (employeeIds.length > 0) {
        urlaubQuery.mitarbeiterId = { $in: employeeIds }
      }
      
      console.log(`[Plantafel] Suche Urlaube mit Query:`, {
        fromStr,
        toStr,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString()
      })
      
      const urlaubeRaw = await db.collection<Urlaub>('urlaub')
        .find(urlaubQuery)
        .toArray()
      
      console.log(`[Plantafel] Gefundene Urlaube mit Status 'genehmigt': ${urlaubeRaw.length}`, {
        query: urlaubQuery,
        zeitraum: `${fromDate.toISOString()} - ${toDate.toISOString()}`
      })
      
      // Lade Mitarbeiternamen für Urlaube, falls nicht vorhanden
      urlaube = await Promise.all(
        urlaubeRaw.map(async (u) => {
          let mitarbeiterName = u.mitarbeiterName
          
          if (!mitarbeiterName && u.mitarbeiterId) {
            try {
              // Versuche mit ObjectId
              const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
                .findOne({ _id: new ObjectId(u.mitarbeiterId) })
              
              if (mitarbeiter) {
                mitarbeiterName = `${mitarbeiter.vorname} ${mitarbeiter.nachname}`
              }
            } catch (error) {
              // Falls ObjectId fehlschlägt, versuche als String
              const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
                .findOne({ _id: u.mitarbeiterId } as any)
              
              if (mitarbeiter) {
                mitarbeiterName = `${mitarbeiter.vorname} ${mitarbeiter.nachname}`
              }
            }
          }
          
          return {
            ...u,
            mitarbeiterName: mitarbeiterName || 'Unbekannt',
            _id: u._id?.toString()
          }
        })
      )
      
      console.log(`[Plantafel] Urlaube mit Namen: ${urlaube.length}`, 
        urlaube.map(u => ({ name: u.mitarbeiterName, typ: u.typ, von: u.von, bis: u.bis }))
      )
    }
    
    // Lade ALLE Projekte für Adressinformationen (unabhängig von View)
    const alleProjektIds = [...new Set(einsaetze.map(e => e.projektId).filter(Boolean))]
    const projektMap = new Map<string, Projekt>()
    
    if (alleProjektIds.length > 0) {
      const projekteDocs = await db.collection<Projekt>('projekte')
        .find({ 
          _id: { $in: alleProjektIds.map(id => {
            try { return new ObjectId(id as string) } catch { return id }
          })}
        })
        .toArray()
      
      projekteDocs.forEach(p => {
        projektMap.set(p._id?.toString() || '', p)
      })
    }
    
    // Lade Ressourcen basierend auf View
    let resources: PlantafelResource[] = []
    
    if (view === 'team') {
      const mitarbeiterQuery: any = { aktiv: true }
      if (employeeIds.length > 0) {
        mitarbeiterQuery._id = { $in: employeeIds.map(id => {
          try { return new ObjectId(id) } catch { return id }
        })}
      }
      
      const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
        .find(mitarbeiterQuery)
        .sort({ nachname: 1, vorname: 1 })
        .toArray()
      
      resources = mitarbeiter.map(m => ({
        ...mapMitarbeiterToResource(m),
        resourceId: m._id?.toString() || ''
      }))
    } else {
      const projektQuery: any = { 
        status: { $in: ['in_planung', 'aktiv'] }
      }
      if (projectIds.length > 0) {
        projektQuery._id = { $in: projectIds.map(id => {
          try { return new ObjectId(id) } catch { return id }
        })}
      }
      
      const projekte = await db.collection<Projekt>('projekte')
        .find(projektQuery)
        .sort({ projektname: 1 })
        .toArray()
      
      resources = projekte.map(p => ({
        ...mapProjektToResource(p),
        resourceId: p._id?.toString() || ''
      }))
    }
    
    // Mappe Events - mapEinsatzToEvents gibt Array zurück (Aufbau + Abbau separat)
    // Erweitere Events mit Projekt-Adressinformationen
    const einsatzEvents = einsaetze.flatMap(e => {
      const events = mapEinsatzToEvents({
        ...e,
        _id: e._id?.toString()
      }, view)
      
      // Füge Projekt-Adressinformationen hinzu
      const projekt = projektMap.get(e.projektId || '')
      if (projekt?.bauvorhaben) {
        return events.map(event => ({
          ...event,
          projektAdresse: projekt.bauvorhaben?.adresse,
          projektPlz: projekt.bauvorhaben?.plz,
          projektOrt: projekt.bauvorhaben?.ort
        }))
      }
      return events
    })
    
    const urlaubEvents = urlaube.map(u => {
      const event = mapUrlaubToEvent({
        ...u,
        _id: u._id?.toString()
      })
      return {
        ...event,
        resourceId: u.mitarbeiterId
      }
    })
    
    console.log(`[Plantafel] Urlaub Events erstellt: ${urlaubEvents.length}`, 
      urlaubEvents.map(e => ({ id: e.id, title: e.title, resourceId: e.resourceId }))
    )
    
    let events: PlantafelEvent[] = [...einsatzEvents, ...urlaubEvents]
    
    // FILTER: Zeige nur Events, die zu den geladenen Resources gehören
    const resourceIds = new Set(resources.map(r => r.resourceId))
    
    if (view === 'team') {
      // Im Team-View: Nur Events mit Mitarbeitern aus den Resources zeigen
      events = events.filter(event => {
        // Urlaub-Events haben mitarbeiterId als resourceId
        if (event.sourceType === 'urlaub') {
          return resourceIds.has(event.resourceId || '')
        }
        // Einsatz-Events: Prüfe mitarbeiterId
        return event.mitarbeiterId && resourceIds.has(event.mitarbeiterId)
      })
      console.log(`[Plantafel] Team-View: ${events.length} Events nach Resource-Filter`)
    } else {
      // Im Projekt-View: Nur Events mit Projekten aus den Resources zeigen
      events = events.filter(event => {
        // Urlaub-Events nicht im Projekt-View anzeigen
        if (event.sourceType === 'urlaub') {
          return false
        }
        // Einsatz-Events: Prüfe projektId
        return event.projektId && resourceIds.has(event.projektId)
      })
      console.log(`[Plantafel] Projekt-View: ${events.length} Events nach Resource-Filter`)
    }
    
    // GRUPPIERUNG: Im Projekt-View Events nach Projekt+Datum+Typ gruppieren
    // Sammle alle Mitarbeiter für jedes Projekt/Datum
    if (view === 'project') {
      const grouped = new Map<string, PlantafelEvent & { allMitarbeiterIds: string[], allMitarbeiterNames: string[], sourceIds: string[] }>()
      
      events.forEach(event => {
        // Nur Einsatz-Events gruppieren (keine Urlaube)
        if (event.sourceType !== 'einsatz') {
          grouped.set(event.id, { 
            ...event, 
            allMitarbeiterIds: [], 
            allMitarbeiterNames: [],
            sourceIds: [event.sourceId]
          })
          return
        }
        
        // Gruppierungs-Schlüssel: projektId + Datum + Typ (Aufbau/Abbau)
        const dateStr = format(event.start, 'yyyy-MM-dd')
        const typ = event.id.includes('-setup') ? 'setup' : event.id.includes('-dismantle') ? 'dismantle' : 'default'
        const groupKey = `${event.projektId}-${dateStr}-${typ}`
        
        const existing = grouped.get(groupKey)
        
        if (existing) {
          // Füge Mitarbeiter zur Gruppe hinzu (wenn noch nicht vorhanden)
          if (event.mitarbeiterId && !existing.allMitarbeiterIds.includes(event.mitarbeiterId)) {
            existing.allMitarbeiterIds.push(event.mitarbeiterId)
            existing.allMitarbeiterNames.push(event.mitarbeiterName || 'Nicht zugewiesen')
          }
          // Speichere auch die sourceId für spätere Updates
          if (event.sourceId && !existing.sourceIds.includes(event.sourceId)) {
            existing.sourceIds.push(event.sourceId)
          }
        } else {
          // Erstes Event dieser Gruppe - speichern
          const allMitarbeiterIds = event.mitarbeiterId ? [event.mitarbeiterId] : []
          const allMitarbeiterNames = event.mitarbeiterName ? [event.mitarbeiterName] : ['Nicht zugewiesen']
          
          grouped.set(groupKey, {
            ...event,
            id: groupKey, // Neue eindeutige ID für die Gruppe
            allMitarbeiterIds,
            allMitarbeiterNames,
            sourceIds: [event.sourceId]
          })
        }
      })
      
      // Aktualisiere Titel mit Mitarbeiter-Anzahl
      events = Array.from(grouped.values()).map(event => {
        if (event.sourceType !== 'einsatz' || event.allMitarbeiterNames.length <= 1) {
          return event
        }
        
        // Mehrere Mitarbeiter: Zeige Anzahl im Titel
        const typeLabel = event.id.includes('setup') ? ' (Aufbau)' : event.id.includes('dismantle') ? ' (Abbau)' : ''
        const countLabel = `${event.allMitarbeiterNames.length} Mitarbeiter`
        
        return {
          ...event,
          title: `${event.projektName}${typeLabel} - ${countLabel}`
        }
      })
      
      console.log(`[Plantafel] Nach Gruppierung (Projekt-View): ${events.length} Events (von ${einsatzEvents.length + urlaubEvents.length})`)
    }
    
    console.log(`[Plantafel] Gesamt Events: ${events.length} (Einsätze: ${einsatzEvents.length}, Urlaube: ${urlaubEvents.length})`)
    
    // Berechne Konflikte
    const conflicts = calculateConflicts(events)
    
    return NextResponse.json({
      erfolg: true,
      events,
      resources,
      conflicts,
      meta: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        totalEvents: events.length,
        totalEinsaetze: einsatzEvents.length,
        totalUrlaube: urlaubEvents.length,
        totalConflicts: conflicts.length
      }
    })
    
  } catch (error) {
    console.error('Fehler beim Laden der Plantafel-Daten:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Plantafel-Daten' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/plantafel/assignments
 * 
 * Erstellt einen neuen Einsatz
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Debug-Logging
    console.log('[POST /api/plantafel/assignments] Received body:', {
      projektId: body.projektId,
      mitarbeiterId: body.mitarbeiterId,
      von: body.von,
      bis: body.bis,
      setupDate: body.setupDate,
      dismantleDate: body.dismantleDate
    })
    
    const { 
      mitarbeiterId, 
      projektId, 
      von, 
      bis, 
      rolle, 
      geplantStunden, 
      notizen, 
      bestaetigt,
      // NEU: Simplified date-only Felder
      setupDate,
      dismantleDate,
      // LEGACY: Aufbau/Abbau-Planung (Datum + Stunden)
      aufbauVon,
      aufbauBis,
      stundenAufbau,
      abbauVon,
      abbauBis,
      stundenAbbau
    } = body
    
    // Validierung - nur Projekt, von und bis sind Pflichtfelder
    if (!projektId) {
      console.error('[POST /api/plantafel/assignments] Validierungsfehler: projektId fehlt!')
      return NextResponse.json(
        { erfolg: false, fehler: 'projektId ist erforderlich' },
        { status: 400 }
      )
    }
    
    if (!von) {
      return NextResponse.json(
        { erfolg: false, fehler: 'von ist erforderlich' },
        { status: 400 }
      )
    }
    
    if (!bis) {
      return NextResponse.json(
        { erfolg: false, fehler: 'bis ist erforderlich' },
        { status: 400 }
      )
    }
    
    const vonDate = new Date(von)
    const bisDate = new Date(bis)
    
    if (isNaN(vonDate.getTime()) || isNaN(bisDate.getTime())) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültiges Datumsformat' },
        { status: 400 }
      )
    }
    
    // Für eintägige Events: von darf gleich bis sein (unterschiedliche Uhrzeiten)
    if (vonDate > bisDate) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Startdatum muss vor oder gleich Enddatum sein' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    
    // Lade Mitarbeiter- und Projekt-Namen (Mitarbeiter ist optional)
    let mitarbeiter = null
    let mitarbeiterName = ''
    
    if (mitarbeiterId) {
      mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
        .findOne({ _id: new ObjectId(mitarbeiterId) })
      
      if (!mitarbeiter) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
          { status: 404 }
        )
      }
      mitarbeiterName = `${mitarbeiter.vorname} ${mitarbeiter.nachname}`
    }
    
    const projekt = await db.collection<Projekt>('projekte')
      .findOne({ _id: new ObjectId(projektId) })
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Erstelle Einsatz
    const neuerEinsatz: Omit<Einsatz, '_id'> = {
      mitarbeiterId: mitarbeiterId || undefined,
      mitarbeiterName: mitarbeiterName || 'Nicht zugewiesen',
      projektId,
      projektName: projekt.projektname,
      von: vonDate,
      bis: bisDate,
      rolle: rolle || undefined,
      geplantStunden: geplantStunden || undefined,
      notizen: notizen || undefined,
      bestaetigt: bestaetigt || false,
      // NEU: Simplified date-only Felder
      setupDate: setupDate || undefined,
      dismantleDate: dismantleDate || undefined,
      // LEGACY: Aufbau/Abbau-Planung (Datum + Stunden)
      aufbauVon: aufbauVon ? new Date(aufbauVon) : undefined,
      aufbauBis: aufbauBis ? new Date(aufbauBis) : undefined,
      stundenAufbau: stundenAufbau || undefined,
      abbauVon: abbauVon ? new Date(abbauVon) : undefined,
      abbauBis: abbauBis ? new Date(abbauBis) : undefined,
      stundenAbbau: stundenAbbau || undefined,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await db.collection<Einsatz>('einsatz')
      .insertOne(neuerEinsatz as any)
    
    // NEU: Sync zu Zeiterfassung wenn bestätigt
    const erstellterEinsatz: Einsatz = {
      ...neuerEinsatz,
      _id: result.insertedId.toString()
    }
    
    let syncResult = { created: 0, deleted: 0 }
    if (erstellterEinsatz.bestaetigt) {
      syncResult = await syncEinsatzToZeiterfassung(erstellterEinsatz, db)
    }
    
    return NextResponse.json({
      erfolg: true,
      einsatz: erstellterEinsatz,
      zeiterfassungSync: syncResult
    }, { status: 201 })
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Einsatzes:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen des Einsatzes' },
      { status: 500 }
    )
  }
}
