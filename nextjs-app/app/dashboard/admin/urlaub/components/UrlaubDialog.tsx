"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Urlaub } from '@/lib/db/types'

interface UrlaubDialogProps {
  open: boolean
  urlaub?: Urlaub
  onClose: (updated: boolean) => void
}

export default function UrlaubDialog({ open, urlaub, onClose }: UrlaubDialogProps) {
  const [formData, setFormData] = useState<Partial<Urlaub>>({
    mitarbeiterId: '',
    mitarbeiterName: '',
    von: new Date(),
    bis: new Date(),
    anzahlTage: 1,
    typ: 'urlaub',
    status: 'beantragt',
    grund: '',
    vertretung: '',
    vertretungName: ''
  })
  
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMitarbeiter()
  }, [])

  useEffect(() => {
    if (urlaub) {
      setFormData(urlaub)
    } else {
      setFormData({
        mitarbeiterId: '',
        mitarbeiterName: '',
        von: new Date(),
        bis: new Date(),
        anzahlTage: 1,
        typ: 'urlaub',
        status: 'beantragt',
        grund: '',
        vertretung: '',
        vertretungName: ''
      })
    }
  }, [urlaub, open])

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

  const handleVertretungChange = (vertretungId: string) => {
    const v = mitarbeiter.find(ma => ma._id === vertretungId)
    if (v) {
      setFormData(prev => ({
        ...prev,
        vertretung: vertretungId,
        vertretungName: `${v.vorname} ${v.nachname}`
      }))
    }
  }

  const berechneAnzahlTage = () => {
    if (formData.von && formData.bis) {
      const von = new Date(formData.von)
      const bis = new Date(formData.bis)
      const diff = Math.ceil((bis.getTime() - von.getTime()) / (1000 * 60 * 60 * 24)) + 1
      handleChange('anzahlTage', diff)
    }
  }

  useEffect(() => {
    berechneAnzahlTage()
  }, [formData.von, formData.bis])

  const handleSubmit = async () => {
    if (!formData.mitarbeiterId || !formData.von || !formData.bis) {
      alert('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setSaving(true)
    try {
      const url = urlaub?._id 
        ? `/api/urlaub/${urlaub._id}` 
        : '/api/urlaub'
      
      const method = urlaub?._id ? 'PUT' : 'POST'
      
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
          <DialogTitle>{urlaub ? 'Urlaubsantrag bearbeiten' : 'Neuer Urlaubsantrag'}</DialogTitle>
          <DialogDescription>Erstellen oder bearbeiten Sie einen Urlaubsantrag</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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

          <div className="grid grid-cols-3 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="anzahlTage">Anzahl Tage</Label>
              <Input
                id="anzahlTage"
                type="number"
                value={formData.anzahlTage || 0}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="typ">Typ *</Label>
              <Select value={formData.typ} onValueChange={(v) => handleChange('typ', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urlaub">Urlaub</SelectItem>
                  <SelectItem value="krankheit">Krankheit</SelectItem>
                  <SelectItem value="sonderurlaub">Sonderurlaub</SelectItem>
                  <SelectItem value="unbezahlt">Unbezahlt</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertretung">Vertretung (optional)</Label>
              <Select value={formData.vertretung || undefined} onValueChange={(val) => {
                if (val === 'KEINE_VERTRETUNG') {
                  handleChange('vertretung', '')
                  handleChange('vertretungName', '')
                } else {
                  handleVertretungChange(val)
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Vertretung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEINE_VERTRETUNG">Keine Vertretung</SelectItem>
                  {mitarbeiter.filter(m => m._id !== formData.mitarbeiterId).map(m => (
                    <SelectItem key={m._id} value={m._id}>{m.vorname} {m.nachname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grund">Grund / Notizen</Label>
            <Textarea
              id="grund"
              value={formData.grund || ''}
              onChange={(e) => handleChange('grund', e.target.value)}
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

