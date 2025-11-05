/**
 * Aktualisiert existierende Fälle mit User-Tracking-Feldern
 */
const { MongoClient } = require('mongodb')
require('dotenv').config()

async function updateCases() {
  const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI
  const dbNameFromUri = MONGODB_URI.split('/').pop()?.split('?')[0]
  const MONGODB_DB = process.env.MONGODB_DB || dbNameFromUri || 'rechtly'

  console.log('🔄 Aktualisiere Fälle mit User-Tracking...\n')

  let client
  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    const db = client.db(MONGODB_DB)
    const faelleCollection = db.collection('faelle')

    // Aktualisiere alle Fälle ohne User-Tracking
    const result = await faelleCollection.updateMany(
      { 
        $or: [
          { erstelltVonRolle: { $exists: false } },
          { sichtbarFuerAdmin: { $exists: false } }
        ]
      },
      { 
        $set: {
          erstelltVonRolle: 'gutachter',
          zugewiesenAn: 'gutachter-1',
          sichtbarFuerAdmin: true,
          sichtbarFuerGutachter: true
        }
      }
    )

    console.log(`✅ ${result.modifiedCount} Fälle aktualisiert`)
    console.log('   ├─ erstelltVonRolle: gutachter')
    console.log('   ├─ zugewiesenAn: gutachter-1')
    console.log('   ├─ sichtbarFuerAdmin: true')
    console.log('   └─ sichtbarFuerGutachter: true\n')

  } catch (error) {
    console.error('❌ Fehler:', error.message)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

updateCases()
