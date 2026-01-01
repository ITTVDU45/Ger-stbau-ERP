const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkUsers() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const users = await db.collection('users').find({}).toArray();
    
    console.log('📋 Gefundene Benutzer in der Datenbank:\n');
    console.log(`Gesamt: ${users.length} Benutzer\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. E-Mail: ${user.email}`);
      console.log(`   Name: ${user.vorname} ${user.nachname}`);
      console.log(`   Rolle: ${user.rolle}`);
      console.log(`   Erstellt: ${user.erstelltAm?.toISOString() || 'N/A'}`);
      console.log(`   Passwort-Hash: ${user.passwort?.substring(0, 20)}...`);
      console.log('');
    });
    
    // Suche nach spezifischem Benutzer
    const targetUser = await db.collection('users').findOne({ 
      email: 'info@aplus-geruestbau.de' 
    });
    
    if (targetUser) {
      console.log('✅ Benutzer info@aplus-geruestbau.de GEFUNDEN!');
      console.log(`   Rolle: ${targetUser.rolle}`);
      console.log(`   Name: ${targetUser.vorname} ${targetUser.nachname}`);
    } else {
      console.log('❌ Benutzer info@aplus-geruestbau.de NICHT GEFUNDEN');
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
