"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
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

// Gerüstbau ERP Admin Navigation
const adminData = {
  navMain: [
    {
      title: "📊 Dashboard",
      url: "/dashboard/admin/uebersicht",
      items: [
        {
          title: "📊 Übersicht",
          url: "/dashboard/admin/uebersicht",
        },
      ],
    },
    {
      title: "👷 Mitarbeiter",
      url: "/dashboard/admin/mitarbeiter",
      items: [
        {
          title: "👷 Mitarbeiter-Verwaltung",
          url: "/dashboard/admin/mitarbeiter",
        },
        {
          title: "⏰ Zeiterfassung",
          url: "/dashboard/admin/zeiterfassung",
        },
        {
          title: "📅 Einsatzplanung",
          url: "/dashboard/admin/einsatzplanung",
        },
        {
          title: "🏖️ Urlaub & Abwesenheiten",
          url: "/dashboard/admin/urlaub",
        },
      ],
    },
    {
      title: "🏗️ Projekte",
      url: "/dashboard/admin/projekte",
      items: [
        {
          title: "🏗️ Projekt-Verwaltung",
          url: "/dashboard/admin/projekte",
        },
      ],
    },
    {
      title: "👥 Kunden",
      url: "/dashboard/admin/kunden",
      items: [
        {
          title: "👥 Alle Kunden",
          url: "/dashboard/admin/kunden",
        },
        {
          title: "📊 Kundenberichte",
          url: "/dashboard/admin/kunden/berichte",
        },
      ],
    },
    {
      title: "💰 Angebote & Rechnungen",
      url: "/dashboard/admin/angebote",
      items: [
        {
          title: "📋 Anfragen",
          url: "/dashboard/admin/anfragen",
        },
        {
          title: "📝 Angebote",
          url: "/dashboard/admin/angebote",
        },
        {
          title: "🧾 Rechnungen",
          url: "/dashboard/admin/rechnungen",
        },
        {
          title: "⚠️ Mahnwesen",
          url: "/dashboard/admin/mahnwesen",
        },
      ],
    },
    {
      title: "📆 Kalender",
      url: "/dashboard/admin/kalender",
      items: [
        {
          title: "📆 Einsatz- & Terminplanung",
          url: "/dashboard/admin/kalender",
        },
      ],
    },
    {
      title: "📊 Statistiken & Reports",
      url: "/dashboard/admin/statistiken",
      items: [
        {
          title: "💵 Finanzen",
          url: "/dashboard/admin/statistiken/finanzen",
        },
        {
          title: "🏗️ Projekte",
          url: "/dashboard/admin/statistiken/projekte",
        },
        {
          title: "👷 Mitarbeiter",
          url: "/dashboard/admin/statistiken/mitarbeiter",
        },
        {
          title: "📥 Export",
          url: "/dashboard/admin/statistiken/export",
        },
      ],
    },
    {
      title: "💼 Buchhaltung",
      url: "/dashboard/admin/buchhaltung",
      items: [
        {
          title: "📊 DATEV-Export",
          url: "/dashboard/admin/buchhaltung/datev",
        },
        {
          title: "📁 Archiv",
          url: "/dashboard/admin/buchhaltung/archiv",
        },
      ],
    },
    {
      title: "⚙️ Einstellungen",
      url: "/dashboard/admin/einstellungen",
      items: [
        {
          title: "⚙️ Allgemein",
          url: "/dashboard/admin/einstellungen",
        },
        {
          title: "👥 Benutzer",
          url: "/dashboard/admin/einstellungen/benutzer",
        },
        {
          title: "🔗 Integration",
          url: "/dashboard/admin/einstellungen/integration",
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
        {/* We create a SidebarGroup for each parent. */}
        {navigationData.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((child) => (
                  <SidebarMenuItem key={child.title}>
                    <SidebarMenuButton asChild isActive={pathname?.startsWith(child.url)}>
                      <Link href={child.url}>{child.title}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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

