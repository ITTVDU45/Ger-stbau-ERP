"use client"

import React from 'react'
import Link from 'next/link'
import colors from '../lib/theme/colors'

export default function Header() {
  return (
    <header style={{ padding: '14px 28px', borderBottom: '1px solid rgba(0,0,0,0.04)', background: 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <Link href="/" style={{ color: colors.secondary.main, fontWeight: 800, textDecoration: 'none' }}>Personalvermittlungs CRM System</Link>
      </div>
    </header>
  )
}


