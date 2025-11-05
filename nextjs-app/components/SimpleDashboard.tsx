"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import colors from '../lib/theme/colors'
import { Button } from '../lib/ui'

export default function SimpleDashboard() {
  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(255,255,255,0.6)',
    backdropFilter: 'blur(6px)',
    padding: 20,
    borderRadius: 16,
    boxShadow: colors.shadows.md,
    minHeight: 120
  }

  const [cases, setCases] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/faelle')
        const data = await res.json()
        if (mounted && data?.erfolg) setCases(data.faelle || [])
      } catch (e) {
        // ignore
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const aktive = cases.filter((c) => c.status !== 'Übermittelt')

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 32, color: colors.secondary.main, fontWeight: 800 }}>Personalvermittlungs CRM System — Dashboard</h1>
        <p style={{ color: colors.secondary.light, marginTop: 8 }}>Schneller Überblick – minimaler Fallback</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
        <div style={cardStyle}>
          <strong style={{ color: colors.primary.dark }}>Aktive Fälle</strong>
          <div style={{ marginTop: 12, color: colors.secondary.light }}>{aktive.length} aktive Fälle</div>
        </div>
        <div style={cardStyle}>
          <strong style={{ color: colors.primary.dark }}>Hochgeladene Dokumente</strong>
          <div style={{ marginTop: 12, color: colors.secondary.light }}>Keine Daten (Fallback)</div>
        </div>
        <div style={cardStyle}>
          <strong style={{ color: colors.primary.dark }}>Statistiken</strong>
          <div style={{ marginTop: 12, color: colors.secondary.light }}>Keine Daten (Fallback)</div>
        </div>
      </section>

      {/* Separate card with table of active cases */}
      <section style={{ marginTop: 18 }}>
        <div style={{ background: 'rgba(255,255,255,0.95)', padding: 18, borderRadius: 12, boxShadow: colors.shadows.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: colors.secondary.main }}>Aktive Fälle</h3>
            <Button variant="ghost" onClick={() => router.push('/dashboard/faelle')} style={{ borderRadius: 999 }}>Alle Fälle</Button>
          </div>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: colors.secondary.main }}>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Fallname</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Kunde</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}></th>
                </tr>
              </thead>
              <tbody>
                {aktive.slice(0, 8).map((f: any) => (
                  <tr key={f._id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '12px 8px' }}>{f.fallname}</td>
                    <td style={{ padding: '12px 8px' }}>{f.mandant?.vorname} {f.mandant?.nachname}</td>
                    <td style={{ padding: '12px 8px' }}>{f.status}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <Button variant="ghost" onClick={() => router.push(`/dashboard/falldetail/${f._id}`)} style={{ borderRadius: 10 }}>Ansehen</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}


