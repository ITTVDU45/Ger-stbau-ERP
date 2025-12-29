import { UserRole } from '@/lib/db/types'
import { getSession } from './session'

export async function requireRole(allowedRoles: UserRole[]): Promise<{
  userId: string
  email: string
  role: UserRole
}> {
  const session = await getSession()
  
  if (!session) {
    throw new Error('Unauthorized: No session')
  }
  
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Forbidden: Required roles: ${allowedRoles.join(', ')}`)
  }
  
  return {
    userId: session.userId,
    email: session.email,
    role: session.role
  }
}

export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const session = await getSession()
  return session?.role === requiredRole
}

export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const session = await getSession()
  return session ? roles.includes(session.role) : false
}

// Specific guards
export const requireSuperadmin = () => requireRole([UserRole.SUPERADMIN])
export const requireAdmin = () => requireRole([UserRole.SUPERADMIN, UserRole.ADMIN])
export const requireEmployee = () => requireRole([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.EMPLOYEE])

