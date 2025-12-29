import { getDatabase } from '@/lib/db/client'
import { AuditLog } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { headers } from 'next/headers'

export async function createAuditLog(log: Omit<AuditLog, '_id' | 'createdAt' | 'ip' | 'userAgent'>) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'
  
  const db = await getDatabase()
  await db.collection<AuditLog>('audit_logs').insertOne({
    ...log,
    ip,
    userAgent,
    createdAt: new Date()
  })
}

// Helper functions
export async function logUserInvited(
  actorUserId: ObjectId,
  targetEmail: string,
  role: string
) {
  await createAuditLog({
    actorUserId,
    action: 'USER_INVITED',
    targetEmail,
    metadata: { role }
  })
}

export async function logPasswordSet(userId: ObjectId, email: string) {
  await createAuditLog({
    actorUserId: userId,
    action: 'PASSWORD_SET',
    targetUserId: userId,
    targetEmail: email
  })
}

export async function logLoginSuccess(userId: ObjectId, email: string) {
  await createAuditLog({
    actorUserId: userId,
    action: 'LOGIN_SUCCESS',
    targetEmail: email
  })
}

export async function logLoginFailed(email: string, reason: string) {
  await createAuditLog({
    actorUserId: null,
    action: 'LOGIN_FAILED',
    targetEmail: email,
    metadata: { reason }
  })
}

