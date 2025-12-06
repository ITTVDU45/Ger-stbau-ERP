import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Projekt, Angebot } from '@/lib/db/types'

/**
 * POST /api/admin/fix-angebot-ids
 * 
 * Migrations-Endpoint: Repariert angebotId in allen Projekten
 * Konvertiert String-IDs zu ObjectId
 */
export async function POST() {
  try {
    console.log('🔧 Starte Migration: Repariere angebotId in allen Projekten...\n')
    
    const db = await getDatabase()
    const projekteCollection = db.collection<Projekt>('projekte')
    const angeboteCollection = db.collection<Angebot>('angebote')
    
    // Finde alle Projekte mit angebotsnummer
    const projekteWithAngebote = await projekteCollection.find({
      angebotsnummer: { $exists: true, $ne: null }
    }).toArray()
    
    console.log(`📊 Gefunden: ${projekteWithAngebote.length} Projekte mit Angeboten\n`)
    
    const results = {
      total: projekteWithAngebote.length,
      fixed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    }
    
    for (const projekt of projekteWithAngebote) {
      const projektId = projekt._id.toString()
      const angebotsnummer = projekt.angebotsnummer
      
      const detail: any = {
        projektId,
        projektnummer: projekt.projektnummer,
        angebotsnummer,
        currentAngebotId: projekt.angebotId?.toString() || 'undefined',
        status: ''
      }
      
      console.log(`\n🔍 Projekt: ${projekt.projektnummer} (${projektId})`)
      console.log(`   Angebotsnummer: ${angebotsnummer}`)
      console.log(`   Aktuelle angebotId: ${projekt.angebotId}`)
      
      // Finde das zugehörige Angebot
      const angebot = await angeboteCollection.findOne({
        angebotsnummer: angebotsnummer
      })
      
      if (!angebot) {
        console.log(`   ❌ Angebot ${angebotsnummer} nicht gefunden in DB!`)
        detail.status = 'error'
        detail.message = `Angebot ${angebotsnummer} nicht gefunden`
        results.errors++
        results.details.push(detail)
        continue
      }
      
      const correctAngebotId = angebot._id
      detail.correctAngebotId = correctAngebotId.toString()
      console.log(`   ✓ Angebot gefunden: ${correctAngebotId}`)
      
      // Prüfe ob angebotId bereits korrekt ist
      const currentAngebotId = projekt.angebotId
      
      if (currentAngebotId && 
          currentAngebotId instanceof ObjectId && 
          currentAngebotId.equals(correctAngebotId)) {
        console.log(`   ⏭️  angebotId ist bereits korrekt - überspringe`)
        detail.status = 'skipped'
        detail.message = 'angebotId ist bereits korrekt'
        results.skipped++
        results.details.push(detail)
        continue
      }
      
      // Update: Setze angebotId als ObjectId
      const updateResult = await projekteCollection.updateOne(
        { _id: new ObjectId(projektId) },
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
        detail.status = 'fixed'
        detail.message = `angebotId repariert (Budget: ${angebot.netto}, Summe: ${angebot.brutto})`
        detail.budget = angebot.netto
        detail.angebotssumme = angebot.brutto
        results.fixed++
        results.details.push(detail)
      } else {
        console.log(`   ⚠️  Keine Änderung nötig`)
        detail.status = 'skipped'
        detail.message = 'Keine Änderung nötig'
        results.skipped++
        results.details.push(detail)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📋 ZUSAMMENFASSUNG:')
    console.log('='.repeat(60))
    console.log(`✅ Repariert:     ${results.fixed} Projekte`)
    console.log(`⏭️  Übersprungen:  ${results.skipped} Projekte`)
    console.log(`❌ Fehler:        ${results.errors} Projekte`)
    console.log('='.repeat(60))
    
    return NextResponse.json({
      erfolg: true,
      nachricht: `Migration abgeschlossen: ${results.fixed} Projekte repariert`,
      results
    })
    
  } catch (error) {
    console.error('❌ Fehler bei Migration:', error)
    return NextResponse.json(
      { 
        erfolg: false, 
        fehler: 'Fehler bei Migration', 
        details: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    )
  }
}

