"use client"

import React from 'react'
import { DashboardProvider } from '@/lib/contexts/DashboardContext'
import DashboardOverview from './DashboardOverview'
import { UserRole } from '@/lib/auth/roles'

interface DashboardWithProviderProps {
  role: UserRole
  user: {
    id: string
    role: UserRole
    name?: string
  }
}

export default function DashboardWithProvider({ role, user }: DashboardWithProviderProps) {
  return (
    <DashboardProvider>
      <DashboardOverview role={role} user={user} />
    </DashboardProvider>
  )
}

