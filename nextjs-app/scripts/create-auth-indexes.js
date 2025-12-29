const { MongoClient } = require('mongodb')
require('dotenv').config()
const dns = require('dns')

// DNS Fix für MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4'])

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau_erp'

async function createAuthIndexes() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    console.log('🔗 Verbinde mit MongoDB...')
    await client.connect()
    console.log('✅ Verbindung hergestellt')
    
    const db = client.db(MONGODB_DB)
    
    console.log('\n📊 Erstelle Auth-Indizes...\n')
    
    // Users Collection
    console.log('👤 users Collection:')
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    console.log('  ✅ Unique Index auf email erstellt')
    
    await db.collection('users').createIndex({ status: 1, role: 1 })
    console.log('  ✅ Compound Index auf status und role erstellt')
    
    // Invitations Collection
    console.log('\n✉️  invitations Collection:')
    await db.collection('invitations').createIndex({ tokenHash: 1 }, { unique: true })
    console.log('  ✅ Unique Index auf tokenHash erstellt')
    
    await db.collection('invitations').createIndex({ email: 1, usedAt: 1 })
    console.log('  ✅ Compound Index auf email und usedAt erstellt')
    
    await db.collection('invitations').createIndex({ expiresAt: 1 })
    console.log('  ✅ Index auf expiresAt erstellt')
    
    // Sessions Collection
    console.log('\n🔐 sessions Collection:')
    await db.collection('sessions').createIndex({ userId: 1, expiresAt: 1 })
    console.log('  ✅ Compound Index auf userId und expiresAt erstellt')
    
    await db.collection('sessions').createIndex({ token: 1 })
    console.log('  ✅ Index auf token erstellt')
    
    // Audit Logs Collection
    console.log('\n📝 audit_logs Collection:')
    await db.collection('audit_logs').createIndex({ actorUserId: 1, createdAt: -1 })
    console.log('  ✅ Compound Index auf actorUserId und createdAt erstellt')
    
    await db.collection('audit_logs').createIndex({ action: 1, createdAt: -1 })
    console.log('  ✅ Compound Index auf action und createdAt erstellt')
    
    console.log('\n✅ Alle Auth-Indizes erfolgreich erstellt!')
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Indizes:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Verbindung geschlossen')
  }
}

createAuthIndexes()

