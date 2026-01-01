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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Serialisierter User-Typ für Client-Komponente
type SerializedUser = {
  _id?: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  profile?: {
    telefon?: string
    geburtsdatum?: string
    personalnummer?: string
    adresse?: {
      strasse?: string
      hausnummer?: string
      plz?: string
      stadt?: string
      land?: string
    }
    notfallkontakt?: {
      name?: string
      beziehung?: string
      telefon?: string
    }
    bankdaten?: {
      iban?: string
      bic?: string
      bankname?: string
    }
    steuerDaten?: {
      steuerID?: string
      sozialversicherungsnummer?: string
    }
    profilbild?: {
      url?: string
      filename?: string
      uploadedAt?: string
    }
  }
}

// Gerüstbau ERP Admin Navigation - Strukturiert in Kategorien
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
          items: [
            {
              title: "Alle Kunden",
              icon: UserCheck,
              url: "/dashboard/admin/kunden",
            },
            {
              title: "Kundenberichte",
              icon: BarChart3,
              url: "/dashboard/admin/kunden/berichte",
            },
          ],
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
          title: "Angebote & Rechnungen",
          icon: FileText,
          url: "/dashboard/admin/angebote",
          items: [
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

export function AppSidebar({ 
  user, 
  ...props 
}: React.ComponentProps<typeof Sidebar> & { user?: SerializedUser | null }) {
  const pathname = usePathname()
  const router = useRouter()

  // Verwende die Gerüstbau ERP Navigation
  const navigationData = adminData

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
    // Rufe API-Logout auf
    await fetch('/api/auth/logout', { method: 'POST' })
    // Entferne lokale Session-Daten
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    document.cookie = 'session=; path=/; max-age=0'
    // Weiterleitung zur Login-Seite
    router.push('/login')
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center">
          <Link href="/dashboard/admin/uebersicht" className="block w-full">
            <div className="w-full">
              <img 
                src="/Aplus.png" 
                alt="A Plus Gerüstbau Logo"
                className="w-full h-auto object-contain"
                style={{ maxHeight: '64px' }}
              />
            </div>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationData.kategorien.map((kategorie, kategorieIndex) => (
          <React.Fragment key={kategorie.name}>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1.5">
                {kategorie.name}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {kategorie.items.map((item) => {
                  const ItemIcon = item.icon
                  const hasSubItems = item.items && item.items.length > 0
                  
                  // Wenn nur ein Item ohne Untermenü, direkt als Link
                  if (!hasSubItems) {
                    return (
                      <SidebarMenu key={item.title}>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={pathname === item.url || pathname?.startsWith(item.url + '/')}>
                            <Link href={item.url} className="flex items-center gap-2">
                              {ItemIcon && <ItemIcon className="w-4 h-4" />}
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    )
                  }
                  
                  // Wenn Untermenü vorhanden, als Gruppe mit Label
                  return (
                    <SidebarMenu key={item.title}>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname?.startsWith(item.url)}>
                          <Link href={item.url} className="flex items-center gap-2 font-medium">
                            {ItemIcon && <ItemIcon className="w-4 h-4" />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {item.items?.map((child) => {
                        const ChildIcon = child.icon
                        return (
                          <SidebarMenuItem key={child.title}>
                            <SidebarMenuButton asChild isActive={pathname === child.url || pathname?.startsWith(child.url + '/')}>
                              <Link href={child.url} className="flex items-center gap-2 pl-6 text-sm">
                                {ChildIcon && <ChildIcon className="w-3.5 h-3.5" />}
                                <span>{child.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  )
                })}
              </SidebarGroupContent>
            </SidebarGroup>
            {/* Trennlinie zwischen Kategorien (außer letzte) */}
            {kategorieIndex < navigationData.kategorien.length - 1 && (
              <div className="border-t border-gray-200 my-2" />
            )}
          </React.Fragment>
        ))}
      </SidebarContent>
      
      {/* Footer mit Benutzeranzeige und Abmelden */}
      <SidebarFooter>
        <SidebarMenu>
          {/* Benutzer-Anzeige */}
          {user && (
            <div className="px-3 py-2 mb-2 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
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
          
          {/* Abmelden */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              <span>Abmelden</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}

