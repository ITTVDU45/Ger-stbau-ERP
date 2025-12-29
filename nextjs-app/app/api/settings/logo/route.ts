import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { requireRole } from '@/lib/auth/rbac'
import { getDatabase } from '@/lib/db/client'
import { uploadCompanyLogo, deleteSettingsFile } from '@/lib/storage/minioClient'

/**
 * POST /api/settings/logo - Firmenlogo hochladen
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ erfolg: false, nachricht: 'Nicht angemeldet' }, { status: 401 })
    }

    // Nur ADMIN und SUPERADMIN dürfen Logo hochladen
    const hasRole = await requireRole(session.userId, ['ADMIN', 'SUPERADMIN'])
    if (!hasRole) {
      return NextResponse.json({ erfolg: false, nachricht: 'Keine Berechtigung' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('logo') as File
    
    if (!file) {
      return NextResponse.json({ erfolg: false, nachricht: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    // Prüfe Dateityp (nur Bilder erlaubt)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        erfolg: false, 
        nachricht: 'Nur Bilddateien sind erlaubt' 
      }, { status: 400 })
    }

    // Prüfe Dateigröße (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        erfolg: false, 
        nachricht: 'Datei ist zu groß (max. 5MB)' 
      }, { status: 400 })
    }

    // Konvertiere File zu Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload zu MinIO
    const uploadResult = await uploadCompanyLogo(buffer, file.name, 'primary')
    
    if (!uploadResult.erfolg || !uploadResult.url || !uploadResult.objectName) {
      return NextResponse.json({
        erfolg: false,
        nachricht: uploadResult.fehler || 'Fehler beim Upload'
      }, { status: 500 })
    }

    // Speichere Logo-URL in Firmeneinstellungen
    const db = await getDatabase()
    const settingsCollection = db.collection('firmeneinstellungen')
    
    await settingsCollection.updateOne(
      {}, // Erste/einzige Firmeneinstellung
      {
        $set: {
          'logo.primary': uploadResult.url,
          'logo.primaryObjectName': uploadResult.objectName,
          zuletztGeaendert: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Logo erfolgreich hochgeladen',
      url: uploadResult.url,
      objectName: uploadResult.objectName
    })

  } catch (error: any) {
    console.error('[API] Fehler beim Logo-Upload:', error)
    return NextResponse.json({
      erfolg: false,
      nachricht: error.message || 'Fehler beim Logo-Upload'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/settings/logo - Firmenlogo löschen
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ erfolg: false, nachricht: 'Nicht angemeldet' }, { status: 401 })
    }

    // Nur ADMIN und SUPERADMIN dürfen Logo löschen
    const hasRole = await requireRole(session.userId, ['ADMIN', 'SUPERADMIN'])
    if (!hasRole) {
      return NextResponse.json({ erfolg: false, nachricht: 'Keine Berechtigung' }, { status: 403 })
    }

    const db = await getDatabase()
    const settingsCollection = db.collection('firmeneinstellungen')
    
    // Hole aktuelles Logo
    const settings = await settingsCollection.findOne({})
    
    if (settings?.logo?.primaryObjectName) {
      // Lösche aus MinIO
      try {
        await deleteSettingsFile(settings.logo.primaryObjectName)
      } catch (error) {
        console.error('[API] Fehler beim Löschen des Logos aus MinIO:', error)
      }
    }

    // Entferne Logo aus DB
    await settingsCollection.updateOne(
      {},
      {
        $unset: {
          'logo.primary': '',
          'logo.primaryObjectName': ''
        },
        $set: {
          zuletztGeaendert: new Date()
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Logo erfolgreich gelöscht'
    })

  } catch (error: any) {
    console.error('[API] Fehler beim Logo-Löschen:', error)
    return NextResponse.json({
      erfolg: false,
      nachricht: error.message || 'Fehler beim Logo-Löschen'
    }, { status: 500 })
  }
}

