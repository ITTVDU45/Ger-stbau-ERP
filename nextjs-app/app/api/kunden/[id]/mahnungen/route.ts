import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Mahnung } from '@/lib/db/types'
import { startOfDay, endOfDay, subDays, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subYears, subQuarters } from 'date-fns'

// GET - Alle Mahnungen eines Kunden (mit optionalem Zeitraumfilter)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const zeitraumTyp = searchParams.get('zeitraumTyp')
    const von = searchParams.get('von')
    const bis = searchParams.get('bis')

    const db = await getDatabase()
    const mahnungenCollection = db.collection<Mahnung>('mahnungen')

    // Build filter
    const filter: any = { kundeId: id }

    // Add date filter if zeitraum is specified
    if (zeitraumTyp) {
      const { vonDate, bisDate } = berechneDateumBereich(zeitraumTyp as any, von, bis)
      filter.datum = { $gte: vonDate, $lte: bisDate }
    }

    const mahnungen = await mahnungenCollection
      .find(filter)
      .sort({ datum: -1 })
      .toArray()

    return NextResponse.json({ erfolg: true, mahnungen })
  } catch (error) {
    console.error('Fehler beim Abrufen der Mahnungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Mahnungen' },
      { status: 500 }
    )
  }
}

function berechneDateumBereich(
  typ: string,
  vonParam?: string | null,
  bisParam?: string | null
): { vonDate: Date; bisDate: Date } {
  const now = new Date()

  if (typ === 'benutzerdefiniert' && vonParam && bisParam) {
    return {
      vonDate: startOfDay(new Date(vonParam)),
      bisDate: endOfDay(new Date(bisParam))
    }
  }

  switch (typ) {
    case 'letzte_30_tage':
      return {
        vonDate: startOfDay(subDays(now, 30)),
        bisDate: endOfDay(now)
      }
    case 'letzte_90_tage':
      return {
        vonDate: startOfDay(subDays(now, 90)),
        bisDate: endOfDay(now)
      }
    case 'letztes_jahr':
      return {
        vonDate: startOfDay(subDays(now, 365)),
        bisDate: endOfDay(now)
      }
    case 'aktuelles_jahr':
      return {
        vonDate: startOfYear(now),
        bisDate: endOfYear(now)
      }
    case 'aktuelles_quartal':
      return {
        vonDate: startOfQuarter(now),
        bisDate: endOfQuarter(now)
      }
    case 'vorjahr':
      const letzesJahr = subYears(now, 1)
      return {
        vonDate: startOfYear(letzesJahr),
        bisDate: endOfYear(letzesJahr)
      }
    case 'letztes_quartal':
      const letztesQuartal = subQuarters(now, 1)
      return {
        vonDate: startOfQuarter(letztesQuartal),
        bisDate: endOfQuarter(letztesQuartal)
      }
    default:
      return {
        vonDate: startOfYear(now),
        bisDate: endOfYear(now)
      }
  }
}

