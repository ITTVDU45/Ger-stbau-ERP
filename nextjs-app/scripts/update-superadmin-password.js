const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')
require('dotenv').config()
const dns = require('dns')

// DNS Fix für MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4'])

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau_erp'

async function updateSuperadminPassword() {
  const email = process.env.SUPERADMIN_EMAIL
  const password = process.env.SUPERADMIN_PASSWORD
  
  if (!email || !password) {
    console.error('❌ Error: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env')
    process.exit(1)
  }
  
  const client = new MongoClient(MONGODB_URI)
  
  try {
    console.log('🔗 Verbinde mit MongoDB...')
    await client.connect()
    console.log('✅ Verbindung hergestellt\n')
    
    const db = client.db(MONGODB_DB)
    
    // Check if superadmin exists
    const existing = await db.collection('users').findOne({
      email: email.toLowerCase()
    })
    
    if (!existing) {
      console.error(`❌ Superadmin mit E-Mail ${email} nicht gefunden!`)
      console.log('💡 Tipp: Führe zuerst "npm run seed:superadmin" aus, um den Superadmin zu erstellen.')
      process.exit(1)
    }
    
    console.log('👤 Superadmin gefunden:')
    console.log(`   E-Mail: ${email}`)
    console.log(`   ID: ${existing._id}`)
    console.log(`   Rolle: ${existing.role}\n`)
    
    console.log('🔐 Aktualisiere Passwort...')
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Update password
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          passwordHash,
          updatedAt: new Date()
        }
      }
    )
    
    if (result.modifiedCount === 1) {
      console.log('\n✅ Passwort erfolgreich aktualisiert!')
      console.log(`   E-Mail: ${email}`)
      console.log(`   Neues Passwort: (aus SUPERADMIN_PASSWORD in .env)\n`)
      console.log('🔐 Sie können sich jetzt mit diesen Zugangsdaten einloggen.')
    } else {
      console.log('\n⚠️  Passwort wurde nicht aktualisiert (möglicherweise identisch).')
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Passworts:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Verbindung geschlossen')
  }
}

updateSuperadminPassword()
