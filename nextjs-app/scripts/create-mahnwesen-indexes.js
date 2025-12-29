/**
 * Script zum Erstellen der Datenbank-Indizes für das Mahnwesen-Modul
 * 
 * Ausführen mit:
 * node scripts/create-mahnwesen-indexes.js
 * 
 * oder über MongoDB Compass/Atlas:
 * Kopieren Sie die Befehle und führen Sie sie in der MongoDB Shell aus
 */

const { MongoClient } = require('mongodb')

// MongoDB Connection String aus .env.local laden
require('dotenv').config({ path: '.env.local' })

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau_erp'

if (!MONGO_URI) {
  console.error('❌ MONGO_URI oder MONGODB_URI nicht in .env.local gefunden!')
  process.exit(1)
}

async function createIndexes() {
  const client = new MongoClient(MONGO_URI)

  try {
    console.log('📡 Verbinde mit MongoDB...')
    await client.connect()
    console.log('✅ Verbunden mit MongoDB')

    const db = client.db(MONGODB_DB)
    const mahnungenCollection = db.collection('mahnungen')

    console.log('\n🔨 Erstelle Indizes für Mahnungen-Collection...\n')

    // Index 1: rechnungId (für schnelle Abfragen nach Rechnung)
    await mahnungenCollection.createIndex({ rechnungId: 1 })
    console.log('✅ Index erstellt: { rechnungId: 1 }')

    // Index 2: kundeId (für schnelle Abfragen nach Kunde)
    await mahnungenCollection.createIndex({ kundeId: 1 })
    console.log('✅ Index erstellt: { kundeId: 1 }')

    // Index 3: projektId (für schnelle Abfragen nach Projekt)
    await mahnungenCollection.createIndex({ projektId: 1 })
    console.log('✅ Index erstellt: { projektId: 1 }')

    // Index 4: status (für Filterung nach Status)
    await mahnungenCollection.createIndex({ status: 1 })
    console.log('✅ Index erstellt: { status: 1 }')

    // Index 5: genehmigung.status (für Genehmigungsworkflow)
    await mahnungenCollection.createIndex({ 'genehmigung.status': 1 })
    console.log('✅ Index erstellt: { "genehmigung.status": 1 }')

    // Index 6: mahnstufe (für Filterung nach Mahnstufe)
    await mahnungenCollection.createIndex({ mahnstufe: 1 })
    console.log('✅ Index erstellt: { mahnstufe: 1 }')

    // Index 7: faelligAm (für überfällige Mahnungen)
    await mahnungenCollection.createIndex({ faelligAm: 1 })
    console.log('✅ Index erstellt: { faelligAm: 1 }')

    // Index 8: erstelltAm (für Sortierung und Zeitbereich-Abfragen)
    await mahnungenCollection.createIndex({ erstelltAm: -1 })
    console.log('✅ Index erstellt: { erstelltAm: -1 }')

    // Index 9: Compound Index für häufige Abfragen (Status + Datum)
    await mahnungenCollection.createIndex({ status: 1, erstelltAm: -1 })
    console.log('✅ Index erstellt: { status: 1, erstelltAm: -1 }')

    // Index 10: Compound Index für überfällige Mahnungen
    await mahnungenCollection.createIndex({ status: 1, faelligAm: 1 })
    console.log('✅ Index erstellt: { status: 1, faelligAm: 1 }')

    console.log('\n🎉 Alle Indizes erfolgreich erstellt!')

    // Liste alle Indizes auf
    const indexes = await mahnungenCollection.indexes()
    console.log('\n📋 Übersicht aller Indizes:')
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}`)
    })

    console.log('\n✨ Fertig!\n')
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Indizes:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('👋 MongoDB-Verbindung geschlossen')
  }
}

// Script ausführen
createIndexes()

/*
 * MongoDB Shell Befehle (alternativ):
 * =====================================
 * 
 * Kopieren Sie die folgenden Befehle und führen Sie sie in der MongoDB Shell aus:
 * 
 * use geruestbau_erp
 * 
 * db.mahnungen.createIndex({ rechnungId: 1 })
 * db.mahnungen.createIndex({ kundeId: 1 })
 * db.mahnungen.createIndex({ projektId: 1 })
 * db.mahnungen.createIndex({ status: 1 })
 * db.mahnungen.createIndex({ "genehmigung.status": 1 })
 * db.mahnungen.createIndex({ mahnstufe: 1 })
 * db.mahnungen.createIndex({ faelligAm: 1 })
 * db.mahnungen.createIndex({ erstelltAm: -1 })
 * db.mahnungen.createIndex({ status: 1, erstelltAm: -1 })
 * db.mahnungen.createIndex({ status: 1, faelligAm: 1 })
 * 
 * db.mahnungen.getIndexes()
 */

