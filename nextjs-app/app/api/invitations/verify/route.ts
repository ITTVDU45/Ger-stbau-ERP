import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Invitation } from '@/lib/db/types'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Token fehlt' },
        { status: 400 }
      )
    }
    
    // Hash token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    
    const db = await getDatabase()
    const invitation = await db.collection<Invitation>('invitations').findOne({
      tokenHash,
      usedAt: null
    })
    
    if (!invitation) {
      return NextResponse.json({
        erfolg: false,
        valid: false,
        fehler: 'Ungültiger oder bereits verwendeter Token'
      })
    }
    
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({
        erfolg: false,
        valid: false,
        fehler: 'Token ist abgelaufen'
      })
    }
    
    return NextResponse.json({
      erfolg: true,
      valid: true,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role
    })
  } catch (error) {
    console.error('Verify token error:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

