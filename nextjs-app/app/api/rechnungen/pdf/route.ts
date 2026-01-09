import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { generateInvoicePDF } from '@/lib/pdf/invoice-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rechnungId, template = 'modern' } = body

    if (!rechnungId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Rechnungs-ID erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()

    // Rechnung laden
    const rechnung = await db.collection('rechnungen').findOne({
      _id: new ObjectId(rechnungId)
    })

    if (!rechnung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Firmeneinstellungen laden
    const companySettings = await db.collection('company_settings').findOne({})
    const company = companySettings || {}

    // PDF generieren
    const pdfBuffer = await generateInvoicePDF(
      rechnung as any,
      company as any,
      template as 'modern' | 'klassisch' | 'kompakt'
    )

    // PDF als Response zurückgeben
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rechnung-${rechnung.rechnungsnummer}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Fehler bei der PDF-Generierung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler bei der PDF-Generierung' },
      { status: 500 }
    )
  }
}
