"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Projekt } from '@/lib/db/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ProjektDialogProps {
  open: boolean
  projekt?: Projekt
  onClose: (updated: boolean) => void
}

export default function ProjektDialog({ open, projekt, onClose }: ProjektDialogProps) {
  const [formData, setFormData] = useState<Partial<Projekt>>({
    projektnummer: '',
    projektname: '',
    kundeId: '',
    kundeName: '',
    standort: '',
    ansprechpartner: { name: '', telefon: '', email: '' },
    beginn: new Date(),
    ende: new Date(),
    status: 'in_planung',
    beschreibung: '',
    zugewieseneMitarbeiter: [],
    budget: 0,
    istKosten: 0,
    fortschritt: 0,
    dokumente: [],
    notizen: '',
    tags: []
  })
  
  const [kunden, setKunden] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadKunden()
  }, [])

  useEffect(() => {
    if (projekt) {
      setFormData(projekt)
    } else {
      // Projektnummer automatisch generieren
      const jahr = new Date().getFullYear()
      const projektnummer = `P-${jahr}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      
      setFormData({
        projektnummer,
        projektname: '',
        kundeId: '',
        kundeName: '',
        standort: '',
        ansprechpartner: { name: '', telefon: '', email: '' },
        beginn: new Date(),
        ende: new Date(),
        status: 'in_planung',
        beschreibung: '',
        zugewieseneMitarbeiter: [],
        budget: 0,
        istKosten: 0,
        fortschritt: 0,
        dokumente: [],
        notizen: '',
        tags: []
      })
    }
  }, [projekt, open])

  const loadKunden = async () => {
    try {
      const response = await fetch('/api/kunden')
      if (response.ok) {
        const data = await response.json()
        setKunden(data.kunden || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAnsprechpartnerChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      ansprechpartner: { ...prev.ansprechpartner, [field]: value }
    }))
  }

  const handleKundeChange = (kundeId: string) => {
    const k = kunden.find(ku => ku._id === kundeId)
    if (k) {
      setFormData(prev => ({
        ...prev,
        kundeId,
        kundeName: k.firma || `${k.vorname} ${k.nachname}`
      }))
    }
  }

  const handleSubmit = async () => {
    if (!formData.projektname || !formData.kundeId || !formData.standort) {
      alert('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setSaving(true)
    try {
      const url = projekt?._id 
        ? `/api/projekte/${projekt._id}` 
        : '/api/projekte'
      
      const method = projekt?._id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          erstelltVon: 'admin' // TODO: Aktuellen User verwenden
        })
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{projekt ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
          <DialogDescription>Projekt-Details erfassen</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="allgemein" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
            <TabsTrigger value="zeitraum">Zeitraum & Budget</TabsTrigger>
            <TabsTrigger value="kontakt">Ansprechpartner</TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projektnummer">Projektnummer *</Label>
                <Input
                  id="projektnummer"
                  value={formData.projektnummer}
                  onChange={(e) => handleChange('projektnummer', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_planung">In Planung</SelectItem>
                    <SelectItem value="aktiv">Aktiv</SelectItem>
                    <SelectItem value="pausiert">Pausiert</SelectItem>
                    <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                    <SelectItem value="abgerechnet">Abgerechnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projektname">Projektname *</Label>
              <Input
                id="projektname"
                value={formData.projektname}
                onChange={(e) => handleChange('projektname', e.target.value)}
                placeholder="z.B. Hochhaus Stadtmitte"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kunde">Kunde *</Label>
              <Select value={formData.kundeId} onValueChange={handleKundeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {kunden.map(k => (
                    <SelectItem key={k._id} value={k._id}>
                      {k.firma || `${k.vorname} ${k.nachname}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="standort">Standort / Baustelle *</Label>
              <Input
                id="standort"
                value={formData.standort}
                onChange={(e) => handleChange('standort', e.target.value)}
                placeholder="Adresse der Baustelle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beschreibung">Beschreibung</Label>
              <Textarea
                id="beschreibung"
                value={formData.beschreibung || ''}
                onChange={(e) => handleChange('beschreibung', e.target.value)}
                rows={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="zeitraum" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beginn">Beginn *</Label>
                <Input
                  id="beginn"
                  type="date"
                  value={formData.beginn ? new Date(formData.beginn).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('beginn', new Date(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ende">Ende *</Label>
                <Input
                  id="ende"
                  type="date"
                  value={formData.ende ? new Date(formData.ende).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('ende', new Date(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (€)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget || 0}
                  onChange={(e) => handleChange('budget', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fortschritt">Fortschritt (%)</Label>
                <Input
                  id="fortschritt"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.fortschritt || 0}
                  onChange={(e) => handleChange('fortschritt', parseInt(e.target.value))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kontakt" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ansprechpartner-name">Name Ansprechpartner</Label>
              <Input
                id="ansprechpartner-name"
                value={formData.ansprechpartner?.name || ''}
                onChange={(e) => handleAnsprechpartnerChange('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ansprechpartner-telefon">Telefon</Label>
                <Input
                  id="ansprechpartner-telefon"
                  type="tel"
                  value={formData.ansprechpartner?.telefon || ''}
                  onChange={(e) => handleAnsprechpartnerChange('telefon', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ansprechpartner-email">E-Mail</Label>
                <Input
                  id="ansprechpartner-email"
                  type="email"
                  value={formData.ansprechpartner?.email || ''}
                  onChange={(e) => handleAnsprechpartnerChange('email', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notizen">Notizen</Label>
              <Textarea
                id="notizen"
                value={formData.notizen || ''}
                onChange={(e) => handleChange('notizen', e.target.value)}
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

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

