import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import type { AiImportParams, CustomerImportJob } from '@/features/customer-import/types'

// Explizit Node.js Runtime verwenden (wichtig für MongoDB)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Job erstellen
export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/customer-import/jobs aufgerufen')
    const body: AiImportParams = await request.json()
    console.log('📦 Body erhalten:', JSON.stringify(body, null, 2))
    
    // Validierung
    if (!body.branche || !body.standort) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Branche und Standort sind erforderlich' },
        { status: 400 }
      )
    }

    // Kosten-Guard: Max 1000 Ergebnisse
    if (body.anzahlErgebnisse > 1000) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Maximale Anzahl: 1000 Ergebnisse' },
        { status: 400 }
      )
    }

    console.log('🔌 Verbinde mit Datenbank...')
    const db = await getDatabase()
    console.log('✅ Datenbankverbindung erfolgreich')
    
    const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

    // Job-Dokument erstellen
    const newJob: Omit<CustomerImportJob, '_id'> = {
      status: 'queued',
      params: body,
      progress: {
        current: 0,
        total: body.anzahlErgebnisse,
        phase: 'searching'
      },
      results: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    console.log('💾 Speichere Job in MongoDB...')
    const result = await jobsCollection.insertOne(newJob as any)
    const jobId = result.insertedId.toString()
    console.log(`✅ Job ${jobId} erfolgreich gespeichert - Branche: ${body.branche}, Standort: ${body.standort}`)
    
    // Verifiziere dass der Job gespeichert wurde
    const verifyJob = await jobsCollection.findOne({ _id: result.insertedId })
    if (!verifyJob) {
      console.error('❌ WARNUNG: Job wurde nicht in MongoDB gespeichert!')
    } else {
      console.log('✅ Job-Speicherung verifiziert')
    }

    // Python Worker API über HTTP aufrufen (läuft auf separatem Server)
    try {
      const workerApiUrl = process.env.WORKER_API_URL || 'http://localhost:8000'
      console.log(`🚀 Rufe Worker API auf: ${workerApiUrl}/process-job`)
      
      // Trigger Worker API (Fire-and-Forget)
      fetch(`${workerApiUrl}/process-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || '',
          googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log(`✅ Worker API Response:`, data)
      })
      .catch(error => {
        console.error(`⚠️ Worker API Error:`, error.message)
        // Job bleibt in 'queued' Status - kann später manuell verarbeitet werden
      })
      
      console.log(`✅ Worker API Request gesendet für Job ${jobId}`)
    } catch (workerError: any) {
      console.error(`⚠️ Fehler beim Aufruf der Worker API:`, workerError.message)
      // Job bleibt in 'queued' Status
    }

    return NextResponse.json({
      erfolg: true,
      jobId,
      verifiziert: !!verifyJob
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Fehler beim Erstellen des Jobs:', error.message, error.stack)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen des Jobs: ' + error.message },
      { status: 500 }
    )
  }
}

