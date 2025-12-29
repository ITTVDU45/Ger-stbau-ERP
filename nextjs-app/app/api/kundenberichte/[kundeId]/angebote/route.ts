import { NextResponse, NextRequest } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ZeitraumFilter } from '@/lib/db/types'
import { subDays, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subMonths, subQuarters } from 'date-fns'

function getDateRangeFromFilter(filter: ZeitraumFilter): { von: Date; bis: Date } {
  const now = new Date()
  
  switch (filter.typ) {
    case 'letzte_30_tage':
      return { von: subDays(now, 30), bis: now }
    case 'letzte_90_tage':
      return { von: subDays(now, 90), bis: now }
    case 'letztes_jahr':
      return { von: subDays(now, 365), bis: now }
    case 'aktuelles_jahr':
      return { von: startOfYear(now), bis: endOfYear(now) }
    case 'aktuelles_quartal':
      return { von: startOfQuarter(now), bis: endOfQuarter(now) }
    case 'vorjahr':
      const lastYear = subMonths(now, 12)
      return { von: startOfYear(lastYear), bis: endOfYear(lastYear) }
    case 'letztes_quartal':
      const lastQuarter = subQuarters(now, 1)
      return { von: startOfQuarter(lastQuarter), bis: endOfQuarter(lastQuarter) }
    case 'benutzerdefiniert':
      if (!filter.von || !filter.bis) {
        throw new Error('Benutzerdefinierter Zeitraum erfordert von und bis Datum')
      }
      return { von: new Date(filter.von), bis: new Date(filter.bis) }
    default:
      return { von: subDays(now, 30), bis: now }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kundeId: string }> }
) {
  try {
    const { kundeId } = await params
    const { searchParams } = new URL(request.url)
    
    const filterTyp = searchParams.get('filterTyp') || 'letzte_30_tage'
    const vonParam = searchParams.get('von')
    const bisParam = searchParams.get('bis')
    
    const zeitraumFilter: ZeitraumFilter = {
      typ: filterTyp as any,
      von: vonParam ? new Date(vonParam) : undefined,
      bis: bisParam ? new Date(bisParam) : undefined
    }
    
    const { von, bis } = getDateRangeFromFilter(zeitraumFilter)
    
    const db = await getDatabase()
    
    const angebote = await db.collection('angebote')
      .find({
        kundeId,
        erstelltAm: { $gte: von, $lte: bis }
      })
      .sort({ erstelltAm: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, angebote })
  } catch (error) {
    console.error('Fehler beim Abrufen der Angebote:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Angebote' },
      { status: 500 }
    )
  }
}

