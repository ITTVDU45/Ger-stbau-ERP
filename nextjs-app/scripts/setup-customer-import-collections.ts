/**
 * MongoDB Setup-Script für Customer-Import Collections
 * Erstellt Collections und Indexes für optimale Performance
 */

import { getDatabase } from '@/lib/db'
import { createJobIndexes } from '@/lib/db/customer-import'

async function setupCustomerImportCollections() {
  console.log('🚀 Starte Setup für Customer-Import Collections...\n')

  try {
    const db = await getDatabase()

    // 1. customer_import_jobs Collection erstellen (falls nicht vorhanden)
    const collections = await db.listCollections({ name: 'customer_import_jobs' }).toArray()
    
    if (collections.length === 0) {
      await db.createCollection('customer_import_jobs')
      console.log('✅ Collection "customer_import_jobs" erstellt')
    } else {
      console.log('ℹ️  Collection "customer_import_jobs" existiert bereits')
    }

    // 2. Indexes erstellen
    console.log('\n📊 Erstelle Indexes...')
    await createJobIndexes()

    // 3. Erweiterte Indexes (optional, für bessere Performance)
    const jobsCollection = db.collection('customer_import_jobs')
    
    await jobsCollection.createIndex(
      { createdAt: -1, status: 1 },
      { name: 'createdAt_status_idx' }
    )
    console.log('✅ Compound Index: createdAt + status')

    await jobsCollection.createIndex(
      { 'params.branche': 1, 'params.standort': 1 },
      { name: 'branche_standort_idx' }
    )
    console.log('✅ Compound Index: branche + standort')

    // 4. TTL Index für Auto-Cleanup (Jobs älter als 90 Tage)
    await jobsCollection.createIndex(
      { createdAt: 1 },
      { 
        name: 'ttl_cleanup_idx',
        expireAfterSeconds: 90 * 24 * 60 * 60 // 90 Tage
      }
    )
    console.log('✅ TTL Index: Auto-Cleanup nach 90 Tagen')

    // 5. Erweitere kunden Collection mit source/sourceMeta Indexes
    const kundenCollection = db.collection('kunden')
    
    await kundenCollection.createIndex(
      { source: 1 },
      { name: 'source_idx', sparse: true }
    )
    console.log('✅ Index: source (kunden)')

    await kundenCollection.createIndex(
      { 'sourceMeta.jobId': 1 },
      { name: 'sourceMeta_jobId_idx', sparse: true }
    )
    console.log('✅ Index: sourceMeta.jobId (kunden)')

    // 6. Validierung (Schema Validation - optional)
    await db.command({
      collMod: 'customer_import_jobs',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['status', 'params', 'progress', 'results', 'createdAt'],
          properties: {
            status: {
              enum: ['queued', 'running', 'completed', 'failed', 'cancelled']
            },
            params: {
              bsonType: 'object',
              required: ['branche', 'standort', 'anzahlErgebnisse'],
              properties: {
                branche: { bsonType: 'string' },
                standort: { bsonType: 'string' },
                anzahlErgebnisse: { bsonType: 'int', minimum: 1, maximum: 1000 }
              }
            },
            progress: {
              bsonType: 'object',
              required: ['current', 'total', 'phase']
            },
            results: {
              bsonType: 'array'
            }
          }
        }
      },
      validationLevel: 'moderate', // Nur neue Dokumente validieren
      validationAction: 'warn' // Warnung statt Fehler
    })
    console.log('✅ Schema Validation aktiviert')

    console.log('\n✅ Setup erfolgreich abgeschlossen!')
    console.log('\n📊 Zusammenfassung:')
    console.log('   - Collection: customer_import_jobs')
    console.log('   - Indexes: 7 (inkl. TTL)')
    console.log('   - Schema Validation: aktiviert')
    console.log('   - Auto-Cleanup: nach 90 Tagen')

    process.exit(0)

  } catch (error) {
    console.error('❌ Fehler beim Setup:', error)
    process.exit(1)
  }
}

// Script ausführen
setupCustomerImportCollections()

