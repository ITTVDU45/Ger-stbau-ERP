import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// DELETE - Urlaubsantrag löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const urlaubCollection = db.collection('urlaub')
    
    const result = await urlaubCollection.deleteOne({ 
      _id: new ObjectId(id) 
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Urlaubsantrag nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      erfolg: true,
      message: 'Urlaubsantrag erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Löschen' },
      { status: 500 }
    )
  }
}

