import { NextResponse } from 'next/server'
import { clearSessionCookie, getSession } from '@/lib/auth/session'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

export async function POST() {
  try {
    const session = await getSession()
    
    if (session) {
      // Revoke session in DB
      const db = await getDatabase()
      await db.collection('sessions').deleteMany({
        userId: new ObjectId(session.userId)
      })
    }
    
    await clearSessionCookie()
    
    return NextResponse.json({ erfolg: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Logout fehlgeschlagen' },
      { status: 500 }
    )
  }
}

