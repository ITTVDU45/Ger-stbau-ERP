import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export async function GET() {
  try {
    const db = await getDatabase()
    
    // Zähle Benutzer
    const userCount = await db.collection('users').countDocuments()
    const mitarbeiterCount = await db.collection('mitarbeiter').countDocuments()
    
    // Hole ersten Superadmin
    const superadmin = await db.collection('users').findOne({ role: 'SUPERADMIN' })
    
    return NextResponse.json({
      erfolg: true,
      datenbank: db.databaseName,
      benutzer: userCount,
      mitarbeiter: mitarbeiterCount,
      superadmin: superadmin ? {
        email: superadmin.email,
        name: `${superadmin.firstName} ${superadmin.lastName}`,
        hasPassword: !!superadmin.passwordHash
      } : null,
      env: {
        mongoUri: process.env.MONGO_URI ? 'gesetzt' : 'FEHLT',
        mongodbDb: process.env.MONGODB_DB || 'nicht gesetzt'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      erfolg: false,
      fehler: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
