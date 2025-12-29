import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

/**
 * POST /api/mahnwesen/:id/genehmigen
 * Genehmigt oder lehnt eine Mahnung ab
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { aktion, begruendung, kunde_sperren } = body

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Mahnungs-ID' },
        { status: 400 }
      )
    }

    if (!aktion || !['genehmigen', 'ablehnen'].includes(aktion)) {
      return NextResponse.json(
        {
          erfolg: false,
          fehler: 'Ungültige Aktion. Erlaubt: "genehmigen" oder "ablehnen"'
        },
        { status: 400 }
      )
    }

    if (aktion === 'ablehnen' && !begruendung) {
      return NextResponse.json(
        {
          erfolg: false,
          fehler: 'Begründung ist bei Ablehnung erforderlich'
        },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')
    const kundenCollection = db.collection('kunden')

    const mahnung = await mahnungenCollection.findOne({ _id: new ObjectId(id) })
    if (!mahnung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mahnung nicht gefunden' },
        { status: 404 }
      )
    }

    const jetzt = new Date()
    const benutzer = 'admin' // TODO: Von Session holen

    // Basis-Update
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
      chronikEintrag.details = 'Mahnung wurde genehmigt'
    } else {
      // Ablehnen
      updateFields.status = 'abgelehnt'
      updateFields['genehmigung.status'] = 'abgelehnt'
      updateFields['genehmigung.abgelehnt_von'] = benutzer
      updateFields['genehmigung.abgelehnt_am'] = jetzt
      updateFields['genehmigung.ablehnungsgrund'] = begruendung

      chronikEintrag.aktion = 'abgelehnt'
      chronikEintrag.neuerStatus = 'abgelehnt'
      chronikEintrag.details = `Mahnung wurde abgelehnt: ${begruendung}`

      // Wenn Kunde gesperrt werden soll
      if (kunde_sperren && mahnung.kundeId) {
        await kundenCollection.updateOne(
          { _id: new ObjectId(mahnung.kundeId) },
          {
            $set: {
              'mahnwesen.mahnung_erlaubt': false,
              'mahnwesen.mahnung_gesperrt_grund': begruendung,
              'mahnwesen.mahnung_gesperrt_von': benutzer,
              'mahnwesen.mahnung_gesperrt_am': jetzt
            }
          }
        )

        chronikEintrag.details += ' (Kunde wurde für Mahnungen gesperrt)'
      }
    }

    // Update Mahnung
    await mahnungenCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updateFields,
        $push: { chronik: chronikEintrag }
      }
    )

    const aktualisiert = await mahnungenCollection.findOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      erfolg: true,
      mahnung: aktualisiert,
      nachricht:
        aktion === 'genehmigen'
          ? 'Mahnung wurde genehmigt'
          : 'Mahnung wurde abgelehnt'
    })
  } catch (error) {
    console.error('[POST /api/mahnwesen/:id/genehmigen] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Genehmigen/Ablehnen der Mahnung',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

