const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau_erp';

async function checkCollections() {
  console.log('🔍 Überprüfe MongoDB Collections\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Verbunden mit MongoDB\n');
    
    const db = client.db(MONGODB_DB);
    
    // Alle Collections auflisten
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Datenbank: ${MONGODB_DB}`);
    console.log(`📁 Anzahl Collections: ${collections.length}\n`);
    
    if (collections.length === 0) {
      console.log('⚠️  Keine Collections gefunden - Datenbank ist leer\n');
      console.log('💡 Die Collections werden automatisch erstellt, wenn das erste Dokument eingefügt wird.\n');
      
      console.log('📋 Geplante Collections für das Gerüstbau ERP:');
      console.log('   • kunden          - Kundendaten');
      console.log('   • mitarbeiter     - Mitarbeiterdaten');
      console.log('   • projekte        - Projektdaten');
      console.log('   • anfragen        - Kundenanfragen');
      console.log('   • angebote        - Angebote/Kalkulationen');
      console.log('   • rechnungen      - Rechnungen');
      console.log('   • zeiterfassung   - Arbeitszeiterfassung');
      console.log('   • urlaub          - Urlaubsanträge');
      console.log('   • einsatzplanung  - Mitarbeiter-Einsätze');
      console.log('   • material        - Material-Stammdaten');
      console.log('   • termine         - Kalender/Termine');
      console.log('   • positionen_vorlagen      - Wiederverwendbare Angebotsvorlagen');
      console.log('   • einleitungstext_vorlagen - Textvorlagen für Angebote');
      console.log('   • zahlungsbedingungen      - Zahlungsbedingungen-Vorlagen');
      console.log('   • settings         - Firmen-Einstellungen');
    } else {
      console.log('📁 Collections:\n');
      
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        const icon = count > 0 ? '✅' : '⚪';
        console.log(`   ${icon} ${collection.name.padEnd(25)} (${count} Dokumente)`);
      }
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await client.close();
  }
}

checkCollections();

