/**
 * API Route: /api/plantafel/conflicts
 * 
 * GET: Berechnet alle Konflikte für einen Zeitraum
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Einsatz, Urlaub } from '@/lib/db/types'
import {
  PlantafelEvent,
  ConflictInfo,
  mapEinsatzToEvents,
  mapUrlaubToEvent,
  checkOverlap,
  getOverlapPeriod
} from '@/components/plantafel/types'

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
          }
        }
      }
    }
  }
  
  return conflicts
}

/**
 * GET /api/plantafel/conflicts
 * 
 * Query-Parameter:
 * - from: ISO-Datum (Pflicht)
 * - to: ISO-Datum (Pflicht)
 * - employeeId: Optional, nur Konflikte für diesen Mitarbeiter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const employeeId = searchParams.get('employeeId')
    
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
    
    const db = await getDatabase()
    
    // Lade Einsätze
    const einsatzQuery: any = {
      $or: [
        { von: { $lte: toDate }, bis: { $gte: fromDate } }
      ]
    }
    
    if (employeeId) {
      einsatzQuery.mitarbeiterId = employeeId
    }
    
    const einsaetze = await db.collection<Einsatz>('einsatz')
      .find(einsatzQuery)
      .toArray()
    
    // Lade genehmigte Urlaube
    const urlaubQuery: any = {
      status: 'genehmigt',
      $or: [
        { von: { $lte: toDate }, bis: { $gte: fromDate } }
      ]
    }
    
    if (employeeId) {
      urlaubQuery.mitarbeiterId = employeeId
    }
    
    const urlaube = await db.collection<Urlaub>('urlaub')
      .find(urlaubQuery)
      .toArray()
    
    // Mappe zu Events - mapEinsatzToEvents gibt Array zurück
    const einsatzEvents = einsaetze.flatMap(e => 
      mapEinsatzToEvents({
        ...e,
        _id: e._id?.toString()
      }, 'team')
    )
    
    const urlaubEvents = urlaube.map(u => ({
      ...mapUrlaubToEvent({
        ...u,
        _id: u._id?.toString()
      }),
      resourceId: u.mitarbeiterId
    }))
    
    const events: PlantafelEvent[] = [...einsatzEvents, ...urlaubEvents]
    
    // Berechne Konflikte
    const conflicts = calculateConflicts(events)
    
    // Sortiere nach Schweregrad und Datum
    conflicts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'error' ? -1 : 1
      }
      return a.overlapStart.getTime() - b.overlapStart.getTime()
    })
    
    return NextResponse.json({
      erfolg: true,
      conflicts,
      meta: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        totalConflicts: conflicts.length,
        errorCount: conflicts.filter(c => c.severity === 'error').length,
        warningCount: conflicts.filter(c => c.severity === 'warning').length
      }
    })
    
  } catch (error) {
    console.error('Fehler beim Berechnen der Konflikte:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Berechnen der Konflikte' },
      { status: 500 }
    )
  }
}
