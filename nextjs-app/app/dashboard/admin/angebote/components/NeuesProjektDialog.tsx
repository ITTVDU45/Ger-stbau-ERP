"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Projekt } from '@/lib/db/types'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface NeuesProjektDialogProps {
  kundeId?: string
  kundeName?: string
  onProjektErstellt: (projekt: Projekt) => void
}

export default function NeuesProjektDialog({ kundeId, kundeName, onProjektErstellt }: NeuesProjektDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Projekt>>({
    projektnummer: '',
    projektname: '',
    kundeId: kundeId || '',
    kundeName: kundeName || '',
    standort: '',
    ansprechpartner: {
      name: '',
      telefon: '',
      email: ''
    },
    beginn: new Date(),
    ende: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 Tage später
    status: 'in_planung',
    beschreibung: '',
    zugewieseneMitarbeiter: []
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAnsprechpartnerChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      ansprechpartner: {
        ...prev.ansprechpartner,
        [field]: value
      }
    }))
  }

  const generiereProjektnummer = () => {
    const jahr = new Date().getFullYear()
    const projektnummer = `P-${jahr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    handleChange('projektnummer', projektnummer)
  }

  const handleSpeichern = async () => {
    if (!formData.projektname || !formData.kundeId || !formData.standort) {
      toast.error('Unvollständige Eingabe', {
        description: 'Bitte Projektname, Kunde und Standort ausfüllen'
      })
      return
    }

    if (!formData.projektnummer) {
      generiereProjektnummer()
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setSaving(true)
    try {
      const response = await fetch('/api/projekte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          erstelltAm: new Date(),
          zuletztGeaendert: new Date()
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Projekt erstellt', {
          description: `${formData.projektnummer}: ${formData.projektname}`
        })
        
        onProjektErstellt(data.projekt)
        setOpen(false)
        
        // Reset
        setFormData({
          projektnummer: '',
          projektname: '',
          kundeId: kundeId || '',
          kundeName: kundeName || '',
          standort: '',
          ansprechpartner: {
            name: '',
            telefon: '',
            email: ''
          },
          beginn: new Date(),
          ende: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: 'in_planung',
          beschreibung: '',
          zugewieseneMitarbeiter: []
        })
      } else {
        const error = await response.json()
        toast.error('Fehler beim Erstellen', {
          description: error.message || 'Projekt konnte nicht erstellt werden'
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler', {
        description: 'Netzwerkfehler beim Erstellen des Projekts'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && !formData.projektnummer) {
      generiereProjektnummer()
    }
    if (isOpen && kundeId) {
      setFormData(prev => ({
        ...prev,
        kundeId,
        kundeName: kundeName || ''
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-gray-300 text-gray-900 hover:bg-gray-50">
          <Plus className="h-4 w-4 mr-1 text-gray-700" />
          <span className="font-medium">Neues Projekt</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 font-bold text-xl">Neues Projekt erstellen</DialogTitle>
          <DialogDescription className="text-gray-700">
            Erstellen Sie ein neues Projekt für dieses Angebot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Projektnummer *</Label>
              <Input
                value={formData.projektnummer}
                onChange={(e) => handleChange('projektnummer', e.target.value)}
                placeholder="P-2024-0001"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Projektname *</Label>
              <Input
                value={formData.projektname}
                onChange={(e) => handleChange('projektname', e.target.value)}
                placeholder="z.B. Gerüstbau Baustelle XY"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Kunde</Label>
              <Input
                value={formData.kundeName}
                disabled
                className="bg-gray-100 border-gray-300 text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Standort *</Label>
              <Input
                value={formData.standort}
                onChange={(e) => handleChange('standort', e.target.value)}
                placeholder="z.B. Berlin, Hauptstraße 123"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Beschreibung</Label>
            <Textarea
              value={formData.beschreibung}
              onChange={(e) => handleChange('beschreibung', e.target.value)}
              placeholder="Projektbeschreibung..."
              rows={3}
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Ansprechpartner</Label>
              <Input
                value={formData.ansprechpartner?.name}
                onChange={(e) => handleAnsprechpartnerChange('name', e.target.value)}
                placeholder="Name"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Telefon</Label>
              <Input
                value={formData.ansprechpartner?.telefon}
                onChange={(e) => handleAnsprechpartnerChange('telefon', e.target.value)}
                placeholder="+49..."
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">E-Mail</Label>
              <Input
                type="email"
                value={formData.ansprechpartner?.email}
                onChange={(e) => handleAnsprechpartnerChange('email', e.target.value)}
                placeholder="email@beispiel.de"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Beginn *</Label>
              <Input
                type="date"
                value={formData.beginn ? new Date(formData.beginn).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('beginn', new Date(e.target.value))}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Ende *</Label>
              <Input
                type="date"
                value={formData.ende ? new Date(formData.ende).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('ende', new Date(e.target.value))}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Status *</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
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

          <div className="border-t border-gray-300 pt-4 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="border-gray-300 text-gray-900 hover:bg-gray-50"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSpeichern}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <span className="font-medium">Projekt erstellen</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

