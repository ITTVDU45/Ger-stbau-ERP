"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { UserRole } from "@/lib/auth/roles"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  items: Array<{
    label: string
    href: string
  }>
  user?: {
    id: string
    role: UserRole
    name?: string
  } | null
}

export function Sidebar({ items, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    // Entferne Session-Daten
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    document.cookie = 'session=; path=/; max-age=0'
    // Weiterleitung zur Startseite
    router.push('/')
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">P4E</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">TechVision</h2>
            <p className="text-xs text-gray-500">Recruiting Platform</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-white text-sm">
                {user.name?.charAt(0) || user.role.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || 'Benutzer'}
              </p>
              <Badge variant="secondary" className="text-xs">
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <Button
                  variant={pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  {item.label}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {/* Abmelden */}
        <Button variant="ghost" className="w-full justify-start text-gray-600" onClick={handleLogout}>
          Abmelden
        </Button>
      </div>
    </div>
  )
}
