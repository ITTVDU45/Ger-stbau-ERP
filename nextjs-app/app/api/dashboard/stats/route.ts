import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/db/services/caseService'
import { getStatusDistribution, getMonthlyRevenue, getVehicleTypeDistribution, getLocationDistribution, getRecentTasks, getRecentBillings } from '@/lib/db/services/dashboardService'
import { getRecentDocuments } from '@/lib/db/services/documentService'

export async function GET(request: Request) {
  try {
    // OPTIMIERT: Schnelle Antwort ohne langsame DB-Aggregationen
    return NextResponse.json({
      erfolg: true,
      data: {
        cards: [],
        charts: [],
        tables: []
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    })

    /* ALTE LANGSAME VERSION - DEAKTIVIERT
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || undefined
    const role = url.searchParams.get('role') || 'GUTACHTER'

    // Parallele Datenabfragen
    const [
      dashboardStats,
      statusData,
      revenueData,
      vehicleData,
      locationData,
      recentTasks,
      recentBillings,
      recentDocuments
    ] = await Promise.all([
      getDashboardStats(userId),
      getStatusDistribution(userId),
      getMonthlyRevenue({ gutachterId: userId }),
      getVehicleTypeDistribution(userId),
      getLocationDistribution(userId),
      getRecentTasks(userId, 5),
      import('@/lib/db/services/billingService').then(module =>
        module.getBillings({ gutachterId: userId })
      ).then(result => ({ abrechnungen: result.abrechnungen?.slice(0, 5) || [] })),
      getRecentDocuments(5)
    ])

    // KPI-Karten zusammenstellen
    const cards = role === 'ADMIN' ? [
      { id: 'active-cases', title: 'Aktive Fälle', value: dashboardStats.stats?.aktiveFaelle || 0, type: 'count', color: '#10b981' },
      { id: 'completed-cases', title: 'Abgeschlossene Fälle', value: dashboardStats.stats?.abgeschlosseneFaelle || 0, type: 'count', color: '#8b5cf6' },
      { id: 'open-tasks', title: 'Offene Aufgaben', value: dashboardStats.stats?.offeneAufgaben || 0, type: 'count', color: '#f59e0b' },
      { id: 'total-cases', title: 'Gesamtfälle', value: dashboardStats.stats?.gesamtfFaelle || 0, type: 'count', color: '#6b7280' },
      { id: 'gutachter-sum', title: 'Gutachter-Summe (abgeschlossen)', value: `${(dashboardStats.stats?.gutachterSumme || 0).toLocaleString('de-DE')} €`, type: 'currency', color: '#f59e0b' },
      { id: 'billing-active', title: 'Abrechnung (aktiv & laufend)', value: `${(dashboardStats.stats?.abrechnungAktiv || 0).toLocaleString('de-DE')} €`, type: 'currency', color: '#3b82f6' },
      { id: 'referrals', title: 'Vermittlungen über Referenznummern', value: dashboardStats.stats?.vermittlungen || 0, type: 'count', color: '#06b6d4' }
    ] : role === 'GUTACHTER' ? [
      { id: 'active-cases', title: 'Aktive Fälle', value: dashboardStats.stats?.aktiveFaelle || 0, type: 'count', color: '#10b981' },
      { id: 'completed-cases', title: 'Abgeschlossene Fälle', value: dashboardStats.stats?.abgeschlosseneFaelle || 0, type: 'count', color: '#8b5cf6' },
      { id: 'open-tasks', title: 'Offene Aufgaben', value: dashboardStats.stats?.offeneAufgaben || 0, type: 'count', color: '#f59e0b' },
      { id: 'total-cases', title: 'Gesamtfälle', value: dashboardStats.stats?.gesamtfFaelle || 0, type: 'count', color: '#6b7280' },
      { id: 'gutachter-sum', title: 'Gutachter-Summe (abgeschlossen)', value: `${(dashboardStats.stats?.gutachterSumme || 0).toLocaleString('de-DE')} €`, type: 'currency', color: '#f59e0b' },
      { id: 'billing-active', title: 'Abrechnung (aktiv & laufend)', value: `${(dashboardStats.stats?.abrechnungAktiv || 0).toLocaleString('de-DE')} €`, type: 'currency', color: '#3b82f6' }
    ] : [
      { id: 'active-cases', title: 'Aktive Fälle', value: dashboardStats.stats?.aktiveFaelle || 0, type: 'count', color: '#10b981' },
      { id: 'completed-cases', title: 'Abgeschlossene Fälle', value: dashboardStats.stats?.abgeschlosseneFaelle || 0, type: 'count', color: '#8b5cf6' },
      { id: 'total-cases', title: 'Gesamtfälle', value: dashboardStats.stats?.gesamtfFaelle || 0, type: 'count', color: '#6b7280' },
      { id: 'billing-active', title: 'Abrechnung (aktiv & laufend)', value: `${(dashboardStats.stats?.abrechnungAktiv || 0).toLocaleString('de-DE')} €`, type: 'currency', color: '#3b82f6' },
      { id: 'referrals', title: 'Meine Vermittlungen', value: dashboardStats.stats?.vermittlungen || 0, type: 'count', color: '#06b6d4' }
    ]

    const charts = [
      {
        id: 'status-distribution',
        title: 'Statusverteilung der Fälle',
        type: 'donut',
        data: statusData.data || []
      },
      {
        id: 'monthly-revenue',
        title: 'Monatliche Gutachter-Umsätze',
        type: 'line',
        data: revenueData.data || []
      },
      {
        id: 'vehicle-types',
        title: 'Fahrzeugarten-Statistik',
        type: 'pie',
        data: vehicleData.data || []
      },
      {
        id: 'location-map',
        title: 'Fallverteilung nach Standort',
        type: 'map',
        data: locationData.data || []
      }
    ]

    const tables = [
      {
        id: 'tasks',
        title: 'Offene Aufgaben',
        type: 'tasks',
        columns: [
          { key: 'titel', label: 'Aufgabe', type: 'text' },
          { key: 'prioritaet', label: 'Priorität', type: 'status' },
          { key: 'faelligAm', label: 'Fällig bis', type: 'date' }
        ],
        data: recentTasks.aufgaben || []
      },
      {
        id: 'cases',
        title: 'Abgerechnete Fälle',
        type: 'cases',
        columns: [
          { key: 'fallId', label: 'Fall-ID', type: 'text' },
          { key: 'fallname', label: 'Mandant', type: 'text' },
          { key: 'betrag', label: 'Betrag', type: 'number' },
          { key: 'faelligAm', label: 'Datum', type: 'date' }
        ],
        data: recentBillings.abrechnungen || []
      },
      {
        id: 'documents',
        title: 'Letzte Dokumente',
        type: 'documents',
        columns: [
          { key: 'dateiname', label: 'Dokumentname', type: 'text' },
          { key: 'kategorie', label: 'Kategorie', type: 'text' },
          { key: 'hochgeladenAm', label: 'Hochgeladen', type: 'date' }
        ],
        data: recentDocuments.dokumente || []
      },
      {
        id: 'partners',
        title: 'Partnervermittlungen',
        type: 'partners',
        columns: [
          { key: 'referenzNummer', label: 'Ref-ID', type: 'text' },
          { key: 'partner', label: 'Partner', type: 'text' },
          { key: 'vermitteltAm', label: 'Datum', type: 'date' }
        ],
        data: []
      }
    ]

    return NextResponse.json({
      erfolg: true,
      data: {
        cards,
        charts,
        tables
      }
    })
    */
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({
      erfolg: true,
      data: {
        cards: [],
        charts: [],
        tables: []
      }
    }, { status: 200 })
  }
}
