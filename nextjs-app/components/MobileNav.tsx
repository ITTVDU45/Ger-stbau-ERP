"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LogOut,
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  FileText,
  ClipboardList,
  Receipt,
  AlertTriangle,
  Calendar,
  BarChart3,
  Settings,
  TrendingUp,
  Banknote,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Serialisierter User-Typ für Client-Komponente
type SerializedUser = {
  _id?: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  profile?: {
    profilbild?: {
      url?: string
      filename?: string
      uploadedAt?: string
    }
  }
}

// Gerüstbau ERP Admin Navigation
const adminData = {
  kategorien: [
    {
      name: "Hauptfunktionen",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          url: "/dashboard/admin/uebersicht",
        },
        {
          title: "Projekte",
          icon: Building2,
          url: "/dashboard/admin/projekte",
        },
        {
          title: "Mitarbeiter",
          icon: Users,
          url: "/dashboard/admin/mitarbeiter",
        },
        {
          title: "Kunden",
          icon: UserCheck,
          url: "/dashboard/admin/kunden",
        },
      ],
    },
    {
      name: "Finanzen",
      items: [
        {
          title: "Finanzen",
          icon: Banknote,
          url: "/dashboard/admin/finanzen",
        },
        {
          title: "Anfragen",
          icon: ClipboardList,
          url: "/dashboard/admin/anfragen",
        },
        {
          title: "Angebote",
          icon: FileText,
          url: "/dashboard/admin/angebote",
        },
        {
          title: "Rechnungen",
          icon: Receipt,
          url: "/dashboard/admin/rechnungen",
        },
        {
          title: "Mahnwesen",
          icon: AlertTriangle,
          url: "/dashboard/admin/mahnwesen",
        },
      ],
    },
    {
      name: "Planung & Analyse",
      items: [
        {
          title: "Kalender",
          icon: Calendar,
          url: "/dashboard/admin/kalender",
        },
        {
          title: "Statistiken & Reports",
          icon: TrendingUp,
          url: "/dashboard/admin/statistiken",
        },
      ],
    },
    {
      name: "Verwaltung",
      items: [
        {
          title: "Einstellungen",
          icon: Settings,
          url: "/dashboard/admin/einstellungen",
        },
      ],
    },
  ],
}

export function MobileNav({ 
  user,
  onNavigate 
}: { 
  user?: SerializedUser | null
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  // Benutzer-Initialen für Avatar
  const getUserInitials = () => {
    if (!user) return '?'
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
  }
  
  // Rollen-Label
  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'SUPERADMIN': return 'Superadmin'
      case 'ADMIN': return 'Administrator'
      case 'EMPLOYEE': return 'Mitarbeiter'
      default: return role
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    document.cookie = 'session=; path=/; max-age=0'
    router.push('/login')
  }

  const handleNavClick = () => {
    if (onNavigate) onNavigate()
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="text-center">
          <h2 className="text-xl font-bold text-blue-600">Gerüstbau ERP</h2>
          <p className="text-xs text-gray-500">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        {adminData.kategorien.map((kategorie, kategorieIndex) => (
          <div key={kategorie.name} className="mb-4">
            {/* Kategorien-Label */}
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {kategorie.name}
              </h3>
            </div>
            
            {/* Navigation Items */}
            <div className="space-y-1">
              {kategorie.items.map((item) => {
                const ItemIcon = item.icon
                const isActive = pathname === item.url || pathname?.startsWith(item.url + '/')
                
                return (
                  <Link
                    key={item.title}
                    href={item.url}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {ItemIcon && <ItemIcon className="w-5 h-5 flex-shrink-0" />}
                    <span className="text-sm">{item.title}</span>
                  </Link>
                )
              })}
            </div>
            
            {/* Trennlinie zwischen Kategorien */}
            {kategorieIndex < adminData.kategorien.length - 1 && (
              <div className="border-t border-gray-200 my-3" />
            )}
          </div>
        ))}
      </div>

      {/* Footer mit Benutzer und Abmelden */}
      <div className="border-t border-gray-200 p-3 mt-auto">
        {/* Benutzer-Anzeige */}
        {user && (
          <div className="mb-3 px-2 py-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profile?.profilbild?.url} />
                <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {getRoleLabel(user.role)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Abmelden Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Abmelden</span>
        </button>
      </div>
    </div>
  )
}

