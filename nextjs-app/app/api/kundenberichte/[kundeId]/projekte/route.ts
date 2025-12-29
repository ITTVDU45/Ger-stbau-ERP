import { NextResponse, NextRequest } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kundeId: string }> }
) {
  try {
    const { kundeId } = await params
    
    const db = await getDatabase()
    
    // Projekte haben keinen Zeitfilter, da sie langlebig sind
    const projekte = await db.collection('projekte')
      .find({ kundeId })
      .sort({ erstelltAm: -1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, projekte })
  } catch (error) {
    console.error('Fehler beim Abrufen der Projekte:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Projekte' },
      { status: 500 }
    )
  }
}

