const { MongoClient } = require('mongodb')
require('dotenv').config()
const dns = require('dns')

// DNS Fix für MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4'])

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau_erp'

async function checkSuperadmin() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    console.log('🔗 Verbinde mit MongoDB...')
    await client.connect()
    console.log('✅ Verbindung hergestellt\n')
    
    const db = client.db(MONGODB_DB)
    
    const user = await db.collection('users').findOne({
      role: 'SUPERADMIN'
    })
    
    if (!user) {
      console.log('❌ Kein Superadmin gefunden!')
      return
    }
    
    console.log('👤 Superadmin gefunden:')
    console.log('   E-Mail:', user.email)
    console.log('   Name:', user.firstName, user.lastName)
    console.log('   Rolle:', user.role)
    console.log('   Status:', user.status)
    console.log('   Password Hash vorhanden:', !!user.passwordHash)
    console.log('   Password Hash (erste 30 Zeichen):', user.passwordHash?.substring(0, 30))
    console.log('   E-Mail verifiziert:', user.emailVerifiedAt ? 'Ja' : 'Nein')
    console.log('   Erstellt am:', user.createdAt)
    
  } catch (error) {
    console.error('❌ Fehler:', error)
  } finally {
    await client.close()
    console.log('\n🔌 Verbindung geschlossen')
  }
}

checkSuperadmin()

