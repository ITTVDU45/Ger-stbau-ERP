"use client"

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function RenderDebugger() {
  const path = usePathname()
  const [mountedAt, setMountedAt] = useState<string>('')

  useEffect(() => {
    const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    setMountedAt(time)
    // expose React globally for legacy compiled code that expects a global React
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).React = (React as any)
    // eslint-disable-next-line no-console
    console.log('[RenderDebugger] mounted at', time, 'path=', path)
  }, [path])

  return (
    <div aria-hidden style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 99999, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: 8, borderRadius: 8, fontSize: 12 }}>
      <div><strong>DEV</strong></div>
      <div>Path: {path}</div>
      <div>Mounted: {mountedAt || '—'}</div>
    </div>
  )
}


