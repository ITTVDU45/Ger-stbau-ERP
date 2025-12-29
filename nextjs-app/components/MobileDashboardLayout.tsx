'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useState, useEffect } from 'react'

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

export function MobileDashboardLayout({
  children,
  user
}: {
  children: React.ReactNode
  user: SerializedUser | null
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    // Check if we're on desktop or mobile
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  return (
    <SidebarProvider defaultOpen={isDesktop}>
      <div className="flex min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                <span className="sr-only">Menü öffnen</span>
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <AppSidebar user={user} />
            </SheetContent>
          </Sheet>
          
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-lg font-semibold text-gray-900">Gerüstbau ERP</h1>
          </div>
          
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AppSidebar user={user} />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 bg-gray-50 md:pt-6 pt-[72px]">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

