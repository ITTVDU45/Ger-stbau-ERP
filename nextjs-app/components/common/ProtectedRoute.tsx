"use client"

import React from 'react'

type ProtectedRouteProps = {
  requireAdmin?: boolean
  children: React.ReactNode
}

export default function ProtectedRoute({ requireAdmin = false, children }: ProtectedRouteProps) {
  // No authentication required - render children directly
  return <>{children}</>
}