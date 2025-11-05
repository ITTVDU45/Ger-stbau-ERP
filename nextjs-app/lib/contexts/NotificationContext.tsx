"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Benachrichtigung } from '@/lib/db/types'

interface NotificationContextType {
  notifications: Benachrichtigung[]
  unreadCount: number
  loading: boolean
  refreshNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Benachrichtigung[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchUnreadCount = useCallback(async () => {
    // Deaktiviert - keine API-Calls mehr
    setUnreadCount(0)
  }, [])

  const refreshNotifications = useCallback(async () => {
    // Deaktiviert - keine API-Calls mehr
    setLoading(false)
    setNotifications([])
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    // Deaktiviert - keine API-Calls mehr
  }, [])

  const markAllAsRead = useCallback(async () => {
    // Deaktiviert - keine API-Calls mehr
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    // Deaktiviert - keine API-Calls mehr
  }, [])

  // Initial load - DEAKTIVIERT
  useEffect(() => {
    // Keine API-Calls mehr
    setLoading(false)
  }, [])

  // Poll for new notifications - DEAKTIVIERT
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchUnreadCount()
  //   }, 30000)
  //   return () => clearInterval(interval)
  // }, [fetchUnreadCount])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

