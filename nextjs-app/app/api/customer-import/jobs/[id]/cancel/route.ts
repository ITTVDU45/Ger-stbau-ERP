import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * POST /api/customer-import/jobs/[id]/cancel
 * Bricht einen laufenden Import-Job ab
 */
export async function POST(
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
    const jobsCollection = db.collection('customer_import_jobs')

    const job = await jobsCollection.findOne({ _id: new ObjectId(id) })

    if (!job) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Job nicht gefunden' },
        { status: 404 }
      )
    }

    // Nur Jobs im Status 'queued' oder 'running' können abgebrochen werden
    if (job.status !== 'queued' && job.status !== 'running') {
      return NextResponse.json(
        { erfolg: false, fehler: `Job kann nicht abgebrochen werden (Status: ${job.status})` },
        { status: 400 }
      )
    }

    // Job auf 'cancelled' setzen
    await jobsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'cancelled',
          error: 'Vom Benutzer abgebrochen',
          updatedAt: new Date(),
          completedAt: new Date()
        }
      }
    )

    console.log(`✅ Job ${id} wurde abgebrochen`)

    return NextResponse.json({
      erfolg: true,
      message: 'Job erfolgreich abgebrochen'
    })

  } catch (error) {
    console.error('Fehler beim Abbrechen des Jobs:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abbrechen des Jobs' },
      { status: 500 }
    )
  }
}

