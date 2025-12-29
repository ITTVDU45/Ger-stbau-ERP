const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')
require('dotenv').config()
const dns = require('dns')

// DNS Fix
dns.setServers(['8.8.8.8', '8.8.4.4'])

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau_erp'
const TEST_PASSWORD = process.env.SUPERADMIN_PASSWORD

async function testPassword() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    console.log('🔗 Verbinde mit MongoDB...')
    await client.connect()
    
    const db = client.db(MONGODB_DB)
    
    const user = await db.collection('users').findOne({
      email: process.env.SUPERADMIN_EMAIL.toLowerCase()
    })
    
    if (!user) {
      console.log('❌ User nicht gefunden')
      return
    }
    
    console.log('\n👤 User gefunden:', user.email)
    console.log('📧 E-Mail:', user.email)
    console.log('🔑 Password Hash vorhanden:', !!user.passwordHash)
    console.log('🔐 Test-Passwort aus .env:', TEST_PASSWORD ? '✅ Vorhanden' : '❌ Fehlt')
    
    if (!TEST_PASSWORD) {
      console.log('\n❌ SUPERADMIN_PASSWORD nicht in .env gesetzt!')
      return
    }
    
    console.log('\n🔍 Teste Passwort-Verifikation...')
    const isValid = await bcrypt.compare(TEST_PASSWORD, user.passwordHash)
    
    if (isValid) {
      console.log('✅ Passwort ist KORREKT!')
      console.log('✅ Login sollte funktionieren mit:')
      console.log('   E-Mail:', user.email)
      console.log('   Passwort: (aus SUPERADMIN_PASSWORD in .env)')
    } else {
      console.log('❌ Passwort ist FALSCH!')
      console.log('❌ Das Passwort in .env stimmt NICHT mit dem gehashten überein')
      console.log('\n💡 Lösung: Führe erneut aus: npm run seed:superadmin')
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error)
  } finally {
    await client.close()
    console.log('\n🔌 Verbindung geschlossen')
  }
}

testPassword()

