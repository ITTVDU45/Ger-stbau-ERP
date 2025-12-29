import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { getDatabase } from '@/lib/db/client'
import { User, UserRole } from '@/lib/db/types'

/**
 * API-Endpunkt zum Zuweisen von Personalnummern an alle Benutzer
 * Nur für SUPERADMIN zugänglich
 */
export async function POST() {
  try {
    // Nur SUPERADMIN darf diesen Endpunkt verwenden
    await requireRole([UserRole.SUPERADMIN])

    const db = await getDatabase()
    const usersCollection = db.collection<User>('users')

    // Finde alle Benutzer ohne Personalnummer
    const usersWithoutPersonalnummer = await usersCollection
      .find({
        $or: [
          { 'profile.personalnummer': { $exists: false } },
          { 'profile.personalnummer': null },
          { 'profile.personalnummer': '' }
        ]
      })
      .toArray()

    if (usersWithoutPersonalnummer.length === 0) {
      return NextResponse.json({
        erfolg: true,
        nachricht: 'Alle Benutzer haben bereits eine Personalnummer',
        aktualisiert: 0
      })
    }

    // Finde die höchste bestehende Personalnummer
    const allUsers = await usersCollection
      .find({ 'profile.personalnummer': { $exists: true, $ne: null, $ne: '' } })
      .toArray()

    let highestNumber = 0
    for (const user of allUsers) {
      const personalnummer = user.profile?.personalnummer
      if (personalnummer) {
        const match = personalnummer.match(/MA-(\d+)/)
        if (match) {
          const number = parseInt(match[1], 10)
          if (number > highestNumber) {
            highestNumber = number
          }
        }
      }
    }

    // Weise jedem Benutzer eine Personalnummer zu
    let nextNumber = highestNumber + 1
    const updates: Array<{ name: string; email: string; personalnummer: string }> = []

    for (const user of usersWithoutPersonalnummer) {
      const personalnummer = `MA-${nextNumber.toString().padStart(3, '0')}`
      
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            'profile.personalnummer': personalnummer,
            updatedAt: new Date()
          } 
        }
      )

      updates.push({
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        personalnummer
      })
      
      nextNumber++
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: `${updates.length} Benutzer haben Personalnummern erhalten`,
      aktualisiert: updates.length,
      details: updates
    })
  } catch (error: any) {
    console.error('Fehler beim Zuweisen der Personalnummern:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message },
      { status: 500 }
    )
  }
}

