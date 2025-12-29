#!/usr/bin/env node
/**
 * MongoDB Connection Test Script mit DNS-Fix
 * 
 * Testet die Verbindung zur MongoDB-Datenbank mit Google DNS
 */

const { MongoClient } = require('mongodb');
const dns = require('dns');
require('dotenv').config();

// DNS-Fix: Setze Google DNS für SRV-Lookups
dns.setServers(['8.8.8.8', '8.8.4.4']);
console.log('🔧 DNS-Server auf Google DNS (8.8.8.8, 8.8.4.4) gesetzt\n');

// Unterstütze beide Varianten: MONGO_URI und MONGODB_URI
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGO_DB || process.env.MONGODB_DB || 'geruestbau_erp';

async function testMongoDBConnection() {
  console.log('🔍 MongoDB Connection Test mit DNS-Fix\n');
  
  // Extrahiere Datenbanknamen aus URI falls vorhanden
  let dbName = MONGODB_DB;
  try {
    const url = new URL(MONGODB_URI.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
    if (url.pathname && url.pathname.length > 1) {
      const pathDb = url.pathname.split('/')[1].split('?')[0];
      if (pathDb) {
        dbName = pathDb;
      }
    }
  } catch (e) {
    // Fallback zu MONGODB_DB
  }
  
  console.log('Configuration:');
  console.log(`  URI: ${MONGODB_URI.replace(/:[^:@]+@/, ':***@')}`); // Verstecke Passwort
  console.log(`  Database: ${dbName}\n`);

  let client;
  
  try {
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    await client.connect();
    console.log('✅ Successfully connected to MongoDB!\n');

    // Test database access
    const db = client.db(dbName);
    console.log(`📊 Testing database: ${dbName}`);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Test a simple operation
    console.log('\n🧪 Testing write operation...');
    const testCollection = db.collection('connection_test');
    const testDoc = {
      timestamp: new Date(),
      test: true,
      message: 'Connection test successful with DNS fix'
    };
    
    const result = await testCollection.insertOne(testDoc);
    console.log(`✅ Successfully inserted test document with ID: ${result.insertedId}`);

    // Clean up test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('🧹 Cleaned up test document');

    // Get server info
    const admin = db.admin();
    const serverInfo = await admin.serverInfo();
    console.log(`\n📈 MongoDB Version: ${serverInfo.version}`);

    console.log('\n✅ All MongoDB tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:');
    console.error(`   ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Make sure MongoDB is running');
      console.error('   2. Check if the connection URI is correct');
      console.error('   3. Verify the port (default: 27017)');
    }
    
    return false;
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Connection closed');
    }
  }
}

// Run the test
testMongoDBConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

