import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { User, Invitation, UserStatus } from '@/lib/db/types'
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password'
import { createJWT } from '@/lib/auth/jwt'
import { setSessionCookie } from '@/lib/auth/session'
import { logPasswordSet } from '@/lib/auth/audit'
import { generatePersonalnummer } from '@/lib/utils/personalnummer'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    
    const { token, password } = await request.json()
    
    if (!token || !password) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Token und Passwort sind erforderlich' },
        { status: 400 }
      )
    }
    
    // Validate password strength
    const validation = validatePasswordStrength(password)
    if (!validation.valid) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Passwort erfüllt nicht die Anforderungen', errors: validation.errors },
        { status: 400 }
      )
    }
    
    // Hash token to find invitation
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    
    const db = await getDatabase()
    const invitation = await db.collection<Invitation>('invitations').findOne({
      tokenHash,
      usedAt: null
    })
    
    if (!invitation) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültiger oder bereits verwendeter Token' },
        { status: 400 }
      )
    }
    
    // Check expiry
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Token ist abgelaufen' },
        { status: 400 }
      )
    }
    
    // Find user
    const user = await db.collection<User>('users').findOne({
      email: invitation.email.toLowerCase()
    })
    
    if (!user) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Hash password
    const passwordHash = await hashPassword(password)
    
    // Generiere Personalnummer, falls noch keine vorhanden
    let personalnummer = user.profile?.personalnummer
    if (!personalnummer) {
      personalnummer = await generatePersonalnummer()
    }
    
    // Update user
    await db.collection<User>('users').updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
          'profile.personalnummer': personalnummer
        }
      }
    )
    
    // Mark invitation as used
    await db.collection<Invitation>('invitations').updateOne(
      { _id: invitation._id },
      { $set: { usedAt: new Date() } }
    )
    
    // Create session
    const jwtToken = await createJWT(user._id!, user.email, user.role)
    await setSessionCookie(jwtToken)
    
    // Store session in DB
    await db.collection('sessions').insertOne({
      userId: user._id!,
      token: jwtToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      ip,
      userAgent: request.headers.get('user-agent') || undefined
    })
    
    // Audit log
    await logPasswordSet(user._id!, user.email)
    
    return NextResponse.json({
      erfolg: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

