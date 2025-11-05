const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function testConnection() {
  console.log('🔍 MongoDB Atlas Verbindungstest\n');
  console.log('URI:', MONGODB_URI.replace(/:[^:@]+@/, ':***@'));
  console.log('\n⏱️  Teste Verbindung...\n');
  
  const startTime = Date.now();
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  
  try {
    await client.connect();
    const elapsed = Date.now() - startTime;
    console.log(`✅ Verbindung erfolgreich in ${elapsed}ms`);
    
    // Ping test
    const pingStart = Date.now();
    await client.db().admin().ping();
    const pingElapsed = Date.now() - pingStart;
    console.log(`✅ Ping erfolgreich in ${pingElapsed}ms\n`);
    
    if (elapsed > 5000) {
      console.log('⚠️  WARNUNG: Verbindung ist langsam (>5 Sekunden)');
      console.log('   Mögliche Ursachen:');
      console.log('   1. IP-Adresse nicht in MongoDB Atlas Whitelist');
      console.log('   2. Netzwerk/Firewall Probleme');
      console.log('   3. MongoDB Atlas Server-Region zu weit entfernt\n');
    }
    
    // Test schreiben
    console.log('📝 Teste Schreibzugriff...');
    const testDb = client.db('geruestbau_erp');
    const writeStart = Date.now();
    await testDb.collection('_connection_test').insertOne({ test: true, timestamp: new Date() });
    const writeElapsed = Date.now() - writeStart;
    console.log(`✅ Schreiben erfolgreich in ${writeElapsed}ms`);
    
    // Cleanup
    await testDb.collection('_connection_test').deleteMany({ test: true });
    
    await client.close();
    console.log('\n✅ Alle Tests erfolgreich!');
    console.log('\n💡 Wenn die Verbindung langsam ist, fügen Sie Ihre IP zur Whitelist hinzu:');
    console.log('   MongoDB Atlas → Network Access → Add IP Address → Add Current IP Address');
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`❌ Verbindung fehlgeschlagen nach ${elapsed}ms`);
    console.log('\nFehler:', error.message);
    console.log('Fehlercode:', error.code);
    console.log('\n📋 Lösungsvorschläge:');
    console.log('\n1️⃣  MongoDB Atlas IP Whitelist:');
    console.log('   → https://cloud.mongodb.com/');
    console.log('   → Gehe zu: Network Access');
    console.log('   → Click: "Add IP Address"');
    console.log('   → Wähle: "Add Current IP Address" oder "Allow Access from Anywhere" (0.0.0.0/0)');
    console.log('\n2️⃣  Überprüfen Sie Username/Password in der Connection String');
    console.log('\n3️⃣  Überprüfen Sie VPN/Firewall Einstellungen');
  }
}

testConnection();

