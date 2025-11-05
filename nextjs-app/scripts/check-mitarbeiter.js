const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau_erp';

async function checkMitarbeiter() {
  console.log('🔍 Überprüfe Mitarbeiter in der Datenbank\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Verbunden mit MongoDB\n');
    
    const db = client.db(MONGODB_DB);
    const mitarbeiterCollection = db.collection('mitarbeiter');
    
    const count = await mitarbeiterCollection.countDocuments();
    console.log(`📊 Anzahl Mitarbeiter in DB: ${count}\n`);
    
    if (count === 0) {
      console.log('⚠️  Keine Mitarbeiter in der Datenbank gefunden!\n');
      console.log('💡 Tipp: Legen Sie zunächst Mitarbeiter über die Web-Oberfläche an:');
      console.log('   → http://localhost:3000/dashboard/admin/mitarbeiter');
      console.log('   → Klicken Sie auf "Neuer Mitarbeiter"\n');
    } else {
      console.log('📋 Gefundene Mitarbeiter:\n');
      
      const mitarbeiter = await mitarbeiterCollection.find({}).toArray();
      mitarbeiter.forEach((m, index) => {
        const status = m.aktiv ? '✅ Aktiv' : '⚪ Inaktiv';
        console.log(`   ${index + 1}. ${m.vorname} ${m.nachname} - ${status}`);
        if (m.personalnummer) console.log(`      Personalnr: ${m.personalnummer}`);
        if (m.email) console.log(`      E-Mail: ${m.email}`);
        console.log('');
      });
      
      const aktive = mitarbeiter.filter(m => m.aktiv === true).length;
      console.log(`✅ ${aktive} von ${count} Mitarbeiter sind aktiv\n`);
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await client.close();
  }
}

checkMitarbeiter();

