"use client"

import React from 'react'
import colors from '../lib/theme/colors'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(0,0,0,0.04)', marginTop: 48, padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', color: colors.secondary.light }}>
        © 2025 LIVE Gutachter — Alle Rechte vorbehalten
      </div>
    </footer>
  )
}


