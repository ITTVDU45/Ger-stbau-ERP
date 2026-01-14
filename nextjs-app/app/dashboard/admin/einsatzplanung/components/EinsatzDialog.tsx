"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from '@/components/ui/switch'
import { Einsatz } from '@/lib/db/types'

interface EinsatzDialogProps {
  open: boolean
  einsatz?: Einsatz
  onClose: (updated: boolean) => void
}

export default function EinsatzDialog({ open, einsatz, onClose }: EinsatzDialogProps) {
  const [formData, setFormData] = useState<Partial<Einsatz>>({
    projektId: '',
    projektName: '',
    mitarbeiterId: '',
    mitarbeiterName: '',
    von: new Date(),
    bis: new Date(),
    rolle: '',
    geplantStunden: 0,
    notizen: '',
    bestaetigt: false
  })
  
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([])
  const [projekte, setProjekte] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMitarbeiter()
    loadProjekte()
  }, [])

  useEffect(() => {
    if (einsatz) {
      setFormData(einsatz)
    } else {
      setFormData({
        projektId: '',
        projektName: '',
        mitarbeiterId: '',
        mitarbeiterName: '',
        von: new Date(),
        bis: new Date(),
        rolle: '',
        geplantStunden: 0,
        notizen: '',
        bestaetigt: false
      })
    }
  }, [einsatz, open])

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
    if (!formData.projektId || !formData.von || !formData.bis) {
      alert('Bitte füllen Sie alle Pflichtfelder aus (Projekt, Von, Bis)')
      return
    }

    setSaving(true)
    try {
      const url = einsatz?._id 
        ? `/api/einsatzplanung/${einsatz._id}` 
        : '/api/einsatzplanung'
      
      const method = einsatz?._id ? 'PUT' : 'POST'
      
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
          <DialogTitle>{einsatz ? 'Einsatz bearbeiten' : 'Neuer Einsatz'}</DialogTitle>
          <DialogDescription>Planen Sie einen Mitarbeiter-Einsatz auf einem Projekt</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mitarbeiter">Mitarbeiter</Label>
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
              <Label htmlFor="projekt">Projekt *</Label>
              <Select value={formData.projektId} onValueChange={handleProjektChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Projekt auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {projekte.map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.projektname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="von">Von *</Label>
              <Input
                id="von"
                type="date"
                value={formData.von ? new Date(formData.von).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('von', new Date(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bis">Bis *</Label>
              <Input
                id="bis"
                type="date"
                value={formData.bis ? new Date(formData.bis).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('bis', new Date(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rolle">Rolle im Projekt</Label>
              <Select value={formData.rolle || ''} onValueChange={(value) => handleChange('rolle', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Rolle auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bauleiter">Bauleiter</SelectItem>
                  <SelectItem value="Teamleiter">Teamleiter</SelectItem>
                  <SelectItem value="Polier">Polier</SelectItem>
                  <SelectItem value="Gerüstbauer">Gerüstbauer</SelectItem>
                  <SelectItem value="Monteur">Monteur</SelectItem>
                  <SelectItem value="Vorarbeiter">Vorarbeiter</SelectItem>
                  <SelectItem value="Facharbeiter">Facharbeiter</SelectItem>
                  <SelectItem value="Helfer">Helfer</SelectItem>
                  <SelectItem value="Auszubildender">Auszubildender</SelectItem>
                  <SelectItem value="Sicherheitsbeauftragter">Sicherheitsbeauftragter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="geplantStunden">Geplante Stunden</Label>
              <Input
                id="geplantStunden"
                type="number"
                step="0.5"
                value={formData.geplantStunden || 0}
                onChange={(e) => handleChange('geplantStunden', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={formData.notizen || ''}
              onChange={(e) => handleChange('notizen', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="bestaetigt"
              checked={formData.bestaetigt}
              onCheckedChange={(checked) => handleChange('bestaetigt', checked)}
            />
            <Label htmlFor="bestaetigt">Einsatz bestätigt</Label>
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

