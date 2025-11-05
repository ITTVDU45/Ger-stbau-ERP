import { NextRequest, NextResponse } from 'next/server'

// POST - Dokumente hochladen (MinIO)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const files = formData.getAll('files')
    const kategorie = formData.get('kategorie') as string

    if (files.length === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Dateien ausgewählt' },
        { status: 400 }
      )
    }

    // TODO: MinIO-Upload implementieren
    // const minioClient = getMinioClient()
    // const bucketName = 'geruestbau-docs'
    // const objectPrefix = `kunden/${id}/dokumente/`
    
    console.log(`Upload ${files.length} Dateien für Kunde ${id}, Kategorie: ${kategorie}`)

    return NextResponse.json({ 
      erfolg: true,
      message: `${files.length} Datei(en) erfolgreich hochgeladen`,
      uploaded: files.length
    })
  } catch (error) {
    console.error('Fehler beim Upload:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Upload' },
      { status: 500 }
    )
  }
}

// GET - Alle Dokumente eines Kunden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // TODO: MinIO-Liste abrufen
    // const minioClient = getMinioClient()
    // const objectPrefix = `kunden/${id}/dokumente/`
    
    const dokumente: any[] = []
    
    return NextResponse.json({ erfolg: true, dokumente })
  } catch (error) {
    console.error('Fehler:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Dokumente' },
      { status: 500 }
    )
  }
}

