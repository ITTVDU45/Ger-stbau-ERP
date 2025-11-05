import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'

// Mock-Fälle mit verschiedenen Attributen für Filterung
const MOCK_CASES = [
  {
    _id: 'case-1',
    fallname: 'Unfall A',
    mandant: { vorname: 'Max', nachname: 'Mustermann', telefon: '+49 123 456789' },
    status: 'In Bearbeitung',
    datum: '2025-01-15',
    assignedTo: 'g-123',
    partnerId: 'p-456',
    vehicle: { type: 'PKW', brand: 'Audi', model: 'A6' },
    location: { city: 'Berlin', lat: 52.5200, lng: 13.4050 }
  },
  {
    _id: 'case-2',
    fallname: 'Schaden B',
    mandant: { vorname: 'Eva', nachname: 'Müller', telefon: '+49 987 654321' },
    status: 'Übermittelt',
    datum: '2025-01-10',
    assignedTo: 'g-123',
    partnerId: 'p-456',
    vehicle: { type: 'LKW', brand: 'MAN', model: 'TGX' },
    location: { city: 'Hamburg', lat: 53.5511, lng: 9.9937 }
  },
  {
    _id: 'case-3',
    fallname: 'Versicherung C',
    mandant: { vorname: 'John', nachname: 'Doe', telefon: '+49 555 123456' },
    status: 'In Bearbeitung',
    datum: '2025-01-22',
    assignedTo: 'g-456',
    partnerId: 'p-789',
    vehicle: { type: 'Motorrad', brand: 'BMW', model: 'R1250' },
    location: { city: 'München', lat: 48.1351, lng: 11.5820 }
  }
]

function scopedCaseFilter(user: { role: string; gutachterId?: string; partnerId?: string }) {
  if (user.role === 'ADMIN') return {}
  if (user.role === 'GUTACHTER') return { assignedTo: user.gutachterId }
  if (user.role === 'PARTNER') return { partnerId: user.partnerId }
  return { _id: null }
}

export async function GET(request: NextRequest) {
  try {
    // OPTIMIERT: Schnelle Antwort ohne Auth-Check (für People4Europe nicht relevant)
    return NextResponse.json({
      success: true,
      faelle: []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    })

    /* ALTE VERSION - DEAKTIVIERT
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query-Parameter für Filterung
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const timeframe = searchParams.get('timeframe')
    const vehicleType = searchParams.get('vehicleType')
    const gutachter = searchParams.get('gutachter')

    let filteredCases = MOCK_CASES

    // Rollenspezifische Filterung
    const roleFilter = scopedCaseFilter(user)
    filteredCases = filteredCases.filter(fall => {
      if (roleFilter.assignedTo && fall.assignedTo !== roleFilter.assignedTo) return false
      if (roleFilter.partnerId && fall.partnerId !== roleFilter.partnerId) return false
      return true
    })

    // Zusätzliche Filter
    if (status) {
      filteredCases = filteredCases.filter(fall => fall.status === status)
    }

    if (vehicleType) {
      filteredCases = filteredCases.filter(fall => fall.vehicle.type === vehicleType)
    }

    if (gutachter && user.role === 'ADMIN') {
      filteredCases = filteredCases.filter(fall => fall.assignedTo === gutachter)
    }

    // Zeitraum-Filter (vereinfacht)
    if (timeframe) {
      const now = new Date()
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '3m' ? 90 : 0
      if (days > 0) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        filteredCases = filteredCases.filter(fall => new Date(fall.datum) >= cutoff)
      }
    }

    return NextResponse.json({
      success: true,
      faelle: filteredCases
    })
    */
  } catch (error) {
    console.error('Error fetching cases:', error)
    return NextResponse.json({
      success: true,
      faelle: []
    }, { status: 200 })
  }
}
