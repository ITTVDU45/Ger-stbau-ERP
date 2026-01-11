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
import {
  PlantafelEvent,
  PlantafelResource,
  PlantafelView,
  ConflictInfo,
  mapEinsatzToEvent,
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
      const urlaubQuery: any = {
        status: 'genehmigt',
        $or: [
          { von: { $lte: toDate }, bis: { $gte: fromDate } }
        ]
      }
      
      if (employeeIds.length > 0) {
        urlaubQuery.mitarbeiterId = { $in: employeeIds }
      }
      
      urlaube = await db.collection<Urlaub>('urlaub')
        .find(urlaubQuery)
        .toArray()
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
    
    // Mappe Events
    const events: PlantafelEvent[] = [
      ...einsaetze.map(e => ({
        ...mapEinsatzToEvent({
          ...e,
          _id: e._id?.toString()
        }, view),
        resourceId: view === 'team' ? e.mitarbeiterId : e.projektId
      })),
      ...urlaube.map(u => ({
        ...mapUrlaubToEvent({
          ...u,
          _id: u._id?.toString()
        }),
        resourceId: u.mitarbeiterId
      }))
    ]
    
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
    
    const { 
      mitarbeiterId, 
      projektId, 
      von, 
      bis, 
      rolle, 
      geplantStunden, 
      notizen, 
      bestaetigt,
      // Aufbau/Abbau-Planung (Datum + Stunden)
      aufbauVon,
      aufbauBis,
      stundenAufbau,
      abbauVon,
      abbauBis,
      stundenAbbau
    } = body
    
    // Validierung
    if (!mitarbeiterId || !projektId || !von || !bis) {
      return NextResponse.json(
        { erfolg: false, fehler: 'mitarbeiterId, projektId, von und bis sind erforderlich' },
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
    
    if (vonDate >= bisDate) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Startdatum muss vor Enddatum liegen' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    
    // Lade Mitarbeiter- und Projekt-Namen
    const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
      .findOne({ _id: new ObjectId(mitarbeiterId) })
    
    const projekt = await db.collection<Projekt>('projekte')
      .findOne({ _id: new ObjectId(projektId) })
    
    if (!mitarbeiter) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
    
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Erstelle Einsatz
    const neuerEinsatz: Omit<Einsatz, '_id'> = {
      mitarbeiterId,
      mitarbeiterName: `${mitarbeiter.vorname} ${mitarbeiter.nachname}`,
      projektId,
      projektName: projekt.projektname,
      von: vonDate,
      bis: bisDate,
      rolle: rolle || undefined,
      geplantStunden: geplantStunden || undefined,
      notizen: notizen || undefined,
      bestaetigt: bestaetigt || false,
      // Aufbau/Abbau-Planung (Datum + Stunden)
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
