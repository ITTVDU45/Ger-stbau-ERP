import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

/**
 * GET /api/mahnwesen/stats
 * Liefert KPI-Statistiken für das Mahnwesen-Dashboard
 */
export async function GET() {
  try {
    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')
    const rechnungenCollection = db.collection('rechnungen')
    const kundenCollection = db.collection('kunden')

    const heute = new Date()

    // Parallele Aggregationen für bessere Performance
    const [
      aktiveMahnungen,
      gesendeteMahnungen,
      offeneMahnungen,
      zurGenehmigung,
      abgelehnteMahnungen,
      ueberfaelligeRechnungen,
      gesperrteKunden,
      offenerBetragResult
    ] = await Promise.all([
      // Aktive Mahnungen (alle nicht stornierten/bezahlten)
      mahnungenCollection.countDocuments({
        status: { $in: ['erstellt', 'zur_genehmigung', 'genehmigt', 'versendet'] }
      }),

      // Gesendete Mahnungen
      mahnungenCollection.countDocuments({ status: 'versendet' }),

      // Offene Mahnungen (versendet aber noch nicht bezahlt)
      mahnungenCollection.countDocuments({
        status: 'versendet',
        faelligAm: { $lt: heute }
      }),

      // Mahnungen zur Genehmigung
      mahnungenCollection.countDocuments({
        'genehmigung.status': 'ausstehend'
      }),

      // Abgelehnte Mahnungen
      mahnungenCollection.countDocuments({
        'genehmigung.status': 'abgelehnt'
      }),

      // Überfällige Rechnungen (noch nicht gemahnt)
      rechnungenCollection.countDocuments({
        $or: [
          { faelligkeitsdatum: { $lt: heute } },
          { faelligAm: { $lt: heute } }
        ],
        status: { $in: ['entwurf', 'gesendet', 'offen'] },
        mahnstufe: { $in: [0, null] }
      }),

      // Gesperrte Kunden
      kundenCollection.countDocuments({
        'mahnwesen.mahnung_erlaubt': false
      }),

      // Offener Gesamtbetrag (Summe aller offenen Mahnungen)
      mahnungenCollection
        .aggregate([
          {
            $match: {
              status: { $in: ['versendet', 'genehmigt'] }
            }
          },
          {
            $group: {
              _id: null,
              summe: { $sum: '$gesamtforderung' }
            }
          }
        ])
        .toArray()
    ])

    const offenerGesamtbetrag = offenerBetragResult[0]?.summe || 0

    return NextResponse.json(
      {
        erfolg: true,
        stats: {
          aktiveMahnungen,
          gesendeteMahnungen,
          offeneMahnungen,
          ueberfaelligeRechnungen,
          gesperrteKunden,
          zurGenehmigung,
          abgelehnteMahnungen,
          offenerGesamtbetrag
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' // 5 Minuten Cache
        }
      }
    )
  } catch (error) {
    console.error('[GET /api/mahnwesen/stats] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der Statistiken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

