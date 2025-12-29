const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env' })

const KATEGORIEN = {
  einnahme: [
    { name: 'Projektabrechnung / Rechnung', icon: '💰', farbe: '#10B981', steuerrelevant: true },
    { name: 'Service & Wartung', icon: '🔧', farbe: '#3B82F6', steuerrelevant: true },
    { name: 'Beratung / Stunden', icon: '⏱️', farbe: '#8B5CF6', steuerrelevant: true },
    { name: 'Sonstiges', icon: '📦', farbe: '#6B7280', steuerrelevant: false }
  ],
  ausgabe: [
    { name: 'Material / Einkauf', icon: '🏗️', farbe: '#EF4444', steuerrelevant: true },
    { name: 'Subunternehmer', icon: '👷', farbe: '#F59E0B', steuerrelevant: true },
    { name: 'Fahrzeuge / Leasing / Sprit', icon: '🚗', farbe: '#EF4444', steuerrelevant: true },
    { name: 'Personal', icon: '👥', farbe: '#8B5CF6', steuerrelevant: true },
    { name: 'Software / Tools', icon: '💻', farbe: '#3B82F6', steuerrelevant: true },
    { name: 'Marketing', icon: '📣', farbe: '#EC4899', steuerrelevant: true },
    { name: 'Miete / Büro', icon: '🏢', farbe: '#F59E0B', steuerrelevant: true },
    { name: 'Versicherungen', icon: '🛡️', farbe: '#10B981', steuerrelevant: true },
    { name: 'Steuern / Abgaben', icon: '📊', farbe: '#6366F1', steuerrelevant: true },
    { name: 'Sonstiges', icon: '📦', farbe: '#6B7280', steuerrelevant: false }
  ]
}

async function seed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  
  if (!uri) {
    console.error('❌ MONGO_URI oder MONGODB_URI nicht in .env definiert')
    process.exit(1)
  }
  
  // Datenbankname aus URI extrahieren oder Default verwenden
  const dbName = process.env.MONGODB_DB || uri.split('/').pop()?.split('?')[0] || 'geruestbau_erp'

  console.log('🚀 Starte Finanzen-Kategorien Seed...')
  
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    console.log('✅ Mit MongoDB verbunden')
    
    const db = client.db(dbName)
    const collection = db.collection('finanzen_kategorien')
    
    // Prüfe ob bereits Kategorien existieren
    const existingCount = await collection.countDocuments()
    if (existingCount > 0) {
      console.log(`⚠️  Es existieren bereits ${existingCount} Kategorien. Seed wird übersprungen.`)
      console.log('💡 Zum erneuten Seeden, lösche zuerst die Collection: db.finanzen_kategorien.deleteMany({})')
      return
    }
    
    let totalInserted = 0
    
    for (const [typ, kategorien] of Object.entries(KATEGORIEN)) {
      console.log(`\n📁 Füge ${typ}-Kategorien hinzu...`)
      
      for (const [index, kat] of kategorien.entries()) {
        const dokument = {
          name: kat.name,
          typ,
          beschreibung: '',
          farbe: kat.farbe,
          icon: kat.icon,
          steuerrelevant: kat.steuerrelevant,
          aktiv: true,
          sortierung: index,
          erstelltAm: new Date(),
          zuletztGeaendert: new Date()
        }
        
        await collection.insertOne(dokument)
        console.log(`  ✓ ${kat.icon} ${kat.name}`)
        totalInserted++
      }
    }
    
    console.log(`\n✅ ${totalInserted} Finanzen-Kategorien erfolgreich angelegt!`)
    console.log('\n📊 Übersicht:')
    console.log(`   - ${KATEGORIEN.einnahme.length} Einnahme-Kategorien`)
    console.log(`   - ${KATEGORIEN.ausgabe.length} Ausgabe-Kategorien`)
    
  } catch (error) {
    console.error('❌ Fehler beim Seed:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n👋 Verbindung geschlossen')
  }
}

seed()

