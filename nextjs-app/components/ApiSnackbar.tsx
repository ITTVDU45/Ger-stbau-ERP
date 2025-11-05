"use client"

import React, { useEffect, useState, createContext, useContext } from 'react'
import colors from '../lib/theme/colors'

type ApiSnackbarContextShape = {
  show: (msg: string) => void
}

const ApiSnackbarContext = createContext<ApiSnackbarContextShape | null>(null)

export function useApiSnackbar() {
  const ctx = useContext(ApiSnackbarContext)
  if (!ctx) throw new Error('useApiSnackbar must be used within ApiSnackbarProvider')
  return ctx
}

export function ApiSnackbarProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    if (isVisible) {
      t = setTimeout(() => { setIsVisible(false); setMessage('') }, 5000)
    }
    return () => { if (t) clearTimeout(t) }
  }, [isVisible])

  const show = (msg: string) => {
    setMessage(msg)
    setIsVisible(true)
  }

  return (
    <ApiSnackbarContext.Provider value={{ show }}>
      {children}
      {isVisible && (
        <div style={{ position: 'fixed', right: 18, bottom: 72, zIndex: 9999 }}>
          <div style={{ background: '#b91c1c', color: '#fff', padding: '10px 14px', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center', minWidth: 300, boxShadow: colors.shadows.lg }}>
            <div style={{ flex: 1 }}><strong>Fehler:</strong> {message}</div>
            <button onClick={() => { setIsVisible(false); setMessage('') }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>Schließen</button>
          </div>
        </div>
      )}
    </ApiSnackbarContext.Provider>
  )
}

export function ApiSnackbar({ open, message, onClose }: { open: boolean; message: string; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(open)
  useEffect(() => {
    setIsVisible(open)
    if (open) {
      const t = setTimeout(() => { setIsVisible(false); onClose() }, 5000)
      return () => clearTimeout(t)
    }
  }, [open, onClose])

  if (!isVisible) return null

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 72, zIndex: 9999 }}>
      <div style={{ background: '#b91c1c', color: '#fff', padding: '10px 14px', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center', minWidth: 300, boxShadow: colors.shadows.lg }}>
        <div style={{ flex: 1 }}><strong>Fehler:</strong> {message}</div>
        <button onClick={() => { setIsVisible(false); onClose() }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>Schließen</button>
      </div>
    </div>
  )
}

export default ApiSnackbarProvider


