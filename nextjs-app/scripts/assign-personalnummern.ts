/**
 * Script zum Zuweisen von Personalnummern an bestehende Benutzer
 * Führe dieses Script aus mit: npx tsx scripts/assign-personalnummern.ts
 */

import dotenv from 'dotenv'
import path from 'path'

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') })

import { getDatabase } from '../lib/db/client'
import { User } from '../lib/db/types'

async function assignPersonalnummern() {
  try {
    console.log('🔄 Verbinde mit MongoDB...')
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

    console.log(`📊 Gefunden: ${usersWithoutPersonalnummer.length} Benutzer ohne Personalnummer`)

    if (usersWithoutPersonalnummer.length === 0) {
      console.log('✅ Alle Benutzer haben bereits eine Personalnummer!')
      return
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

    console.log(`🔢 Höchste bestehende Personalnummer: MA-${highestNumber.toString().padStart(3, '0')}`)
    console.log('📝 Weise Personalnummern zu...\n')

    // Weise jedem Benutzer eine Personalnummer zu
    let nextNumber = highestNumber + 1
    let updatedCount = 0

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

      console.log(`✅ ${user.firstName} ${user.lastName} (${user.email}) → ${personalnummer}`)
      
      nextNumber++
      updatedCount++
    }

    console.log(`\n🎉 Erfolgreich! ${updatedCount} Benutzer haben Personalnummern erhalten.`)
    console.log(`📋 Nächste verfügbare Personalnummer: MA-${nextNumber.toString().padStart(3, '0')}`)
  } catch (error) {
    console.error('❌ Fehler beim Zuweisen der Personalnummern:', error)
    process.exit(1)
  }
}

// Script ausführen
assignPersonalnummern()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error)
    process.exit(1)
  })

