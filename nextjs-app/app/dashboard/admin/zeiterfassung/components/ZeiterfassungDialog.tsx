"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zeiterfassung } from '@/lib/db/types'

interface ZeiterfassungDialogProps {
  open: boolean
  eintrag?: Zeiterfassung
  onClose: (updated: boolean) => void
}

export default function ZeiterfassungDialog({ open, eintrag, onClose }: ZeiterfassungDialogProps) {
  const [formData, setFormData] = useState<Partial<Zeiterfassung>>({
    mitarbeiterId: '',
    mitarbeiterName: '',
    projektId: '',
    projektName: '',
    datum: new Date(),
    stunden: 8,
    von: '08:00',
    bis: '17:00',
    pause: 60,
    status: 'offen',
    beschreibung: '',
    notizen: ''
  })
  
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([])
  const [projekte, setProjekte] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMitarbeiter()
    loadProjekte()
  }, [])

  useEffect(() => {
    if (eintrag) {
      setFormData(eintrag)
    } else {
      setFormData({
        mitarbeiterId: '',
        mitarbeiterName: '',
        projektId: '',
        projektName: '',
        datum: new Date(),
        stunden: 8,
        von: '08:00',
        bis: '17:00',
        pause: 60,
        status: 'offen',
        beschreibung: '',
        notizen: ''
      })
    }
  }, [eintrag, open])

  const loadMitarbeiter = async () => {
    try {
      const response = await fetch('/api/mitarbeiter')
      if (response.ok) {
        const data = await response.json()
        setMitarbeiter(data.mitarbeiter || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error)
    }
  }

  const loadProjekte = async () => {
    try {
      const response = await fetch('/api/projekte')
      if (response.ok) {
        const data = await response.json()
        setProjekte(data.projekte || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMitarbeiterChange = (mitarbeiterId: string) => {
    const m = mitarbeiter.find(ma => ma._id === mitarbeiterId)
    if (m) {
      setFormData(prev => ({
        ...prev,
        mitarbeiterId,
        mitarbeiterName: `${m.vorname} ${m.nachname}`
      }))
    }
  }

  const handleProjektChange = (projektId: string) => {
    const p = projekte.find(pr => pr._id === projektId)
    if (p) {
      setFormData(prev => ({
        ...prev,
        projektId,
        projektName: p.projektname
      }))
    }
  }

  const handleSubmit = async () => {
    if (!formData.mitarbeiterId || !formData.datum || !formData.stunden) {
      alert('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setSaving(true)
    try {
      const url = eintrag?._id 
        ? `/api/zeiterfassung/${eintrag._id}` 
        : '/api/zeiterfassung'
      
      const method = eintrag?._id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onClose(true)
      } else {
        alert('Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler:', error)
      alert('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{eintrag ? 'Zeiteintrag bearbeiten' : 'Neuer Zeiteintrag'}</DialogTitle>
          <DialogDescription>Erfassen Sie die Arbeitszeit</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mitarbeiter">Mitarbeiter *</Label>
              <Select value={formData.mitarbeiterId} onValueChange={handleMitarbeiterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {mitarbeiter.map(m => (
                    <SelectItem key={m._id} value={m._id}>{m.vorname} {m.nachname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projekt">Projekt (optional)</Label>
              <Select value={formData.projektId || undefined} onValueChange={(val) => {
                if (val === 'KEIN_PROJEKT') {
                  handleChange('projektId', '')
                  handleChange('projektName', '')
                } else {
                  handleProjektChange(val)
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Projekt auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEIN_PROJEKT">Kein Projekt</SelectItem>
                  {projekte.map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.projektname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="datum">Datum *</Label>
              <Input
                id="datum"
                type="date"
                value={formData.datum ? new Date(formData.datum).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('datum', new Date(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="von">Von</Label>
              <Input id="von" type="time" value={formData.von || ''} onChange={(e) => handleChange('von', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bis">Bis</Label>
              <Input id="bis" type="time" value={formData.bis || ''} onChange={(e) => handleChange('bis', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stunden">Stunden *</Label>
              <Input
                id="stunden"
                type="number"
                step="0.5"
                value={formData.stunden || 0}
                onChange={(e) => handleChange('stunden', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pause">Pause (Min.)</Label>
              <Input
                id="pause"
                type="number"
                value={formData.pause || 0}
                onChange={(e) => handleChange('pause', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={formData.beschreibung || ''}
              onChange={(e) => handleChange('beschreibung', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

