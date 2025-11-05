import { cookies } from 'next/headers'
import { UserRole } from './roles'

export async function getSessionUser() {
  const sessionCookie = (await cookies()).get('session')?.value

  if (!sessionCookie) {
    return null
  }

  // Decode Token basierend auf unserem Demo-System
  let role: UserRole
  let id: string
  let name: string
  let gutachterId: string | undefined
  let partnerId: string | undefined

  switch (sessionCookie) {
    case 'admin-token':
      role = 'ADMIN'
      id = 'admin-1'
      name = 'Admin User'
      break
    case 'gutachter-token':
      role = 'GUTACHTER'
      id = 'gutachter-1'
      name = 'Max Mustermann'
      gutachterId = 'g-123'
      break
    case 'partner-token':
      role = 'PARTNER'
      id = 'partner-1'
      name = 'Partner Schmidt'
      partnerId = 'p-456'
      break
    default:
      return null
  }

  return {
    id,
    role,
    name,
    gutachterId,
    partnerId
  }
}

// Helper für Client-Komponenten
export async function getCurrentUser() {
  // Client-side - würde normalerweise über Context kommen
  // Für jetzt: Simpler Hook
  return getSessionUser()
}
