import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest'
import { getDatabase } from '@/lib/db/client'

// GET: Nutzer-Details abrufen
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)

    if (!user || user.rolle !== 'admin') {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Nutzer-ID fehlt' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection('users')
    const faelleCollection = db.collection('faelle')

    // Nutzer abrufen
    const nutzer = await usersCollection.findOne({ _id: id })

    if (!nutzer) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Nutzer nicht gefunden' },
        { status: 404 }
      )
    }

    // Anzahl zugewiesener Fälle
    const casesAssigned = await faelleCollection.countDocuments({
      $or: [
        { erstelltVon: id },
        { zugewiesenAn: id }
      ]
    })

    // Nutzer-Daten mit Fallanzahl
    const nutzerDetails = {
      ...nutzer,
      casesAssigned
    }

    return NextResponse.json({
      erfolg: true,
      nutzer: nutzerDetails
    })

  } catch (error: any) {
    console.error('[api/admin/nutzer/[id] GET] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

