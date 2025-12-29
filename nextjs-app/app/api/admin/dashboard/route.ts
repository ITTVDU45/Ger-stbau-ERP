import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

/**
 * GET /api/admin/dashboard
 * Liefert Dashboard-Statistiken für das Gerüstbau-ERP-System
 * Lädt echte Daten aus der MongoDB
 */
export async function GET() {
  try {
    const db = await getDatabase()
    
    // Aktuelles Datum und Zeitbereiche
    const heute = new Date()
    const ersterTagDieserMonat = new Date(heute.getFullYear(), heute.getMonth(), 1)
    const ersterTagVormonat = new Date(heute.getFullYear(), heute.getMonth() - 1, 1)
    const letzterTagVormonat = new Date(heute.getFullYear(), heute.getMonth(), 0, 23, 59, 59, 999)
    
    // Parallele Aggregationen für bessere Performance
    const [
      projektStats,
      mitarbeiterStats,
      angebotStats,
      rechnungStats,
      zeiterfassungStats
    ] = await Promise.all([
      // 1. Projekt-Statistiken
      db.collection('projekte').aggregate([
        {
          $facet: {
            aktiv: [
              { $match: { status: { $in: ['aktiv', 'laufend', 'in_bearbeitung'] } } },
              { $count: 'count' }
            ],
            planung: [
              { $match: { status: { $in: ['planung', 'in_planung', 'geplant'] } } },
              { $count: 'count' }
            ],
            abgeschlossen: [
              { $match: { status: { $in: ['abgeschlossen', 'fertig', 'beendet'] } } },
              { $count: 'count' }
            ],
            dieserMonat: [
              {
                $match: {
                  erstelltAm: { $gte: ersterTagDieserMonat }
                }
              },
              { $count: 'count' }
            ],
            vormonat: [
              {
                $match: {
                  erstelltAm: {
                    $gte: ersterTagVormonat,
                    $lte: letzterTagVormonat
                  }
                }
              },
              { $count: 'count' }
            ]
          }
        }
      ]).toArray(),
      
      // 2. Mitarbeiter-Statistiken
      db.collection('mitarbeiter').aggregate([
        {
          $facet: {
            aktiv: [
              { $match: { aktiv: true } },
              { $count: 'count' }
            ]
          }
        }
      ]).toArray(),
      
      // 3. Angebot-Statistiken
      db.collection('angebote').aggregate([
        {
          $facet: {
            offen: [
              { $match: { status: { $in: ['entwurf', 'versendet', 'offen', 'wartend'] } } },
              { $count: 'count' }
            ]
          }
        }
      ]).toArray(),
      
      // 4. Rechnungs-Statistiken
      db.collection('rechnungen').aggregate([
        {
          $facet: {
            ueberfaellig: [
              {
                $match: {
                  faelligkeitsdatum: { $exists: true, $lt: heute },
                  status: { $nin: ['bezahlt', 'storniert'] }
                }
              },
              { $count: 'count' }
            ],
            monatsumsatz: [
              {
                $match: {
                  $or: [
                    { datum: { $gte: ersterTagDieserMonat } },
                    { erstelltAm: { $gte: ersterTagDieserMonat } }
                  ],
                  status: { $in: ['bezahlt', 'versendet', 'offen', 'entwurf'] }
                }
              },
              {
                $group: {
                  _id: null,
                  summe: { $sum: { $ifNull: ['$brutto', 0] } }
                }
              }
            ],
            vormonatsumsatz: [
              {
                $match: {
                  $or: [
                    { 
                      datum: {
                        $gte: ersterTagVormonat,
                        $lte: letzterTagVormonat
                      }
                    },
                    {
                      erstelltAm: {
                        $gte: ersterTagVormonat,
                        $lte: letzterTagVormonat
                      }
                    }
                  ],
                  status: { $in: ['bezahlt', 'versendet', 'offen', 'entwurf'] }
                }
              },
              {
                $group: {
                  _id: null,
                  summe: { $sum: { $ifNull: ['$brutto', 0] } }
                }
              }
            ]
          }
        }
      ]).toArray(),
      
      // 5. Zeiterfassungs-Statistiken
      db.collection('zeiterfassung').aggregate([
        {
          $facet: {
            ausstehend: [
              { $match: { status: { $in: ['ausstehend', 'offen', 'warten'] } } },
              { $count: 'count' }
            ]
          }
        }
      ]).toArray()
    ])
    
    // Extrahiere Werte aus Aggregationen
    const projekte = projektStats[0] || {}
    const aktiveProjekte = projekte.aktiv?.[0]?.count || 0
    const projekteInPlanung = projekte.planung?.[0]?.count || 0
    const abgeschlosseneProjekte = projekte.abgeschlossen?.[0]?.count || 0
    const projekteDieserMonat = projekte.dieserMonat?.[0]?.count || 0
    const projekteVormonat = projekte.vormonat?.[0]?.count || 0
    
    const mitarbeiter = mitarbeiterStats[0] || {}
    const aktiveMitarbeiter = mitarbeiter.aktiv?.[0]?.count || 0
    
    const angebote = angebotStats[0] || {}
    const offeneAngebote = angebote.offen?.[0]?.count || 0
    
    const rechnungen = rechnungStats[0] || {}
    const ueberfaelligeRechnungen = rechnungen.ueberfaellig?.[0]?.count || 0
    const monatsumsatz = rechnungen.monatsumsatz?.[0]?.summe || 0
    const vormonatsumsatz = rechnungen.vormonatsumsatz?.[0]?.summe || 0
    
    const zeiterfassungen = zeiterfassungStats[0] || {}
    const offeneZeiteintraege = zeiterfassungen.ausstehend?.[0]?.count || 0
    
    // Berechne Wachstumstrends
    const projekteWachstum = projekteVormonat > 0
      ? `${projekteVormonat < projekteDieserMonat ? '+' : ''}${Math.round(((projekteDieserMonat - projekteVormonat) / projekteVormonat) * 100)}%`
      : projekteDieserMonat > 0 ? '+100%' : '+0%'
    
    const umsatzWachstum = vormonatsumsatz > 0
      ? `${vormonatsumsatz < monatsumsatz ? '+' : ''}${Math.round(((monatsumsatz - vormonatsumsatz) / vormonatsumsatz) * 100)}%`
      : monatsumsatz > 0 ? '+100%' : '+0%'
    
    // Baue Dashboard-Daten zusammen
    const dashboardData = {
      kpis: {
        // Projekte
        aktiveProjekte,
        projekteInPlanung,
        abgeschlosseneProjekte,
        
        // Mitarbeiter
        aktiveMitarbeiter,
        offeneZeiteintraege,
        
        // Finanzen
        offeneAngebote,
        ueberfaelligeRechnungen,
        monatsumsatz,
        
        // Trends
        projekteWachstum,
        umsatzWachstum
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
    
    // Bei Fehler Fallback mit Nullwerten
    return NextResponse.json({
      erfolg: true,
      data: {
        kpis: {
          aktiveProjekte: 0,
          projekteInPlanung: 0,
          abgeschlosseneProjekte: 0,
          aktiveMitarbeiter: 0,
          offeneZeiteintraege: 0,
          offeneAngebote: 0,
          ueberfaelligeRechnungen: 0,
          monatsumsatz: 0,
          projekteWachstum: '+0%',
          umsatzWachstum: '+0%'
        }
      }
    }, { status: 200 })
  }
}
