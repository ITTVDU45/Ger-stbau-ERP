import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { uploadProjektDokument, deleteProjektDokument } from '@/lib/storage/minioClient'

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
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const kategorie = formData.get('kategorie') as string
    const kommentar = formData.get('kommentar') as string
    const benutzer = formData.get('benutzer') as string

    if (!file) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Datei gefunden' },
        { status: 400 }
      )
    }

    // Upload zu MinIO
    const result = await uploadProjektDokument(id, file, kategorie)

    // Dokument-Objekt erstellen
    const neueDokument = {
      name: file.name,
      url: result.url,
      objectName: result.objectName,
      typ: file.type,
      kategorie: kategorie || 'sonstiges',
      kommentar: kommentar || '',
      hochgeladenAm: new Date(),
      hochgeladenVon: benutzer || 'admin'
    }

    // Zum Projekt hinzufügen
    await db.collection('projekte').updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          dokumente: neueDokument as any,
          aktivitaeten: {
            aktion: 'Dokument hochgeladen',
            benutzer: benutzer || 'admin',
            zeitpunkt: new Date(),
            details: `Dokument "${file.name}" wurde hochgeladen`,
            typ: 'dokument'
          } as any
        },
        $set: {
          zuletztGeaendert: new Date()
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      dokument: neueDokument,
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
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const objectName = searchParams.get('objectName')
    const benutzer = searchParams.get('benutzer')

    if (!objectName) {
      return NextResponse.json(
        { erfolg: false, fehler: 'ObjectName fehlt' },
        { status: 400 }
      )
    }

    // Von MinIO löschen
    await deleteProjektDokument(objectName)

    // Aus Projekt entfernen
    await db.collection('projekte').updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: {
          dokumente: { objectName } as any
        },
        $push: {
          aktivitaeten: {
            aktion: 'Dokument gelöscht',
            benutzer: benutzer || 'admin',
            zeitpunkt: new Date(),
            details: `Ein Dokument wurde gelöscht`,
            typ: 'dokument'
          } as any
        },
        $set: {
          zuletztGeaendert: new Date()
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Dokument erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Dokuments:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

