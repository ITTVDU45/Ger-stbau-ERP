import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Invitation, UserRole } from '@/lib/db/types'
import { requireRole } from '@/lib/auth/rbac'
import { sendInviteEmail } from '@/lib/email/emailService'
import crypto from 'crypto'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    // Nur SUPERADMIN und ADMIN dürfen Einladungen erneut senden
    const session = await requireRole([UserRole.SUPERADMIN, UserRole.ADMIN])

    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Einladungs-ID fehlt.' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const invitationsCollection = db.collection<Invitation>('invitations')

    // Hole die alte Einladung
    const oldInvitation = await invitationsCollection.findOne({
      _id: new ObjectId(invitationId)
    })

    if (!oldInvitation) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Einladung nicht gefunden.' },
        { status: 404 }
      )
    }

    // Prüfe ob die Einladung bereits verwendet wurde
    if (oldInvitation.usedAt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Diese Einladung wurde bereits angenommen.' },
        { status: 400 }
      )
    }

    // Generiere neuen Token
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 Tage

    // Aktualisiere die Einladung mit neuem Token und Ablaufdatum
    await invitationsCollection.updateOne(
      { _id: new ObjectId(invitationId) },
      {
        $set: {
          tokenHash,
          expiresAt,
          createdAt: new Date() // Aktualisiere auch das Sendedatum
        }
      }
    )

    // Sende E-Mail erneut
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token=${token}`
    await sendInviteEmail(
      oldInvitation.email,
      oldInvitation.firstName,
      inviteLink
    )

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Einladung wurde erneut versendet.'
    })
  } catch (error: any) {
    console.error('Fehler beim erneuten Senden der Einladung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Fehler beim erneuten Senden der Einladung' },
      { status: 500 }
    )
  }
}

