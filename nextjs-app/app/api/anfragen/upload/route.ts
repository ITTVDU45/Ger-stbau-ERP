import { NextRequest, NextResponse } from 'next/server'
import { uploadAnfrageDokument } from '@/lib/storage/minioClient'

// POST - Dokument hochladen
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const anfrageId = formData.get('anfrageId') as string

    if (!file) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Datei gefunden' },
        { status: 400 }
      )
    }

    if (!anfrageId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Anfrage-ID fehlt' },
        { status: 400 }
      )
    }

    const result = await uploadAnfrageDokument(anfrageId, file)

    return NextResponse.json({
      erfolg: true,
      dokument: {
        name: file.name,
        url: result.url,
        objectName: result.objectName,
        typ: file.type,
        hochgeladenAm: new Date()
      },
      nachricht: 'Dokument erfolgreich hochgeladen'
    })
  } catch (error) {
    console.error('Fehler beim Hochladen des Dokuments:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler beim Upload' },
      { status: 500 }
    )
  }
}

