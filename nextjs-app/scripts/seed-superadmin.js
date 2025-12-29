const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')
require('dotenv').config()
const dns = require('dns')

// DNS Fix für MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4'])

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau_erp'

async function seedSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL
  const password = process.env.SUPERADMIN_PASSWORD
  const firstName = process.env.SUPERADMIN_FIRST_NAME || 'Super'
  const lastName = process.env.SUPERADMIN_LAST_NAME || 'Admin'
  
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
    
    // Check if superadmin already exists
    const existing = await db.collection('users').findOne({
      email: email.toLowerCase()
    })
    
    if (existing) {
      console.log('ℹ️  Superadmin existiert bereits:')
      console.log(`   E-Mail: ${email}`)
      console.log(`   ID: ${existing._id}`)
      console.log(`   Status: ${existing.status}`)
      console.log(`   Rolle: ${existing.role}\n`)
      return
    }
    
    console.log('👤 Erstelle Superadmin...')
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Create superadmin
    const result = await db.collection('users').insertOne({
      email: email.toLowerCase(),
      firstName,
      lastName,
      role: 'SUPERADMIN',
      passwordHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdByUserId: null
    })
    
    console.log('\n✅ Superadmin erfolgreich erstellt!')
    console.log(`   E-Mail: ${email}`)
    console.log(`   Name: ${firstName} ${lastName}`)
    console.log(`   ID: ${result.insertedId}`)
    console.log(`   Rolle: SUPERADMIN`)
    console.log(`   Status: ACTIVE\n`)
    
    console.log('🔐 Sie können sich jetzt mit diesen Zugangsdaten einloggen.')
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Superadmins:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Verbindung geschlossen')
  }
}

seedSuperadmin()

