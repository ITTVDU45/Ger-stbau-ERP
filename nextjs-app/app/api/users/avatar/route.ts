import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getDatabase } from '@/lib/db/client'
import { User, UserRole } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { uploadProfilbild, deleteProfilbild } from '@/lib/storage/minioClient'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    // Hole FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string | null
    
    if (!file) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }
    
    // Bestimme, welcher Benutzer aktualisiert werden soll
    const targetUserId = userId || session.userId
    
    // RBAC: Normale Benutzer können nur ihr eigenes Profilbild hochladen
    if (targetUserId !== session.userId) {
      if (![UserRole.SUPERADMIN, UserRole.ADMIN].includes(session.role as UserRole)) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Keine Berechtigung, andere Profilbilder zu ändern' },
          { status: 403 }
        )
      }
    }
    
    // Validiere Dateityp
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Nur JPG, PNG und WebP Bilder sind erlaubt' },
        { status: 400 }
      )
    }
    
    // Validiere Dateigröße (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Datei ist zu groß. Maximum: 5MB' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const usersCollection = db.collection<User>('users')
    
    // Hole aktuellen Benutzer
    const user = await usersCollection.findOne({ _id: new ObjectId(targetUserId) })
    
    if (!user) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Lösche altes Profilbild, falls vorhanden
    const oldObjectName = user.profile?.profilbild?.filename
    if (oldObjectName) {
      try {
        await deleteProfilbild(oldObjectName)
      } catch (error) {
        console.error('Fehler beim Löschen des alten Profilbilds:', error)
        // Fahre fort, auch wenn das Löschen fehlschlägt
      }
    }
    
    // Konvertiere Datei zu Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload zu MinIO
    const uploadResult = await uploadProfilbild(
      targetUserId,
      buffer,
      file.name,
      file.type
    )
    
    if (!uploadResult.erfolg) {
      return NextResponse.json(
        { erfolg: false, fehler: uploadResult.fehler || 'Upload fehlgeschlagen' },
        { status: 500 }
      )
    }
    
    // Aktualisiere User in Datenbank
    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(targetUserId) },
      {
        $set: {
          'profile.profilbild.url': uploadResult.url,
          'profile.profilbild.filename': uploadResult.objectName,
          'profile.profilbild.uploadedAt': new Date(),
          updatedAt: new Date()
        }
      }
    )
    
    if (updateResult.modifiedCount === 0) {
      console.warn('⚠️ Profilbild wurde hochgeladen, aber Datenbank wurde nicht aktualisiert')
    } else {
      console.log('✅ Profilbild erfolgreich in Datenbank gespeichert')
    }
    
    return NextResponse.json({
      erfolg: true,
      url: uploadResult.url,
      filename: uploadResult.objectName,
      nachricht: 'Profilbild erfolgreich hochgeladen'
    })
  } catch (error: any) {
    console.error('Fehler beim Hochladen des Profilbilds:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // Bestimme, welcher Benutzer aktualisiert werden soll
    const targetUserId = userId || session.userId
    
    // RBAC: Normale Benutzer können nur ihr eigenes Profilbild löschen
    if (targetUserId !== session.userId) {
      if (![UserRole.SUPERADMIN, UserRole.ADMIN].includes(session.role as UserRole)) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Keine Berechtigung, andere Profilbilder zu löschen' },
          { status: 403 }
        )
      }
    }
    
    const db = await getDatabase()
    const usersCollection = db.collection<User>('users')
    
    // Hole aktuellen Benutzer
    const user = await usersCollection.findOne({ _id: new ObjectId(targetUserId) })
    
    if (!user) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Lösche Profilbild aus MinIO
    const objectName = user.profile?.profilbild?.filename
    if (objectName) {
      await deleteProfilbild(objectName)
    }
    
    // Entferne Profilbild aus Datenbank
    await usersCollection.updateOne(
      { _id: new ObjectId(targetUserId) },
      {
        $unset: { 'profile.profilbild': '' },
        $set: { updatedAt: new Date() }
      }
    )
    
    return NextResponse.json({
      erfolg: true,
      nachricht: 'Profilbild erfolgreich gelöscht'
    })
  } catch (error: any) {
    console.error('Fehler beim Löschen des Profilbilds:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message },
      { status: 500 }
    )
  }
}

