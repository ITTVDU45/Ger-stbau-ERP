"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Rechnung } from '@/lib/db/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PositionenEditor from '../../angebote/components/PositionenEditor'

interface RechnungDialogProps {
  open: boolean
  rechnung?: Rechnung
  onClose: (updated: boolean) => void
}

export default function RechnungDialog({ open, rechnung, onClose }: RechnungDialogProps) {
  const [formData, setFormData] = useState<Partial<Rechnung>>({
    rechnungsnummer: '',
    kundeId: '',
    kundeName: '',
    rechnungsdatum: new Date(),
    zahlungsziel: 14,
    faelligAm: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    typ: 'vollrechnung',
    positionen: [],
    zwischensumme: 0,
    netto: 0,
    mwstSatz: 19,
    mwstBetrag: 0,
    brutto: 0,
    status: 'entwurf',
    mahnstufe: 0
  })
  
  const [kunden, setKunden] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadKunden()
  }, [])

  useEffect(() => {
    if (rechnung) {
      setFormData(rechnung)
    } else {
      const jahr = new Date().getFullYear()
      const rechnungsnummer = `R-${jahr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
      
      setFormData({
        rechnungsnummer,
        kundeId: '',
        kundeName: '',
        rechnungsdatum: new Date(),
        zahlungsziel: 14,
        faelligAm: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        typ: 'vollrechnung',
        positionen: [],
        zwischensumme: 0,
        netto: 0,
        mwstSatz: 19,
        mwstBetrag: 0,
        brutto: 0,
        status: 'entwurf',
        mahnstufe: 0
      })
    }
  }, [rechnung, open])

  const loadKunden = async () => {
    try {
      const response = await fetch('/api/kunden')
      if (response.ok) {
        const data = await response.json()
        setKunden(data.kunden || [])
      }
    } catch (error) {
      console.error('Fehler:', error)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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

  const handlePositionenChange = (positionen: any[]) => {
    const zwischensumme = positionen.reduce((sum, p) => sum + p.gesamtpreis, 0)
    const netto = zwischensumme
    const mwstBetrag = netto * (formData.mwstSatz || 19) / 100
    const brutto = netto + mwstBetrag

    setFormData(prev => ({
      ...prev,
      positionen,
      zwischensumme,
      netto,
      mwstBetrag,
      brutto
    }))
  }

  const handleSubmit = async () => {
    if (!formData.kundeId || !formData.positionen || formData.positionen.length === 0) {
      alert('Bitte Kunde auswählen und mindestens eine Position hinzufügen')
      return
    }

    setSaving(true)
    try {
      const url = rechnung?._id ? `/api/rechnungen/${rechnung._id}` : '/api/rechnungen'
      const method = rechnung?._id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          erstelltVon: 'admin'
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
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rechnung ? 'Rechnung bearbeiten' : 'Neue Rechnung'}</DialogTitle>
          <DialogDescription>Rechnung erstellen</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="allgemein" className="w-full">
          <TabsList>
            <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
            <TabsTrigger value="positionen">Positionen</TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rechnungsnummer *</Label>
                <Input value={formData.rechnungsnummer} onChange={(e) => handleChange('rechnungsnummer', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kunde *</Label>
                <Select value={formData.kundeId} onValueChange={handleKundeChange}>
                  <SelectTrigger><SelectValue placeholder="Kunde auswählen" /></SelectTrigger>
                  <SelectContent>
                    {kunden.map(k => (
                      <SelectItem key={k._id} value={k._id}>{k.firma || `${k.vorname} ${k.nachname}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={formData.typ} onValueChange={(v) => handleChange('typ', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vollrechnung">Vollrechnung</SelectItem>
                    <SelectItem value="teilrechnung">Teilrechnung</SelectItem>
                    <SelectItem value="abschlagsrechnung">Abschlagsrechnung</SelectItem>
                    <SelectItem value="schlussrechnung">Schlussrechnung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rechnungsdatum *</Label>
                <Input type="date" value={formData.rechnungsdatum ? new Date(formData.rechnungsdatum).toISOString().split('T')[0] : ''} onChange={(e) => handleChange('rechnungsdatum', new Date(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Zahlungsziel (Tage)</Label>
                <Input type="number" value={formData.zahlungsziel || 14} onChange={(e) => {
                  const tage = parseInt(e.target.value)
                  const faelligAm = new Date(new Date(formData.rechnungsdatum || new Date()).getTime() + tage * 24 * 60 * 60 * 1000)
                  handleChange('zahlungsziel', tage)
                  handleChange('faelligAm', faelligAm)
                }} />
              </div>
              <div className="space-y-2">
                <Label>Fällig am</Label>
                <Input type="date" value={formData.faelligAm ? new Date(formData.faelligAm).toISOString().split('T')[0] : ''} disabled className="bg-gray-50" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="positionen">
            <PositionenEditor positionen={formData.positionen || []} onChange={handlePositionenChange} />
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between font-bold text-lg text-gray-900">
                <span>Gesamtsumme (Brutto):</span>
                <span className="text-purple-600">{formData.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

