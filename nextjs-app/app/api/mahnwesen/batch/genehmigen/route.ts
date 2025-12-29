import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

/**
 * POST /api/mahnwesen/batch/genehmigen
 * Massenweise Mahnungen genehmigen
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { mahnungIds, aktion } = body

    if (!Array.isArray(mahnungIds) || mahnungIds.length === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Mahnungs-IDs angegeben' },
        { status: 400 }
      )
    }

    if (!aktion || !['genehmigen', 'ablehnen'].includes(aktion)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Aktion' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')

    const jetzt = new Date()
    const benutzer = 'admin' // TODO: Von Session holen

    const ergebnisse = {
      erfolgreich: 0,
      fehlgeschlagen: 0,
      fehler: [] as string[]
    }

    // Verarbeite jede Mahnung einzeln
    for (const id of mahnungIds) {
      try {
        if (!ObjectId.isValid(id)) {
          ergebnisse.fehlgeschlagen++
          ergebnisse.fehler.push(`Ungültige ID: ${id}`)
          continue
        }

        const mahnung = await mahnungenCollection.findOne({ _id: new ObjectId(id) })
        if (!mahnung) {
          ergebnisse.fehlgeschlagen++
          ergebnisse.fehler.push(`Mahnung nicht gefunden: ${id}`)
          continue
        }

        // Prüfe ob Mahnung bereits genehmigt/abgelehnt wurde
        if (mahnung.genehmigung?.status !== 'ausstehend') {
          ergebnisse.fehlgeschlagen++
          ergebnisse.fehler.push(
            `Mahnung ${mahnung.mahnungsnummer} wurde bereits verarbeitet`
          )
          continue
        }

        const updateFields: any = {
          zuletztGeaendert: jetzt
        }

        const chronikEintrag: any = {
          benutzer,
          zeitpunkt: jetzt,
          alterStatus: mahnung.status
        }

        if (aktion === 'genehmigen') {
          updateFields.status = 'genehmigt'
          updateFields['genehmigung.status'] = 'genehmigt'
          updateFields['genehmigung.genehmigt_von'] = benutzer
          updateFields['genehmigung.genehmigt_am'] = jetzt

          chronikEintrag.aktion = 'genehmigt'
          chronikEintrag.neuerStatus = 'genehmigt'
          chronikEintrag.details = 'Mahnung wurde per Massenaktion genehmigt'
        } else {
          updateFields.status = 'abgelehnt'
          updateFields['genehmigung.status'] = 'abgelehnt'
          updateFields['genehmigung.abgelehnt_von'] = benutzer
          updateFields['genehmigung.abgelehnt_am'] = jetzt
          updateFields['genehmigung.ablehnungsgrund'] = 'Massenaktion'

          chronikEintrag.aktion = 'abgelehnt'
          chronikEintrag.neuerStatus = 'abgelehnt'
          chronikEintrag.details = 'Mahnung wurde per Massenaktion abgelehnt'
        }

        await mahnungenCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: updateFields,
            $push: { chronik: chronikEintrag }
          }
        )

        ergebnisse.erfolgreich++
      } catch (error) {
        ergebnisse.fehlgeschlagen++
        ergebnisse.fehler.push(
          `Fehler bei ${id}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
        )
      }
    }

    return NextResponse.json({
      erfolg: true,
      ergebnisse,
      nachricht: `${ergebnisse.erfolgreich} von ${mahnungIds.length} Mahnungen erfolgreich ${aktion === 'genehmigen' ? 'genehmigt' : 'abgelehnt'}`
    })
  } catch (error) {
    console.error('[POST /api/mahnwesen/batch/genehmigen] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler bei der Massenverarbeitung',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

