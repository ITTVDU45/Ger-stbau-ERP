/**
 * MongoDB Setup-Script für Customer-Import Collections
 * Erstellt Collections und Indexes für optimale Performance
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function setupCustomerImportCollections() {
  console.log('🚀 Starte Setup für Customer-Import Collections...\n');

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB verbunden');

    const db = client.db(process.env.MONGODB_DB || 'geruestbau_erp');

    // 1. customer_import_jobs Collection erstellen (falls nicht vorhanden)
    const collections = await db.listCollections({ name: 'customer_import_jobs' }).toArray();
    
    if (collections.length === 0) {
      await db.createCollection('customer_import_jobs');
      console.log('✅ Collection "customer_import_jobs" erstellt');
    } else {
      console.log('ℹ️  Collection "customer_import_jobs" existiert bereits');
    }

    // 2. Indexes erstellen
    console.log('\n📊 Erstelle Indexes...');
    const jobsCollection = db.collection('customer_import_jobs');
    
    await jobsCollection.createIndex({ status: 1 }, { name: 'status_idx' });
    console.log('✅ Index: status');

    await jobsCollection.createIndex({ createdAt: -1 }, { name: 'createdAt_idx' });
    console.log('✅ Index: createdAt');

    await jobsCollection.createIndex({ 'params.branche': 1 }, { name: 'branche_idx' });
    console.log('✅ Index: params.branche');

    await jobsCollection.createIndex({ 'params.standort': 1 }, { name: 'standort_idx' });
    console.log('✅ Index: params.standort');

    await jobsCollection.createIndex(
      { createdAt: -1, status: 1 },
      { name: 'createdAt_status_idx' }
    );
    console.log('✅ Compound Index: createdAt + status');

    await jobsCollection.createIndex(
      { 'params.branche': 1, 'params.standort': 1 },
      { name: 'branche_standort_idx' }
    );
    console.log('✅ Compound Index: branche + standort');

    // 3. TTL Index für Auto-Cleanup (Jobs älter als 90 Tage)
    await jobsCollection.createIndex(
      { createdAt: 1 },
      { 
        name: 'ttl_cleanup_idx',
        expireAfterSeconds: 90 * 24 * 60 * 60 // 90 Tage
      }
    );
    console.log('✅ TTL Index: Auto-Cleanup nach 90 Tagen');

    // 4. Erweitere kunden Collection mit source/sourceMeta Indexes
    const kundenCollection = db.collection('kunden');
    
    await kundenCollection.createIndex(
      { source: 1 },
      { name: 'source_idx', sparse: true }
    );
    console.log('✅ Index: source (kunden)');

    await kundenCollection.createIndex(
      { 'sourceMeta.jobId': 1 },
      { name: 'sourceMeta_jobId_idx', sparse: true }
    );
    console.log('✅ Index: sourceMeta.jobId (kunden)');

    console.log('\n✅ Setup erfolgreich abgeschlossen!');
    console.log('\n📊 Zusammenfassung:');
    console.log('   - Collection: customer_import_jobs');
    console.log('   - Indexes: 9 (inkl. TTL)');
    console.log('   - Auto-Cleanup: nach 90 Tagen');

    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler beim Setup:', error);
    await client.close();
    process.exit(1);
  }
}

// Script ausführen
setupCustomerImportCollections();

