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
  DollarSign,
  Download,
  Briefcase,
  Settings,
  TrendingUp,
  Calculator,
  FolderArchive,
  Plug,
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
        {
          title: "Buchhaltung",
          icon: Briefcase,
          url: "/dashboard/admin/buchhaltung",
          items: [
            {
              title: "DATEV-Export",
              icon: Calculator,
              url: "/dashboard/admin/buchhaltung/datev",
            },
            {
              title: "Archiv",
              icon: FolderArchive,
              url: "/dashboard/admin/buchhaltung/archiv",
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
          items: [
            {
              title: "Finanzen",
              icon: DollarSign,
              url: "/dashboard/admin/statistiken/finanzen",
            },
            {
              title: "Projekte",
              icon: Building2,
              url: "/dashboard/admin/statistiken/projekte",
            },
            {
              title: "Mitarbeiter",
              icon: Users,
              url: "/dashboard/admin/statistiken/mitarbeiter",
            },
            {
              title: "Export",
              icon: Download,
              url: "/dashboard/admin/statistiken/export",
            },
          ],
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
          items: [
            {
              title: "Allgemein",
              icon: Settings,
              url: "/dashboard/admin/einstellungen",
            },
            {
              title: "Benutzer",
              icon: Users,
              url: "/dashboard/admin/einstellungen/benutzer",
            },
            {
              title: "Integration",
              icon: Plug,
              url: "/dashboard/admin/einstellungen/integration",
            },
          ],
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar> & { user?: any }) {
  const pathname = usePathname()
  const router = useRouter()

  // Verwende die Gerüstbau ERP Navigation
  const navigationData = adminData

  const handleLogout = () => {
    // Entferne Session-Daten
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    document.cookie = 'session=; path=/; max-age=0'
    // Weiterleitung zur Startseite
    router.push('/')
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center">
          <Link href="/dashboard/admin/uebersicht" className="block">
            <div className="text-center">
              <h2 className="text-xl font-bold text-blue-600">Gerüstbau ERP</h2>
              <p className="text-xs text-gray-500">Management System</p>
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
      
      {/* Footer mit Abmelden */}
      <SidebarFooter>
        <SidebarMenu>
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

