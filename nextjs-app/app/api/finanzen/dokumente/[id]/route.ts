import { NextRequest, NextResponse } from 'next/server'
import { downloadFromGridFS } from '@/lib/services/gridfsService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Download-Endpoint für Finanzen-Dokumente
 * GET /api/finanzen/dokumente/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params

    if (!fileId) {
      return NextResponse.json({ 
        fehler: 'Keine Datei-ID angegeben' 
      }, { status: 400 })
    }

    // Datei aus GridFS abrufen
    const { stream, contentType, filename } = await downloadFromGridFS(fileId)
    
    // Stream als Response zurückgeben
    // WICHTIG: Der Stream wird direkt zurückgegeben, Client muss schließen
    const readableStream = new ReadableStream({
      async start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        stream.on('end', () => {
          controller.close()
        })
        stream.on('error', (error) => {
          controller.error(error)
        })
      }
    })

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=3600' // 1 Stunde cachen
      }
    })
  } catch (error: any) {
    console.error('Fehler beim Datei-Download:', error)
    
    if (error.message.includes('nicht gefunden')) {
      return NextResponse.json({ 
        fehler: 'Datei nicht gefunden' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      fehler: error.message || 'Interner Serverfehler beim Download' 
    }, { status: 500 })
  }
}

/**
 * Löschen eines Dokuments
 * DELETE /api/finanzen/dokumente/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params

    if (!fileId) {
      return NextResponse.json({ 
        fehler: 'Keine Datei-ID angegeben' 
      }, { status: 400 })
    }

    // Import deleteFromGridFS hier, um Circular Dependencies zu vermeiden
    const { deleteFromGridFS } = await import('@/lib/services/gridfsService')
    await deleteFromGridFS(fileId)

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Dokument erfolgreich gelöscht'
    })
  } catch (error: any) {
    console.error('Fehler beim Löschen:', error)
    return NextResponse.json({ 
      fehler: error.message || 'Interner Serverfehler beim Löschen' 
    }, { status: 500 })
  }
}

