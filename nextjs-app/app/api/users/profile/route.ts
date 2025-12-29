import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getDatabase } from '@/lib/db/client'
import { User, UserRole } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { userId, ...profileData } = body
    
    const db = await getDatabase()
    const usersCollection = db.collection<User>('users')
    
    // Bestimme, welcher Benutzer aktualisiert werden soll
    const targetUserId = userId || session.userId
    
    // RBAC: Normale Benutzer können nur ihr eigenes Profil bearbeiten
    if (targetUserId !== session.userId) {
      if (![UserRole.SUPERADMIN, UserRole.ADMIN].includes(session.role as UserRole)) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Keine Berechtigung, andere Profile zu bearbeiten' },
          { status: 403 }
        )
      }
    }
    
    // Hole aktuellen User, um Profilbild zu erhalten
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(targetUserId) })
    
    // Aktualisiere Profil (behält Profilbild bei)
    const updateData: any = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      updatedAt: new Date(),
      'profile.telefon': profileData.telefon || undefined,
      'profile.geburtsdatum': profileData.geburtsdatum ? new Date(profileData.geburtsdatum) : undefined,
      'profile.personalnummer': profileData.personalnummer || undefined,
      'profile.adresse.strasse': profileData.strasse || undefined,
      'profile.adresse.hausnummer': profileData.hausnummer || undefined,
      'profile.adresse.plz': profileData.plz || undefined,
      'profile.adresse.stadt': profileData.stadt || undefined,
      'profile.adresse.land': profileData.land || 'Deutschland',
      'profile.notfallkontakt.name': profileData.notfallkontaktName || undefined,
      'profile.notfallkontakt.beziehung': profileData.notfallkontaktBeziehung || undefined,
      'profile.notfallkontakt.telefon': profileData.notfallkontaktTelefon || undefined,
      'profile.bankdaten.iban': profileData.iban || undefined,
      'profile.bankdaten.bic': profileData.bic || undefined,
      'profile.bankdaten.bankname': profileData.bankname || undefined,
      'profile.steuerDaten.steuerID': profileData.steuerID || undefined,
      'profile.steuerDaten.sozialversicherungsnummer': profileData.sozialversicherungsnummer || undefined
    }
    
    // Entferne undefined Werte
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    )
    
    console.log('📝 Updating user profile (keeping profilbild):', updateData)
    
    await usersCollection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: updateData }
    )
    
    return NextResponse.json({ 
      erfolg: true, 
      nachricht: 'Profil erfolgreich aktualisiert' 
    })
  } catch (error: any) {
    console.error('Fehler beim Aktualisieren des Profils:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message },
      { status: 500 }
    )
  }
}

