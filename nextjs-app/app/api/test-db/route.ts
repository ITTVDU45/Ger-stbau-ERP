import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

/**
 * Test-Route für MongoDB-Verbindung
 * GET /api/test-db
 */
export async function GET() {
  try {
    console.log('🔍 Testing MongoDB connection...')
    
    const db = await getDatabase()
    
    // Teste Verbindung mit einem einfachen Ping
    const collections = await db.listCollections().toArray()
    
    // Zähle Dokumente in faelle Collection
    const faelleCollection = db.collection('faelle')
    const faelleCount = await faelleCollection.countDocuments()
    
    console.log('✅ MongoDB connected successfully')
    console.log(`📊 Collections: ${collections.map(c => c.name).join(', ')}`)
    console.log(`📁 Fälle in DB: ${faelleCount}`)
    
    return NextResponse.json({
      erfolg: true,
      nachricht: 'MongoDB-Verbindung erfolgreich',
      datenbank: db.databaseName,
      collections: collections.map(c => c.name),
      faelleCount,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ MongoDB connection failed:', error)
    
    return NextResponse.json({
      erfolg: false,
      nachricht: 'MongoDB-Verbindung fehlgeschlagen',
      fehler: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

