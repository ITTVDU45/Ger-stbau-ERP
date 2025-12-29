import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { User, UserStatus } from '@/lib/db/types'
import { verifyPassword } from '@/lib/auth/password'
import { createJWT } from '@/lib/auth/jwt'
import { setSessionCookie } from '@/lib/auth/session'
import { logLoginSuccess, logLoginFailed } from '@/lib/auth/audit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    
    const { email, password } = await request.json()
    
    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { erfolg: false, fehler: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const user = await db.collection<User>('users').findOne({
      email: email.toLowerCase()
    })
    
    // Anti-enumeration: Same error message for wrong email or password
    if (!user || !user.passwordHash) {
      await logLoginFailed(email, 'Invalid credentials')
      return NextResponse.json(
        { erfolg: false, fehler: 'E-Mail oder Passwort falsch' },
        { status: 401 }
      )
    }
    
    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      await logLoginFailed(email, `Status: ${user.status}`)
      return NextResponse.json(
        { erfolg: false, fehler: 'Ihr Konto ist nicht aktiv. Bitte kontaktieren Sie den Administrator.' },
        { status: 403 }
      )
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      await logLoginFailed(email, 'Invalid password')
      return NextResponse.json(
        { erfolg: false, fehler: 'E-Mail oder Passwort falsch' },
        { status: 401 }
      )
    }
    
    // Create JWT
    const token = await createJWT(user._id!, user.email, user.role)
    
    // Store session in DB (for revocation capability)
    await db.collection('sessions').insertOne({
      userId: user._id!,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      ip,
      userAgent: request.headers.get('user-agent') || undefined
    })
    
    // Update last login
    await db.collection<User>('users').updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    )
    
    // Set cookie
    await setSessionCookie(token)
    
    // Audit log
    await logLoginSuccess(user._id!, user.email)
    
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
    console.error('Login error:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

