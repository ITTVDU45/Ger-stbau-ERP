"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  if (path && path.startsWith('/dashboard')) {
    return (
      <div className="flex min-h-screen">
        <div className="shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  return <>{children}</>
}


