import { SignJWT, jwtVerify } from 'jose'
import { ObjectId } from 'mongodb'
import { UserRole } from '@/lib/db/types'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION'
)

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

export async function createJWT(
  userId: ObjectId,
  email: string,
  role: UserRole
): Promise<string> {
  const token = await new SignJWT({
    userId: userId.toString(),
    email,
    role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
  
  return token
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, SECRET)
    return verified.payload as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

