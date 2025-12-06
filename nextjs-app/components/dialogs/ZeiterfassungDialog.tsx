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
  vorausgewaehlterMitarbeiter?: { id: string; name: string }
}

export default function ZeiterfassungDialog({ open, eintrag, onClose, vorausgewaehlterMitarbeiter }: ZeiterfassungDialogProps) {
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
    taetigkeitstyp: 'aufbau',
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
        mitarbeiterId: vorausgewaehlterMitarbeiter?.id || '',
        mitarbeiterName: vorausgewaehlterMitarbeiter?.name || '',
        projektId: '',
        projektName: '',
        datum: new Date(),
        stunden: 8,
        von: '08:00',
        bis: '17:00',
        pause: 60,
        taetigkeitstyp: 'aufbau',
        status: 'offen',
        beschreibung: '',
        notizen: ''
      })
    }
  }, [eintrag, open, vorausgewaehlterMitarbeiter])

  const loadMitarbeiter = async () => {
    try {
      const response = await fetch('/api/mitarbeiter')
      if (response.ok) {
        const data = await response.json()
        setMitarbeiter(data.mitarbeiter || [])
      }
    } catch (error) {
      console.error('Fehler:', error)
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
      console.error('Fehler:', error)
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
    if (projektId === 'none') {
      setFormData(prev => ({
        ...prev,
        projektId: undefined,
        projektName: undefined
      }))
    } else {
      const p = projekte.find(pr => pr._id === projektId)
      if (p) {
        setFormData(prev => ({
          ...prev,
          projektId,
          projektName: p.projektname
        }))
      }
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {eintrag ? 'Zeiteintrag bearbeiten' : 'Zeiteintrag erfassen'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Erfassen Sie die Arbeitszeit
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mitarbeiter" className="text-gray-900 font-medium">Mitarbeiter *</Label>
              <Select 
                value={formData.mitarbeiterId} 
                onValueChange={handleMitarbeiterChange}
                disabled={!!vorausgewaehlterMitarbeiter}
              >
                <SelectTrigger id="mitarbeiter" className="text-gray-900">
                  <SelectValue placeholder="Mitarbeiter wählen" />
                </SelectTrigger>
                <SelectContent>
                  {mitarbeiter.map(m => (
                    <SelectItem key={m._id} value={m._id!}>
                      {m.vorname} {m.nachname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projekt" className="text-gray-900 font-medium">Projekt (optional)</Label>
              <Select value={formData.projektId || 'none'} onValueChange={handleProjektChange}>
                <SelectTrigger id="projekt" className="text-gray-900">
                  <SelectValue placeholder="Projekt wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Projekt</SelectItem>
                  {projekte.map(p => (
                    <SelectItem key={p._id} value={p._id!}>
                      {p.projektname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taetigkeitstyp" className="text-gray-900 font-medium">Tätigkeitstyp *</Label>
              <Select 
                value={formData.taetigkeitstyp || 'aufbau'} 
                onValueChange={(value: 'aufbau' | 'abbau') => handleChange('taetigkeitstyp', value)}
              >
                <SelectTrigger id="taetigkeitstyp" className="text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aufbau">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Aufbau</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="abbau">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Abbau</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datum" className="text-gray-900 font-medium">Datum *</Label>
              <Input
                id="datum"
                type="date"
                value={formData.datum ? new Date(formData.datum).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('datum', new Date(e.target.value))}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stunden" className="text-gray-900 font-medium">Stunden *</Label>
              <Input
                id="stunden"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.stunden}
                onChange={(e) => handleChange('stunden', parseFloat(e.target.value))}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pause" className="text-gray-900 font-medium">Pause (Min.)</Label>
              <Input
                id="pause"
                type="number"
                min="0"
                max="180"
                value={formData.pause || 0}
                onChange={(e) => handleChange('pause', parseInt(e.target.value))}
                className="text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="von" className="text-gray-900 font-medium">Von</Label>
              <Input
                id="von"
                type="time"
                value={formData.von || ''}
                onChange={(e) => handleChange('von', e.target.value)}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bis" className="text-gray-900 font-medium">Bis</Label>
              <Input
                id="bis"
                type="time"
                value={formData.bis || ''}
                onChange={(e) => handleChange('bis', e.target.value)}
                className="text-gray-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beschreibung" className="text-gray-900 font-medium">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              placeholder="Was wurde gemacht?"
              value={formData.beschreibung || ''}
              onChange={(e) => handleChange('beschreibung', e.target.value)}
              className="text-gray-900"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            disabled={saving}
            className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

