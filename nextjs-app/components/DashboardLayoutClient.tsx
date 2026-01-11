'use client'

/**
 * DashboardLayoutClient
 * 
 * Client-seitiger Wrapper für MobileDashboardLayout
 * Verhindert Hydration-Mismatch durch dynamisches Laden
 */

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

// Serialisierter User-Typ
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

// Dynamisch laden mit ssr: false um Hydration-Mismatch zu vermeiden
const MobileDashboardLayout = dynamic(
  () => import('@/components/MobileDashboardLayout').then(mod => mod.MobileDashboardLayout),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }
)

interface DashboardLayoutClientProps {
  user: SerializedUser | null
  children: ReactNode
}

export default function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  return (
    <MobileDashboardLayout user={user}>
      {children}
    </MobileDashboardLayout>
  )
}
