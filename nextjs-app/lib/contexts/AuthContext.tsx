"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type UserRole = 'ADMIN' | 'GUTACHTER' | 'PARTNER'

type User = { 
  vorname?: string
  nachname?: string
  email?: string
  role?: UserRole
} | null

type AuthContextValue = {
  user: User
  login: (u: User, role?: UserRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Bei Page-Load: User aus localStorage wiederherstellen
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('session')
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser))
      // Cookie setzen für Middleware
      document.cookie = `session=${savedToken}; path=/; max-age=86400`
    }
    setIsLoading(false)
  }, [])

  function login(u: User, role?: UserRole) {
    const userWithRole = { ...u, role: role || u.role || 'GUTACHTER' }
    setUser(userWithRole)
    
    // Persistiere User in localStorage
    localStorage.setItem('user', JSON.stringify(userWithRole))
    
    // Setze Cookie basierend auf Rolle (für Middleware)
    let token = 'gutachter-token'
    if (userWithRole.role === 'ADMIN') token = 'admin-token'
    if (userWithRole.role === 'PARTNER') token = 'partner-token'
    
    localStorage.setItem('session', token)
    document.cookie = `session=${token}; path=/; max-age=86400`
  }
  
  function logout() {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    document.cookie = 'session=; path=/; max-age=0'
    // Weiterleitung zur Login-Seite
    router.push('/')
  }

  if (isLoading) {
    return <div>Laden...</div>
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


