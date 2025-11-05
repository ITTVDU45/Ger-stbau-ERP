"use client"

import { useState } from 'react'

export default function Hero() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function validE164(value: string) {
    return /^\+?[1-9][0-9]{6,14}$/.test(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!validE164(phone)) {
      setMsg('Bitte eine gültige Telefonnummer im E.164-Format eingeben (z.B. +491701234567).')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/callback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Fehler')
      setMsg('Rückruf-Anfrage erhalten — danke!')
    } catch (err: any) {
      setMsg(err?.message || 'Fehler beim Senden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-4xl font-bold mb-4">KI-Telefonie für Gutachter</h1>
        <p className="text-lg text-slate-600 mb-6">Starte einen Test-Rückruf in Sekunden.</p>

        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
          <input aria-label="Telefonnummer" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="z.B. +491701234567" className="p-3 rounded-lg border" />
          <button type="submit" disabled={loading} className="px-4 py-3 bg-brand-500 text-white rounded-lg">
            {loading ? 'Sende...' : 'Test-Rückruf starten'}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm text-slate-700">{msg}</p>}
      </div>

      <div aria-hidden className="hidden md:block">
        <div className="h-48 bg-gradient-to-br from-slate-200 to-white rounded-2xl glass flex items-center justify-center">
          <span className="text-slate-400">Visual Placeholder</span>
        </div>
      </div>
    </div>
  )
}


