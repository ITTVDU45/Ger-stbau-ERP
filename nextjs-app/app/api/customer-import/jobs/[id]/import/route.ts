import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { ObjectId } from 'mongodb'
import type { CustomerImportJob } from '@/features/customer-import/types'
import type { Kunde } from '@/lib/db/types'

// Explizit Node.js Runtime verwenden (wichtig für MongoDB)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Ausgewählte Kunden importieren
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('📥 POST /api/customer-import/jobs/[id]/import aufgerufen')
    const { id } = await params
    console.log('📦 Job-ID:', id)
    
    const body = await request.json()
    console.log('📦 Body:', JSON.stringify(body, null, 2))
    
    const { selectedIds }: { selectedIds: string[] } = body
    console.log('📋 Ausgewählte IDs:', selectedIds)
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Job-ID' },
        { status: 400 }
      )
    }

    if (!selectedIds || selectedIds.length === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Kunden ausgewählt' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')
    const kundenCollection = db.collection<Kunde>('kunden')

    // Job abrufen
    const job = await jobsCollection.findOne({ _id: new ObjectId(id) })

    if (!job) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Job nicht gefunden' },
        { status: 404 }
      )
    }

    // Ausgewählte Ergebnisse filtern
    const selectedResults = job.results.filter(r => selectedIds.includes(r.id))

    if (selectedResults.length === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine gültigen Ergebnisse gefunden' },
        { status: 400 }
      )
    }

    // Kunden erstellen
    const createdCustomers: Kunde[] = []
    const errors: string[] = []

    for (const result of selectedResults) {
      try {
        // Duplikat-Check
        const existing = await kundenCollection.findOne({ 
          $or: [
            { firma: result.firmenname },
            { email: result.email },
            { telefon: result.telefon }
          ]
        })

        if (existing) {
          errors.push(`${result.firmenname}: Kunde existiert bereits`)
          continue
        }

        // Kundennummer generieren
        const count = await kundenCollection.countDocuments()
        const kundennummer = `K${(count + 1).toString().padStart(5, '0')}`

        // Kunde erstellen
        const newKunde: Omit<Kunde, '_id'> = {
          kundennummer,
          firma: result.firmenname,
          kundentyp: 'gewerblich',
          anrede: 'Firma',
          vorname: '',
          nachname: '',
          email: result.email,
          telefon: result.telefon,
          adresse: result.adresse,
          notizen: `Importiert via KI-Assistent (Job: ${id})\nBranche: ${result.branche || '-'}`,
          aktiv: false, // Immer inaktiv beim Import
          erstelltAm: new Date(),
          zuletztGeaendert: new Date(),
          source: 'ai_import',
          sourceMeta: {
            jobId: id,
            externalId: result.externalId
          }
        }

        const insertResult = await kundenCollection.insertOne(newKunde as any)
        console.log(`✅ Kunde angelegt: ${newKunde.firma} (${kundennummer})`)
        
        createdCustomers.push({
          ...newKunde,
          _id: insertResult.insertedId.toString()
        } as Kunde)

      } catch (error) {
        console.error(`Fehler beim Importieren von ${result.firmenname}:`, error)
        errors.push(`${result.firmenname}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
      }
    }

    console.log(`✅ Import abgeschlossen: ${createdCustomers.length} Kunden angelegt`)
    if (errors.length > 0) {
      console.log('⚠️ Fehler:', errors)
    }

    return NextResponse.json({
      erfolg: createdCustomers.length > 0,
      importedCount: createdCustomers.length,
      createdCustomers,
      errors: errors.length > 0 ? errors : undefined
    }, { status: createdCustomers.length > 0 ? 200 : 400 })

  } catch (error) {
    console.error('Fehler beim Importieren der Kunden:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Importieren der Kunden', errors: [error instanceof Error ? error.message : 'Unbekannter Fehler'] },
      { status: 500 }
    )
  }
}

