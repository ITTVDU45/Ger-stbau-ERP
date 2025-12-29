import { NextRequest, NextResponse } from 'next/server'
import { uploadToGridFS } from '@/lib/services/gridfsService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Upload-Endpoint für Finanzen-Dokumente
 * POST /api/finanzen/upload
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const uploadedBy = formData.get('uploadedBy') as string || 'system'
    
    if (!file) {
      return NextResponse.json({ 
        fehler: 'Keine Datei hochgeladen' 
      }, { status: 400 })
    }

    // Validierung: Max 10MB
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        fehler: 'Datei zu groß (max 10MB)' 
      }, { status: 400 })
    }

    // Erlaubte Dateitypen
    const erlaubteTypen = [
      'image/jpeg',
      'image/jpg', 
      'image/png', 
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (!erlaubteTypen.includes(file.type)) {
      return NextResponse.json({ 
        fehler: `Dateityp nicht erlaubt: ${file.type}. Erlaubt sind: Bilder (JPG, PNG, WebP), PDF, DOC, DOCX, XLS, XLSX` 
      }, { status: 400 })
    }

    // Datei in Buffer konvertieren und zu GridFS hochladen
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadToGridFS(buffer, file.name, file.type, uploadedBy)

    return NextResponse.json({
      erfolg: true,
      dokument: {
        _id: result.fileId,
        filename: result.filename,
        contentType: result.contentType,
        size: result.size,
        uploadedAt: new Date(),
        uploadedBy
      }
    })
  } catch (error: any) {
    console.error('Fehler beim Datei-Upload:', error)
    return NextResponse.json({ 
      fehler: error.message || 'Interner Serverfehler beim Upload' 
    }, { status: 500 })
  }
}

