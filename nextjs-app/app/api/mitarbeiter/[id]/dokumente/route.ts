import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { uploadMitarbeiterDokument, deleteMitarbeiterDokument } from '@/lib/storage/minioClient'

// POST - Dokument hochladen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Mitarbeiter-ID' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const kategorie = formData.get('kategorie') as string
    const benutzer = formData.get('benutzer') as string

    if (!file) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Datei gefunden' },
        { status: 400 }
      )
    }

    // Dateigrößen-Limit: 10 MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Datei ist zu groß (Maximum: 10 MB)' },
        { status: 400 }
      )
    }

    // Erlaubte Dateitypen
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Dateityp nicht erlaubt (nur PDF, PNG, JPG, DOCX)' },
        { status: 400 }
      )
    }

    // Upload zu MinIO
    const result = await uploadMitarbeiterDokument(id, file, kategorie)

    // Dokument-Objekt erstellen
    const neuesDokument = {
      _id: new ObjectId().toString(),
      titel: file.name,
      name: file.name,
      dateiname: file.name,
      dateipfad: result.objectName,
      url: result.url,
      dateigroesse: file.size,
      dateityp: file.type.split('/')[1] || 'unknown',
      mimetype: file.type,
      kategorie: (kategorie || 'sonstiges') as any,
      hochgeladenVon: benutzer || 'admin',
      hochgeladenAm: new Date()
    }

    // Zum Mitarbeiter hinzufügen
    await db.collection('mitarbeiter').updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          dokumente: neuesDokument as any
        },
        $set: {
          zuletztGeaendert: new Date()
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      dokument: neuesDokument
    })
  } catch (error) {
    console.error('Fehler beim Hochladen des Dokuments:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Hochladen des Dokuments' },
      { status: 500 }
    )
  }
}

// DELETE - Dokument löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Mitarbeiter-ID' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dokumentId = searchParams.get('dokumentId')
    const objectName = searchParams.get('objectName')

    if (!dokumentId || !objectName) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Dokument-ID und ObjectName erforderlich' },
        { status: 400 }
      )
    }

    // Lösche aus MinIO
    await deleteMitarbeiterDokument(objectName)

    // Entferne aus Mitarbeiter-Dokumente
    await db.collection('mitarbeiter').updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: {
          dokumente: { _id: dokumentId }
        },
        $set: {
          zuletztGeaendert: new Date()
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      message: 'Dokument erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Dokuments:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Dokuments' },
      { status: 500 }
    )
  }
}

