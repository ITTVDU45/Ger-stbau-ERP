import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { User, Invitation, UserRole, UserStatus } from '@/lib/db/types'
import { requireRole } from '@/lib/auth/rbac'
import { logUserInvited } from '@/lib/auth/audit'
import { sendInviteEmail } from '@/lib/email/emailService'
import crypto from 'crypto'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    // RBAC: Check if user has permission to invite
    const actor = await requireRole([UserRole.SUPERADMIN, UserRole.ADMIN])
    
    const { email, firstName, lastName, role } = await request.json()
    
    // Validation
    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Alle Felder sind erforderlich' },
        { status: 400 }
      )
    }
    
    // Role validation
    if (role === UserRole.SUPERADMIN) {
      // Only SUPERADMIN can invite SUPERADMIN
      if (actor.role !== UserRole.SUPERADMIN) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Sie können keine Superadmins einladen' },
          { status: 403 }
        )
      }
    }
    
    if (role === UserRole.ADMIN && actor.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Nur Superadmins können Admins einladen' },
        { status: 403 }
      )
    }
    
    const db = await getDatabase()
    
    // Check if user already exists
    const existingUser = await db.collection<User>('users').findOne({
      email: email.toLowerCase()
    })
    
    if (existingUser && existingUser.status === UserStatus.ACTIVE) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ein Benutzer mit dieser E-Mail existiert bereits' },
        { status: 400 }
      )
    }
    
    // Generate random token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    
    // Create or update user
    const userId = existingUser?._id || new ObjectId()
    await db.collection<User>('users').updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          email: email.toLowerCase(),
          firstName,
          lastName,
          role,
          status: UserStatus.INVITED,
          updatedAt: new Date(),
          createdByUserId: new ObjectId(actor.userId)
        },
        $setOnInsert: {
          _id: userId,
          passwordHash: null,
          emailVerifiedAt: null,
          lastLoginAt: null,
          createdAt: new Date()
        }
      },
      { upsert: true }
    )
    
    // Create invitation
    const invitation: Invitation = {
      email: email.toLowerCase(),
      role,
      firstName,
      lastName,
      tokenHash,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      usedAt: null,
      invitedByUserId: new ObjectId(actor.userId),
      createdAt: new Date()
    }
    
    await db.collection<Invitation>('invitations').insertOne(invitation)
    
    // Send email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token=${rawToken}`
    await sendInviteEmail(email, firstName, inviteLink)
    
    // Audit log
    await logUserInvited(new ObjectId(actor.userId), email, role)
    
    return NextResponse.json({
      erfolg: true,
      nachricht: 'Einladung erfolgreich versendet',
      userId
    })
  } catch (error) {
    console.error('Invite error:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Nicht autorisiert' },
        { status: 401 }
      )
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Zugriff verweigert' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { erfolg: false, fehler: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

