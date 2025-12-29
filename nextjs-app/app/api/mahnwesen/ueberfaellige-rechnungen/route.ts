import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

/**
 * GET /api/mahnwesen/ueberfaellige-rechnungen
 * Liefert alle überfälligen Rechnungen, die noch nicht (oder nur teilweise) gemahnt wurden
 */
export async function GET() {
  try {
    const db = await getDatabase()
    const rechnungenCollection = db.collection('rechnungen')
    const kundenCollection = db.collection('kunden')
    const projekteCollection = db.collection('projekte')
    const mahnungenCollection = db.collection('mahnungen')

    const heute = new Date()

    // Finde überfällige Rechnungen
    const ueberfaelligeRechnungen = await rechnungenCollection
      .find({
        $and: [
          {
            $or: [
              { faelligkeitsdatum: { $lt: heute } },
              { faelligAm: { $lt: heute } }
            ]
          },
          {
            status: { $in: ['entwurf', 'gesendet', 'offen', 'teilbezahlt'] }
          },
          {
            $or: [
              { mahnstufe: { $exists: false } },
              { mahnstufe: null },
              { mahnstufe: 0 },
              { mahnstufe: { $lt: 3 } } // Auch Rechnungen mit Mahnstufe 1 oder 2 können weiter gemahnt werden
            ]
          }
        ]
      })
      .sort({ faelligkeitsdatum: 1, faelligAm: 1 })
      .toArray()

    // Lade verknüpfte Daten und prüfe Mahnungs-Berechtigung
    const ergebnis = await Promise.all(
      ueberfaelligeRechnungen.map(async (rechnung) => {
        const [kunde, projekt, bestehendeMahnungen] = await Promise.all([
          kundenCollection.findOne({ _id: new ObjectId(rechnung.kundeId) }),
          rechnung.projektId
            ? projekteCollection.findOne({ _id: new ObjectId(rechnung.projektId) })
            : null,
          mahnungenCollection
            .find({ rechnungId: rechnung._id.toString() })
            .sort({ mahnstufe: -1 })
            .limit(1)
            .toArray()
        ])

        // Prüfe Mahnungs-Berechtigung
        let mahnungErlaubt = true
        let sperrgrund = ''

        if (kunde?.mahnwesen?.mahnung_erlaubt === false) {
          // Prüfe Projekt-Override
          if (!projekt?.mahnwesen_override?.mahnung_erlaubt) {
            mahnungErlaubt = false
            sperrgrund =
              kunde.mahnwesen.mahnung_gesperrt_grund ||
              'Kunde ist für Mahnungen gesperrt'
          }
        }

        // Berechne Tage überfällig
        const faelligkeitsdatum = rechnung.faelligkeitsdatum || rechnung.faelligAm
        const tageUeberfaellig = Math.floor(
          (heute.getTime() - new Date(faelligkeitsdatum).getTime()) /
            (1000 * 60 * 60 * 24)
        )

        // Bestimme vorgeschlagene Mahnstufe
        const aktuelleMahnstufe = rechnung.mahnstufe || 0
        const letzeMahnung = bestehendeMahnungen[0]
        let vorgeschlageneMahnstufe = aktuelleMahnstufe + 1

        // Maximal Mahnstufe 3
        if (vorgeschlageneMahnstufe > 3) {
          vorgeschlageneMahnstufe = 3
        }

        return {
          rechnung,
          kunde,
          projekt,
          tageUeberfaellig,
          vorgeschlageneMahnstufe,
          aktuelleMahnstufe,
          letzeMahnung,
          mahnungErlaubt,
          sperrgrund
        }
      })
    )

    // Filtere gesperrte Kunden heraus (optional - kann auch im Frontend gemacht werden)
    const erlaubteRechnungen = ergebnis.filter((r) => r.mahnungErlaubt)
    const gesperrteRechnungen = ergebnis.filter((r) => !r.mahnungErlaubt)

    return NextResponse.json({
      erfolg: true,
      rechnungen: erlaubteRechnungen,
      gesperrteRechnungen,
      gesamt: ergebnis.length,
      erlaubt: erlaubteRechnungen.length,
      gesperrt: gesperrteRechnungen.length
    })
  } catch (error) {
    console.error('[GET /api/mahnwesen/ueberfaellige-rechnungen] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Laden der überfälligen Rechnungen',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

