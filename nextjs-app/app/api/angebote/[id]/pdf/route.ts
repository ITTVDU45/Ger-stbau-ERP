import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Angebot, CompanySettings } from '@/lib/db/types'
import { renderToStream } from '@react-pdf/renderer'
import AngebotPDFDocument from '@/lib/pdf/AngebotPDFDocument'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()

    // Fetch Angebot
    const angebot = await db.collection<Angebot>('angebote').findOne({ _id: new ObjectId(id) })

    if (!angebot) {
      return NextResponse.json(
        { error: 'Angebot nicht gefunden' },
        { status: 404 }
      )
    }

    // Fetch Company Settings
    const settings = await db.collection<CompanySettings>('settings').findOne({})

    // Generate PDF
    const stream = await renderToStream(
      AngebotPDFDocument({ angebot, settings: settings || undefined })
    )

    // Convert Web Stream to Node.js Readable Stream
    const nodeStream = Readable.fromWeb(stream as any)

    // Collect all chunks
    const chunks: Buffer[] = []
    for await (const chunk of nodeStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Return PDF as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Angebot-${angebot.angebotsnummer}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Fehler bei PDF-Generierung:', error)
    return NextResponse.json(
      { error: 'Fehler bei der PDF-Generierung', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}

