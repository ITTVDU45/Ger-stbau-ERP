import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Invitation, User, UserRole } from '@/lib/db/types'
import { requireRole } from '@/lib/auth/rbac'

export async function GET(request: NextRequest) {
  try {
    // Nur SUPERADMIN und ADMIN dürfen Einladungen sehen
    await requireRole([UserRole.SUPERADMIN, UserRole.ADMIN])

    const db = await getDatabase()
    const invitationsCollection = db.collection<Invitation>('invitations')
    const usersCollection = db.collection<User>('users')

    // Hole alle Einladungen (sortiert nach Erstellungsdatum, neueste zuerst)
    const invitations = await invitationsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(50) // Limitiere auf die letzten 50 Einladungen
      .toArray()

    // Formatiere für Frontend
    const formattedInvitations = invitations.map(inv => {
      let status = 'ausstehend'
      let statusLabel = 'Ausstehend'
      
      if (inv.usedAt) {
        status = 'angenommen'
        statusLabel = 'Angenommen'
      } else if (new Date(inv.expiresAt) < new Date()) {
        status = 'abgelaufen'
        statusLabel = 'Abgelaufen'
      }

      return {
        id: inv._id?.toHexString(),
        email: inv.email,
        firstName: inv.firstName,
        lastName: inv.lastName,
        role: inv.role,
        sentAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt.toISOString(),
        usedAt: inv.usedAt?.toISOString() || null,
        status,
        statusLabel
      }
    })

    // Hole auch alle aktiven Benutzer für zusätzliche Info
    const users = await usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    const formattedUsers = users.map(user => ({
      id: user._id?.toHexString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null
    }))

    return NextResponse.json({
      erfolg: true,
      invitations: formattedInvitations,
      users: formattedUsers
    })
  } catch (error: any) {
    console.error('Fehler beim Laden der Einladungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Fehler beim Laden der Einladungen' },
      { status: 500 }
    )
  }
}

