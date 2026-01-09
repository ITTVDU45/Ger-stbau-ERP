/**
 * Script zum Neu-Nummerieren aller Projekte
 * 
 * Dieses Script:
 * 1. Lädt alle Projekte aus der Datenbank
 * 2. Sortiert sie nach Erstellungsdatum
 * 3. Nummeriert sie neu im Format JJ-NNN (z.B. 26-001, 26-002)
 * 4. Aktualisiert die Datenbank
 * 
 * WICHTIG: Vor der Ausführung ein Backup der Datenbank erstellen!
 * 
 * Ausführung:
 * cd nextjs-app && node scripts/renumber-projects.js
 */

require('dotenv').config({ path: '.env.local' })
const { MongoClient } = require('mongodb')

async function renumberProjects() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
  
  if (!uri) {
    console.error('❌ Fehler: MONGODB_URI nicht in .env.local gefunden!')
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    console.log('🔌 Verbinde mit MongoDB...')
    await client.connect()
    
    const db = client.db(process.env.MONGODB_DB || 'geruestbau_erp')
    const projekteCollection = db.collection('projekte')
    
    console.log('📊 Lade alle Projekte...')
    const alleProjekte = await projekteCollection
      .find({})
      .sort({ erstelltAm: 1 })  // Sortiere nach Erstellungsdatum (älteste zuerst)
      .toArray()
    
    console.log(`✅ ${alleProjekte.length} Projekte gefunden\n`)
    
    if (alleProjekte.length === 0) {
      console.log('ℹ️  Keine Projekte zum Neu-Nummerieren vorhanden')
      return
    }
    
    // Gruppiere Projekte nach Jahr
    const projekteNachJahr = {}
    
    alleProjekte.forEach(projekt => {
      const erstelltAm = projekt.erstelltAm ? new Date(projekt.erstelltAm) : new Date()
      const jahr = erstelltAm.getFullYear().toString().slice(-2)
      
      if (!projekteNachJahr[jahr]) {
        projekteNachJahr[jahr] = []
      }
      
      projekteNachJahr[jahr].push(projekt)
    })
    
    console.log('📅 Projekte nach Jahren:')
    Object.keys(projekteNachJahr).sort().forEach(jahr => {
      console.log(`   20${jahr}: ${projekteNachJahr[jahr].length} Projekte`)
    })
    console.log('')
    
    // Neu-Nummerierung durchführen
    console.log('🔄 Starte Neu-Nummerierung...\n')
    
    let gesamtAktualisiert = 0
    const updates = []
    
    for (const [jahr, projekte] of Object.entries(projekteNachJahr).sort()) {
      console.log(`📝 Jahr 20${jahr}:`)
      
      for (let i = 0; i < projekte.length; i++) {
        const projekt = projekte[i]
        const neueNummer = `${jahr}-${String(i + 1).padStart(3, '0')}`
        const alteNummer = projekt.projektnummer
        
        if (alteNummer !== neueNummer) {
          updates.push({
            updateOne: {
              filter: { _id: projekt._id },
              update: {
                $set: {
                  projektnummer: neueNummer,
                  zuletztGeaendert: new Date()
                }
              }
            }
          })
          
          console.log(`   ${alteNummer || '(keine)'} → ${neueNummer} | ${projekt.projektname}`)
          gesamtAktualisiert++
        }
      }
      console.log('')
    }
    
    if (updates.length === 0) {
      console.log('✅ Alle Projektnummern sind bereits korrekt!')
      return
    }
    
    // Bestätigung einholen
    console.log(`⚠️  ${gesamtAktualisiert} Projekte werden aktualisiert`)
    console.log('⏸️  Drücke Ctrl+C zum Abbrechen oder Enter zum Fortfahren...\n')
    
    // Warte auf Bestätigung (nur in interaktivem Modus)
    if (process.stdin.isTTY) {
      await new Promise((resolve) => {
        process.stdin.once('data', resolve)
      })
    }
    
    console.log('💾 Schreibe Updates in die Datenbank...')
    const result = await projekteCollection.bulkWrite(updates)
    
    console.log('\n✅ Neu-Nummerierung abgeschlossen!')
    console.log(`   Aktualisierte Projekte: ${result.modifiedCount}`)
    console.log(`   Fehler: ${result.writeErrors?.length || 0}`)
    
    // Verifikation
    console.log('\n🔍 Verifikation...')
    const verifizierteProjekte = await projekteCollection
      .find({})
      .sort({ projektnummer: 1 })
      .limit(10)
      .toArray()
    
    console.log('   Erste 10 Projektnummern:')
    verifizierteProjekte.forEach(p => {
      console.log(`   - ${p.projektnummer} | ${p.projektname}`)
    })
    
  } catch (error) {
    console.error('\n❌ Fehler:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n👋 Verbindung geschlossen')
  }
}

// Script ausführen
console.log('╔═══════════════════════════════════════════════╗')
console.log('║   PROJEKT NEU-NUMMERIERUNG SCRIPT            ║')
console.log('║   Format: JJ-NNN (z.B. 26-001, 26-002)       ║')
console.log('╚═══════════════════════════════════════════════╝\n')

renumberProjects()
  .then(() => {
    console.log('\n✅ Script erfolgreich beendet')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error)
    process.exit(1)
  })
