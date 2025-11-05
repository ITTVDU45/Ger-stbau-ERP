/**
 * Extrahiert User-Informationen aus dem Request
 * In Produktion: JWT Token validieren oder Session prüfen
 */

export interface AuthUser {
  id: string
  email: string
  vorname: string
  nachname: string
  rolle: 'admin' | 'gutachter' | 'partner'
  gutachterNummer?: string // Für Gutachter
}

/**
 * Holt den aktuell eingeloggten User
 * WICHTIG: In Produktion JWT Token validieren!
 */
export async function getUserFromRequest(request: Request): Promise<AuthUser> {
  try {
    // Lese Session-Cookie
    const cookieHeader = request.headers.get('cookie')
    let sessionToken: string | undefined
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim())
      const sessionCookie = cookies.find(c => c.startsWith('session='))
      if (sessionCookie) {
        sessionToken = sessionCookie.split('=')[1]
      }
    }
    
    // Parse Session basierend auf Token
    if (sessionToken === 'admin-token') {
      return {
        id: 'admin-1',
        email: 'admin@rechtly.de',
        vorname: 'Admin',
        nachname: 'User',
        rolle: 'admin'
      }
    } else if (sessionToken === 'gutachter-token') {
      return {
        id: 'gutachter-1',
        email: 'gutachter@rechtly.de',
        vorname: 'Max',
        nachname: 'Mustermann',
        rolle: 'gutachter',
        gutachterNummer: 'GUT-001'
      }
    } else if (sessionToken === 'partner-token') {
      return {
        id: 'partner-1',
        email: 'partner@rechtly.de',
        vorname: 'Partner',
        nachname: 'Schmidt',
        rolle: 'partner'
      }
    }
    
    // Fallback: Gutachter (für Development)
    return {
      id: 'gutachter-1',
      email: 'gutachter@rechtly.de',
      vorname: 'Max',
      nachname: 'Mustermann',
      rolle: 'gutachter',
      gutachterNummer: 'GUT-001'
    }
  } catch (error) {
    console.error('Error getting user from request:', error)
    // Fallback
    return {
      id: 'gutachter-1',
      email: 'gutachter@rechtly.de',
      vorname: 'Max',
      nachname: 'Mustermann',
      rolle: 'gutachter',
      gutachterNummer: 'GUT-001'
    }
  }
}

/**
 * Prüft, ob der User die erforderliche Rolle hat
 */
export function hasRole(user: AuthUser | null, allowedRoles: ('admin' | 'gutachter' | 'partner')[]): boolean {
  if (!user) return false
  return allowedRoles.includes(user.rolle)
}

/**
 * Middleware-Helper: Unauthorized Response
 */
export function unauthorized(message: string = 'Nicht autorisiert') {
  return new Response(JSON.stringify({
    erfolg: false,
    nachricht: message
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Middleware-Helper: Forbidden Response
 */
export function forbidden(message: string = 'Zugriff verweigert') {
  return new Response(JSON.stringify({
    erfolg: false,
    nachricht: message
  }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  })
}

