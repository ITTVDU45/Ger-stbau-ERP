import { cookies } from 'next/headers'
import { verifyJWT, JWTPayload } from './jwt'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

const SESSION_COOKIE_NAME = 'auth_session'

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!token) return null
  
  const payload = await verifyJWT(token)
  if (!payload) return null
  
  // Optional: Check if session is revoked in DB
  const db = await getDatabase()
  const session = await db.collection('sessions').findOne({
    userId: new ObjectId(payload.userId),
    token
  })
  
  if (session && session.expiresAt < new Date()) {
    return null
  }
  
  return payload
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

