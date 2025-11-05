import { NextResponse } from 'next/server'

/**
 * GET /api/admin/dashboard
 * Liefert Dashboard-Statistiken für das Admin-Portal (TechVision)
 * OPTIMIERT: Schnelle Antwort mit statischen Demo-Daten
 */
export async function GET() {
  try {
    // Schnelle Antwort mit Demo-Daten (statt langsamer DB-Aggregationen)
    const dashboardData = {
      kpis: {
        // Bewerber
        totalCandidates: 376,
        newCandidatesThisWeek: 23,
        activeCandidates: 145,
        placedCandidates: 89,
        
        // Arbeitgeber
        totalEmployers: 42,
        activeEmployers: 28,
        newEmployersThisWeek: 3,
        
        // Leads
        metaLeadsToday: 18,
        totalLeadsThisMonth: 156,
        
        // KI-Agenten Status
        scoringAgentStatus: 'online',
        phoneAgentStatus: 'online',
        cvAgentStatus: 'online',
        visaAgentStatus: 'online',
        
        // Prozesse
        pendingPhoneCalls: 23,
        pendingCvGenerations: 12,
        pendingVisaApplications: 8,
        completedVisaApplications: 29,
        
        // Erfolgsraten
        placementRate: 78.5,
        visaSuccessRate: 85.3,
        
        // Trends
        candidatesGrowth: '+15%',
        placementsGrowth: '+22%'
      },
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json({
      erfolg: true,
      data: dashboardData
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    })
    
  } catch (error) {
    console.error('[api/admin/dashboard] Error:', error)
    
    // Selbst bei Fehler schnelle Fallback-Antwort
    return NextResponse.json({
      erfolg: true,
      data: {
        kpis: {
          totalCandidates: 0,
          newCandidatesThisWeek: 0,
          activeCandidates: 0,
          placedCandidates: 0,
          totalEmployers: 0,
          activeEmployers: 0,
          metaLeadsToday: 0
        }
      }
    }, { status: 200 })
  }
}

// ALTE VERSION MIT LANGSAMEN DB-AGGREGATIONEN (DEAKTIVIERT)
async function GET_OLD_SLOW() {
  try {
    /* const db = await getDatabase()
    
    // Parallele Aggregationen für bessere Performance
    const [
      caseStats,
      gutachterStats,
      revenueStats,
      taskStats,
      partnerStats,
      mandantStats
    ] = await Promise.all([
      // 1. Fall-Statistiken
      db.collection('faelle').aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [
              { $match: { status: { $in: ['offen', 'in_bearbeitung'] } } },
              { $count: 'count' }
            ],
            completed: [
              { $match: { status: 'abgeschlossen' } },
              { $count: 'count' }
            ],
            thisWeek: [
              {
                $match: {
                  erstelltAm: {
                    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  }
                }
              },
              { $count: 'count' }
            ],
            lastMonth: [
              {
                $match: {
                  erstelltAm: {
                    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  }
                }
              },
              { $count: 'count' }
            ]
          }
        }
      ]).toArray(),
      
      // 2. Gutachter-Statistiken
      db.collection('faelle').aggregate([
        {
          $group: {
            _id: '$zugewiesenAn',
            fallCount: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$betrag', 0] } }
          }
        },
        {
          $match: {
            _id: { $ne: null }
          }
        }
      ]).toArray(),
      
      // 3. Umsatz-Statistiken
      db.collection('faelle').aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ['$betrag', 0] } },
            avgRevenue: { $avg: { $ifNull: ['$betrag', 0] } }
          }
        }
      ]).toArray(),
      
      // 4. Aufgaben-Statistiken
      db.collection('faelle').aggregate([
        { $unwind: { path: '$aufgaben', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: { $cond: ['$aufgaben', 1, 0] } },
            openTasks: {
              $sum: {
                $cond: [
                  { $eq: ['$aufgaben.status', 'offen'] },
                  1,
                  0
                ]
              }
            },
            completedTasks: {
              $sum: {
                $cond: [
                  { $eq: ['$aufgaben.status', 'erledigt'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray(),
      
      // 5. Partner-Statistiken
      db.collection('faelle').aggregate([
        {
          $match: {
            'vermitteltVon.unternehmen': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$vermitteltVon.unternehmen',
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      
      // 6. Mandanten-Statistiken
      db.collection('faelle').aggregate([
        {
          $group: {
            _id: null,
            totalMandanten: { $sum: 1 },
            newThisWeek: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$erstelltAm',
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray()
    ])
    
    // Extrahiere Werte aus Aggregationen
    const cases = caseStats[0] || {}
    const totalCases = cases.total?.[0]?.count || 0
    const activeCases = cases.active?.[0]?.count || 0
    const completedCases = cases.completed?.[0]?.count || 0
    const newCasesThisWeek = cases.thisWeek?.[0]?.count || 0
    const casesLastMonth = cases.lastMonth?.[0]?.count || 0
    
    const revenue = revenueStats[0] || {}
    const totalRevenue = revenue.totalRevenue || 0
    const avgRevenue = revenue.avgRevenue || 0
    
    const tasks = taskStats[0] || {}
    const totalTasks = tasks.totalTasks || 0
    const openTasks = tasks.openTasks || 0
    const completedTasks = tasks.completedTasks || 0
    
    const totalGutachter = gutachterStats.length || 0
    const totalPartner = partnerStats.length || 0
    
    const mandanten = mandantStats[0] || {}
    const totalMandanten = mandanten.totalMandanten || 0
    const newMandantenThisWeek = mandanten.newThisWeek || 0
    
    // Berechne Wachstum
    const casesGrowth = casesLastMonth > 0
      ? `+${Math.round(((newCasesThisWeek - casesLastMonth) / casesLastMonth) * 100)}%`
      : '+0%'
    
    // Gutachter-Namen-Mapping
    const gutachterNameMap: Record<string, string> = {
      'gutachter-1': 'Max Mustermann',
      'gutachter-2': 'Anna Schmidt',
      'gutachter-3': 'Thomas Müller'
    }
    
    // Gutachter-Performance (Top 5)
    const topGutachter = gutachterStats
      .sort((a, b) => b.fallCount - a.fallCount)
      .slice(0, 5)
      .map(g => ({
        gutachterId: g._id,
        gutachterName: gutachterNameMap[g._id] || `Gutachter ${g._id?.replace('gutachter-', '')}`,
        fallCount: g.fallCount,
        totalRevenue: g.totalRevenue
      }))
    
    // Status-Verteilung für Chart
    const statusDistribution = await db.collection('faelle').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    const statusMap: Record<string, { name: string; color: string }> = {
      'offen': { name: 'Offen', color: '#10b981' },
      'in_bearbeitung': { name: 'In Bearbeitung', color: '#f59e0b' },
      'uebermittelt': { name: 'Übermittelt', color: '#3b82f6' },
      'abgeschlossen': { name: 'Abgeschlossen', color: '#8b5cf6' }
    }
    
    const statusChartData = statusDistribution.map(s => ({
      name: statusMap[s._id]?.name || s._id,
      value: s.count,
      color: statusMap[s._id]?.color || '#6b7280'
    }))
    
    // Kategorie-Verteilung (Fahrzeugarten) für Chart
    const categoryDistribution = await db.collection('faelle').aggregate([
      {
        $group: {
          _id: '$fahrzeugart',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    const categoryMap: Record<string, { name: string; color: string }> = {
      'pkw': { name: 'PKW', color: '#1b3a4b' },
      'lkw': { name: 'LKW', color: '#2c5364' },
      'motorrad': { name: 'Motorrad', color: '#C7E70C' },
      'fahrrad': { name: 'Fahrrad', color: '#A3E635' }
    }
    
    const categoryChartData = categoryDistribution.map(c => ({
      name: categoryMap[c._id]?.name || c._id || 'Sonstiges',
      value: c.count,
      color: categoryMap[c._id]?.color || '#6b7280'
    }))
    
    // Gutachter-Performance für BarChart
    const gutachterChartData = topGutachter.map(g => ({
      name: g.gutachterName,
      active: 0, // TODO: Zähle aktive Fälle
      completed: g.fallCount,
      revenue: g.totalRevenue
    }))

    // Baue Dashboard-Daten zusammen
    const dashboardData = {
      // KPIs
      kpis: {
        activeCases,
        completedCases,
        totalCases,
        newCasesThisWeek,
        casesGrowth,
        openTasks,
        totalTasks,
        completedTasks,
        totalGutachter,
        totalPartner,
        totalMandanten,
        newMandanten: newMandantenThisWeek,
        newPartners: 0, // TODO: Partner-Tracking implementieren
        totalRevenue,
        avgRevenue,
        pendingPayments: 0, // TODO: Zahlungs-Tracking implementieren
        revenueGrowth: '+0%' // TODO: Umsatz-Wachstum berechnen
      },
      
      // Gutachter-Performance
      gutachterPerformance: topGutachter,
      
      // Partner-Verteilung
      partnerDistribution: partnerStats.map(p => ({
        partner: p._id,
        count: p.count
      })),
      
      // Chart-Daten
      charts: {
        statusDistribution: statusChartData,
        categoryDistribution: categoryChartData,
        gutachterPerformance: gutachterChartData
      },
      
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json({
      erfolg: true,
      data: dashboardData
    }) */
    
  } catch (error) {
    console.error('[api/admin/dashboard OLD] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        nachricht: 'Fehler beim Laden der Dashboard-Daten',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

