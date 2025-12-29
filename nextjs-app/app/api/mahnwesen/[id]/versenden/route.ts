import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

/**
 * POST /api/mahnwesen/:id/versenden
 * Versendet eine Mahnung per E-Mail oder generiert PDF zum Download
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { versandart, email } = body

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Mahnungs-ID' },
        { status: 400 }
      )
    }

    if (!versandart || !['email', 'pdf_download'].includes(versandart)) {
      return NextResponse.json(
        {
          erfolg: false,
          fehler: 'Ungültige Versandart. Erlaubt: "email" oder "pdf_download"'
        },
        { status: 400 }
      )
    }

    if (versandart === 'email' && !email) {
      return NextResponse.json(
        {
          erfolg: false,
          fehler: 'E-Mail-Adresse erforderlich für E-Mail-Versand'
        },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mahnungenCollection = db.collection('mahnungen')

    const mahnung = await mahnungenCollection.findOne({ _id: new ObjectId(id) })
    if (!mahnung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Mahnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Prüfe ob Mahnung genehmigt wurde
    if (mahnung.genehmigung?.status !== 'genehmigt') {
      return NextResponse.json(
        {
          erfolg: false,
          fehler: 'Mahnung muss zuerst genehmigt werden'
        },
        { status: 403 }
      )
    }

    const jetzt = new Date()
    const benutzer = 'admin' // TODO: Von Session holen

    // TODO: PDF-Generierung implementieren
    // Für jetzt simulieren wir die PDF-Generierung
    const pdfUrl = `/api/mahnwesen/${id}/pdf` // Placeholder
    const pdfObjectName = `mahnung-${mahnung.mahnungsnummer}.pdf`

    const updateFields: any = {
      status: 'versendet',
      versandart,
      versandtAm: jetzt,
      zuletztGeaendert: jetzt,
      pdfUrl,
      pdfObjectName
    }

    if (versandart === 'email') {
      updateFields.versandtAn = email

      // TODO: E-Mail-Versand implementieren
      // Für jetzt simulieren wir den Versand
      console.log(`[Mahnung] E-Mail-Versand simuliert an: ${email}`)
    }

    const chronikEintrag = {
      aktion: 'versendet' as const,
      benutzer,
      zeitpunkt: jetzt,
      details:
        versandart === 'email'
          ? `Mahnung per E-Mail versendet an: ${email}`
          : 'Mahnung als PDF bereitgestellt',
      alterStatus: mahnung.status,
      neuerStatus: 'versendet'
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
      pdfUrl: versandart === 'pdf_download' ? pdfUrl : undefined,
      nachricht:
        versandart === 'email'
          ? `Mahnung wurde per E-Mail an ${email} versendet`
          : 'PDF wurde generiert und steht zum Download bereit'
    })
  } catch (error) {
    console.error('[POST /api/mahnwesen/:id/versenden] Error:', error)
    return NextResponse.json(
      {
        erfolg: false,
        fehler: 'Fehler beim Versenden der Mahnung',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

