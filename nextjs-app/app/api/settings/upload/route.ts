import { NextRequest, NextResponse } from 'next/server'
import { uploadCompanyLogo, uploadCertificate } from '@/lib/storage/minioClient'

// POST - Datei-Upload für Logos/Zertifikate
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const uploadType = formData.get('type') as string // 'logo-primary' | 'logo-secondary' | 'certificate'
    const certificateType = formData.get('certificateType') as string | null
    
    if (!file) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }

    if (!uploadType) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Upload-Typ fehlt' },
        { status: 400 }
      )
    }

    // Validiere Dateigröße (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Datei zu groß. Maximum: 10 MB' },
        { status: 400 }
      )
    }

    // Validiere Dateityp
    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp']
    const allowedDocTypes = [...allowedImageTypes, 'application/pdf']
    
    if (uploadType.startsWith('logo-')) {
      if (!allowedImageTypes.includes(file.type)) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Ungültiger Dateityp für Logo. Erlaubt: PNG, JPG, GIF, SVG, WebP' },
          { status: 400 }
        )
      }
    } else if (uploadType === 'certificate') {
      if (!allowedDocTypes.includes(file.type)) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Ungültiger Dateityp für Zertifikat. Erlaubt: Bilder oder PDF' },
          { status: 400 }
        )
      }
    }

    // Konvertiere File zu Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let result
    
    if (uploadType === 'logo-primary') {
      result = await uploadCompanyLogo(buffer, file.name, 'primary')
    } else if (uploadType === 'logo-secondary') {
      result = await uploadCompanyLogo(buffer, file.name, 'secondary')
    } else if (uploadType === 'certificate') {
      if (!certificateType) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Zertifikatstyp fehlt' },
          { status: 400 }
        )
      }
      result = await uploadCertificate(buffer, file.name, certificateType)
    } else {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültiger Upload-Typ' },
        { status: 400 }
      )
    }

    if (!result.erfolg) {
      return NextResponse.json(
        { erfolg: false, fehler: result.fehler || 'Upload fehlgeschlagen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      url: result.url,
      objectName: result.objectName,
      nachricht: 'Datei erfolgreich hochgeladen'
    })

  } catch (error) {
    console.error('Upload-Fehler:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Upload fehlgeschlagen' },
      { status: 500 }
    )
  }
}

