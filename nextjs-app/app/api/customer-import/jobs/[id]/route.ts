import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { ObjectId } from 'mongodb'
import type { CustomerImportJob } from '@/features/customer-import/types'

// Explizit Node.js Runtime verwenden (wichtig für MongoDB)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Job-Status abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Job-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

    const job = await jobsCollection.findOne({ _id: new ObjectId(id) })

    if (!job) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Job nicht gefunden' },
        { status: 404 }
      )
    }

    // Normalisiere Response: Sowohl _id als auch jobId für Kompatibilität
    const jobId = job._id.toString()
    
    return NextResponse.json({
      erfolg: true,
      job: {
        ...job,
        _id: jobId,
        jobId: jobId  // Für Kompatibilität mit Frontend
      }
    })

  } catch (error) {
    console.error('Fehler beim Abrufen des Job-Status:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen des Job-Status' },
      { status: 500 }
    )
  }
}

// DELETE: Job löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Job-ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

    const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Job nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      message: 'Job erfolgreich gelöscht'
    })

  } catch (error) {
    console.error('Fehler beim Löschen des Jobs:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen des Jobs' },
      { status: 500 }
    )
  }
}

