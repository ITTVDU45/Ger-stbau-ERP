/**
 * Prüft die Daten in der MongoDB
 */
const { MongoClient } = require('mongodb')
require('dotenv').config()

async function checkDatabase() {
  const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI
  const dbNameFromUri = MONGODB_URI.split('/').pop()?.split('?')[0]
  const MONGODB_DB = process.env.MONGODB_DB || dbNameFromUri || 'rechtly'

  console.log('🔍 Überprüfe Datenbank:', MONGODB_DB)
  console.log('📡 URI:', MONGODB_URI.replace(/:[^:@]+@/, ':***@'), '\n')

  let client
  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    const db = client.db(MONGODB_DB)

    // Hole alle Fälle
    const faelleCollection = db.collection('faelle')
    const faelle = await faelleCollection.find().toArray()

    console.log(`📊 Anzahl Fälle in DB: ${faelle.length}\n`)

    if (faelle.length === 0) {
      console.log('⚠️  Keine Fälle gefunden!')
      console.log('💡 Tipp: Erstelle einen Fall im Gutachter-Portal\n')
      return
    }

    // Zeige jeden Fall mit Sicherheitsfeldern
    faelle.forEach((fall, index) => {
      console.log(`\n📁 Fall ${index + 1}:`)
      console.log('   ├─ _id:', fall._id?.toString() || 'N/A')
      console.log('   ├─ Fallname:', fall.fallname || 'N/A')
      console.log('   ├─ Status:', fall.status || 'N/A')
      console.log('   │')
      console.log('   ├─ 👤 erstelltVon:', fall.erstelltVon || '❌ NICHT GESETZT')
      console.log('   ├─ 🎭 erstelltVonRolle:', fall.erstelltVonRolle || '❌ NICHT GESETZT')
      console.log('   ├─ 👨‍💼 zugewiesenAn:', fall.zugewiesenAn || '❌ NICHT GESETZT')
      console.log('   │')
      console.log('   ├─ 👁️  sichtbarFuerAdmin:', fall.sichtbarFuerAdmin !== undefined ? fall.sichtbarFuerAdmin : '❌ NICHT GESETZT')
      console.log('   ├─ 👁️  sichtbarFuerGutachter:', fall.sichtbarFuerGutachter !== undefined ? fall.sichtbarFuerGutachter : '❌ NICHT GESETZT')
      console.log('   │')
      console.log('   ├─ 📅 erstelltAm:', fall.erstelltAm ? new Date(fall.erstelltAm).toLocaleString('de-DE') : 'N/A')
      console.log('   └─ 📅 zuletztGeaendert:', fall.zuletztGeaendert ? new Date(fall.zuletztGeaendert).toLocaleString('de-DE') : 'N/A')
    })

    console.log('\n' + '='.repeat(60))
    
    // Statistik
    const mitUserTracking = faelle.filter(f => f.erstelltVon && f.erstelltVonRolle).length
    const mitZuweisung = faelle.filter(f => f.zugewiesenAn).length
    const mitSichtbarkeit = faelle.filter(f => f.sichtbarFuerAdmin !== undefined).length

    console.log('\n📈 Statistik:')
    console.log(`   ✅ Mit User-Tracking: ${mitUserTracking}/${faelle.length}`)
    console.log(`   ✅ Mit Zuweisung: ${mitZuweisung}/${faelle.length}`)
    console.log(`   ✅ Mit Sichtbarkeits-Flags: ${mitSichtbarkeit}/${faelle.length}`)

    if (mitUserTracking === faelle.length) {
      console.log('\n🎉 PERFEKT! Alle Fälle haben vollständiges User-Tracking!')
    } else {
      console.log('\n⚠️  WARNUNG: Einige Fälle haben fehlendes User-Tracking!')
      console.log('   Dies sind wahrscheinlich alte Test-Daten.')
    }

  } catch (error) {
    console.error('❌ Fehler:', error.message)
  } finally {
    if (client) {
      await client.close()
      console.log('\n✓ Verbindung geschlossen')
    }
  }
}

checkDatabase()
