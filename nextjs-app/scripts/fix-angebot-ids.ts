/**
 * Migrations-Script: Repariert angebotId in allen Projekten
 * 
 * Problem: Alte Projekte haben angebotId als String statt ObjectId gespeichert
 * Lösung: Konvertiert alle angebotId-Felder zu ObjectId
 * 
 * Usage: npx tsx scripts/fix-angebot-ids.ts
 */

import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = process.env.MONGODB_DB_NAME || 'erp_system'

async function fixAngebotIds() {
  console.log('🔧 Starte Migration: Repariere angebotId in allen Projekten...\n')
  
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✓ Verbunden mit MongoDB\n')
    
    const db = client.db(DB_NAME)
    const projekteCollection = db.collection('projekte')
    
    // Finde alle Projekte mit angebotsnummer (aber möglicherweise falscher angebotId)
    const projekteWithAngebote = await projekteCollection.find({
      angebotsnummer: { $exists: true, $ne: null }
    }).toArray()
    
    console.log(`📊 Gefunden: ${projekteWithAngebote.length} Projekte mit Angeboten\n`)
    
    let fixed = 0
    let skipped = 0
    let errors = 0
    
    for (const projekt of projekteWithAngebote) {
      const projektId = projekt._id.toString()
      const angebotsnummer = projekt.angebotsnummer
      
      console.log(`\n🔍 Projekt: ${projekt.projektnummer} (${projektId})`)
      console.log(`   Angebotsnummer: ${angebotsnummer}`)
      console.log(`   Aktuelle angebotId: ${projekt.angebotId}`)
      
      // Finde das zugehörige Angebot
      const angebot = await db.collection('angebote').findOne({
        angebotsnummer: angebotsnummer
      })
      
      if (!angebot) {
        console.log(`   ❌ Angebot ${angebotsnummer} nicht gefunden in DB!`)
        errors++
        continue
      }
      
      const correctAngebotId = angebot._id
      console.log(`   ✓ Angebot gefunden: ${correctAngebotId}`)
      
      // Prüfe ob angebotId bereits korrekt ist
      const currentAngebotId = projekt.angebotId
      
      if (currentAngebotId && 
          currentAngebotId instanceof ObjectId && 
          currentAngebotId.equals(correctAngebotId)) {
        console.log(`   ⏭️  angebotId ist bereits korrekt - überspringe`)
        skipped++
        continue
      }
      
      // Update: Setze angebotId als ObjectId
      const updateResult = await projekteCollection.updateOne(
        { _id: projekt._id },
        {
          $set: {
            angebotId: correctAngebotId, // Als ObjectId!
            budget: angebot.netto || 0,
            angebotssumme: angebot.brutto || 0,
            zuletztGeaendert: new Date()
          }
        }
      )
      
      if (updateResult.modifiedCount > 0) {
        console.log(`   ✅ REPARIERT: angebotId gesetzt auf ${correctAngebotId}`)
        console.log(`   ✅ Budget: ${angebot.netto}, Angebotssumme: ${angebot.brutto}`)
        fixed++
      } else {
        console.log(`   ⚠️  Keine Änderung nötig oder Update fehlgeschlagen`)
        skipped++
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📋 ZUSAMMENFASSUNG:')
    console.log('='.repeat(60))
    console.log(`✅ Repariert:     ${fixed} Projekte`)
    console.log(`⏭️  Übersprungen:  ${skipped} Projekte`)
    console.log(`❌ Fehler:        ${errors} Projekte`)
    console.log('='.repeat(60))
    
    if (fixed > 0) {
      console.log('\n✨ Migration erfolgreich! Bitte laden Sie die Projekte im Browser neu (F5)')
    }
    
  } catch (error) {
    console.error('\n❌ Fehler bei Migration:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n✓ Verbindung geschlossen')
  }
}

// Script ausführen
fixAngebotIds()
  .then(() => {
    console.log('\n✅ Migration abgeschlossen')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration fehlgeschlagen:', error)
    process.exit(1)
  })

