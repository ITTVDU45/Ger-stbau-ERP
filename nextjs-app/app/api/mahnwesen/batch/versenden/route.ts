import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

/**
 * POST /api/mahnwesen/batch/versenden
 * Massenweise Mahnungen versenden
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { mahnungIds, versandart, standardEmail } = body

    if (!Array.isArray(mahnungIds) || mahnungIds.length === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Mahnungs-IDs angegeben' },
        { status: 400 }
      )
    }

    if (!versandart || !['email', 'pdf_download'].includes(versandart)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Versandart' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')
    const kundenCollection = db.collection('kunden')

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

        // Prüfe ob Mahnung genehmigt wurde
        if (mahnung.genehmigung?.status !== 'genehmigt') {
          ergebnisse.fehlgeschlagen++
          ergebnisse.fehler.push(
            `Mahnung ${mahnung.mahnungsnummer} muss zuerst genehmigt werden`
          )
          continue
        }

        // Prüfe ob bereits versendet
        if (mahnung.status === 'versendet') {
          ergebnisse.fehlgeschlagen++
          ergebnisse.fehler.push(
            `Mahnung ${mahnung.mahnungsnummer} wurde bereits versendet`
          )
          continue
        }

        let email = standardEmail
        if (versandart === 'email') {
          // Hole Kunden-E-Mail falls keine Standard-E-Mail angegeben
          if (!email) {
            const kunde = await kundenCollection.findOne({
              _id: new ObjectId(mahnung.kundeId)
            })
            email = kunde?.email
          }

          if (!email) {
            ergebnisse.fehlgeschlagen++
            ergebnisse.fehler.push(
              `Keine E-Mail-Adresse für Mahnung ${mahnung.mahnungsnummer}`
            )
            continue
          }
        }

        // TODO: PDF-Generierung und E-Mail-Versand implementieren
        const pdfUrl = `/api/mahnwesen/${id}/pdf`
        const pdfObjectName = `mahnung-${mahnung.mahnungsnummer}.pdf`

        const updateFields: any = {
          status: 'versendet',
          versandart,
          versandtAm: jetzt,
          zuletztGeaendert: jetzt,
          pdfUrl,
          pdfObjectName
        }

        if (versandart === 'email' && email) {
          updateFields.versandtAn = email
        }

        const chronikEintrag = {
          aktion: 'versendet' as const,
          benutzer,
          zeitpunkt: jetzt,
          details:
            versandart === 'email'
              ? `Mahnung per Massenaktion per E-Mail versendet an: ${email}`
              : 'Mahnung per Massenaktion als PDF bereitgestellt',
          alterStatus: mahnung.status,
          neuerStatus: 'versendet'
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
      nachricht: `${ergebnisse.erfolgreich} von ${mahnungIds.length} Mahnungen erfolgreich versendet`
    })
  } catch (error) {
    console.error('[POST /api/mahnwesen/batch/versenden] Error:', error)
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

