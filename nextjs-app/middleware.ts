import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/auth/jwt'
import { UserRole } from '@/lib/db/types'

const PUBLIC_ROUTES = ['/', '/login', '/set-password']
const SUPERADMIN_ROUTES: string[] = [] // Nur für SUPERADMIN reservierte Routen (aktuell keine)
const ADMIN_ROUTES = ['/dashboard', '/projekte', '/finanzen', '/kunden', '/settings/users'] // SUPERADMIN + ADMIN
const EMPLOYEE_ROUTES: string[] = [] // Für alle authentifizierten Benutzer

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith('/api/auth'))) {
    return NextResponse.next()
  }
  
  // Check session
  const token = request.cookies.get('auth_session')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  const session = await verifyJWT(token)
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Superadmin-only routes (nur für SUPERADMIN)
  if (SUPERADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (session.role !== UserRole.SUPERADMIN) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  // Admin routes (SUPERADMIN + ADMIN haben Zugriff)
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (![UserRole.SUPERADMIN, UserRole.ADMIN].includes(session.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  // Employee routes (alle authentifizierten Benutzer haben Zugriff)
  if (EMPLOYEE_ROUTES.some(route => pathname.startsWith(route))) {
    if (![UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.EMPLOYEE].includes(session.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)'
  ]
}
