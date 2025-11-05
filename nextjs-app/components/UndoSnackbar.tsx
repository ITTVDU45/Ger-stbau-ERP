"use client"

import React, { useEffect } from 'react'
import colors from '../lib/theme/colors'

type Props = {
  message: string
  open: boolean
  duration?: number
  onClose: () => void
  onUndo?: () => void
}

export default function UndoSnackbar({ message, open, duration = 5000, onClose, onUndo }: Props) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => onClose(), duration)
    return () => clearTimeout(t)
  }, [open, duration, onClose])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9999 }}>
      <div style={{ background: '#111', color: '#fff', padding: '10px 14px', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center', minWidth: 260 }}>
        <div style={{ flex: 1 }}>{message}</div>
        <button onClick={() => { onUndo && onUndo(); onClose() }} style={{ background: 'transparent', border: 'none', color: colors.primary.main, fontWeight: 700, cursor: 'pointer' }}>Undo</button>
      </div>
    </div>
  )
}


