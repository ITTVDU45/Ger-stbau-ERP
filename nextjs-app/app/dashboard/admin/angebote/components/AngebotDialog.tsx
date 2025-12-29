"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Angebot, AngebotPosition } from '@/lib/db/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PositionenEditor from './PositionenEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AngebotDialogProps {
  open: boolean
  angebot?: Angebot
  onClose: (updated: boolean) => void
}

export default function AngebotDialog({ open, angebot, onClose }: AngebotDialogProps) {
  const [formData, setFormData] = useState<Partial<Angebot>>({
    angebotsnummer: '',
    kundeId: '',
    kundeName: '',
    datum: new Date(),
    gueltigBis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage
    betreff: '',
    positionen: [],
    zwischensumme: 0,
    rabatt: 0,
    rabattProzent: 0,
    netto: 0,
    mwstSatz: 19,
    mwstBetrag: 0,
    brutto: 0,
    status: 'entwurf',
    versionsnummer: 1
  })
  
  const [kunden, setKunden] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadKunden()
  }, [])

  useEffect(() => {
    if (angebot) {
      setFormData(angebot)
    } else {
      // Angebotsnummer automatisch generieren
      const jahr = new Date().getFullYear()
      const angebotsnummer = `A-${jahr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
      
      setFormData({
        angebotsnummer,
        kundeId: '',
        kundeName: '',
        datum: new Date(),
        gueltigBis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        betreff: '',
        positionen: [],
        zwischensumme: 0,
        rabatt: 0,
        rabattProzent: 0,
        netto: 0,
        mwstSatz: 19,
        mwstBetrag: 0,
        brutto: 0,
        status: 'entwurf',
        versionsnummer: 1
      })
    }
  }, [angebot, open])

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

  const handleKundeChange = (kundeId: string) => {
    const k = kunden.find(ku => ku._id === kundeId)
    if (k) {
      const adresse = k.adresse ? `${k.adresse.strasse || ''} ${k.adresse.hausnummer || ''}, ${k.adresse.plz || ''} ${k.adresse.ort || ''}`.trim() : ''
      setFormData(prev => ({
        ...prev,
        kundeId,
        kundeName: k.firma || `${k.vorname} ${k.nachname}`,
        kundeAdresse: adresse
      }))
    }
  }

  const handlePositionenChange = (positionen: AngebotPosition[]) => {
    // Kalkulation durchführen
    const zwischensumme = positionen.reduce((sum, p) => sum + p.gesamtpreis, 0)
    const rabattBetrag = formData.rabattProzent ? (zwischensumme * formData.rabattProzent / 100) : (formData.rabatt || 0)
    const netto = zwischensumme - rabattBetrag
    const mwstBetrag = netto * (formData.mwstSatz || 19) / 100
    const brutto = netto + mwstBetrag

    setFormData(prev => ({
      ...prev,
      positionen,
      zwischensumme,
      rabatt: rabattBetrag,
      netto,
      mwstBetrag,
      brutto
    }))
  }

  const handleRabattChange = (prozent: number) => {
    const rabattBetrag = formData.zwischensumme * prozent / 100
    const netto = formData.zwischensumme - rabattBetrag
    const mwstBetrag = netto * (formData.mwstSatz || 19) / 100
    const brutto = netto + mwstBetrag

    setFormData(prev => ({
      ...prev,
      rabattProzent: prozent,
      rabatt: rabattBetrag,
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
      const url = angebot?._id 
        ? `/api/angebote/${angebot._id}` 
        : '/api/angebote'
      
      const method = angebot?._id ? 'PUT' : 'POST'
      
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
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{angebot ? 'Angebot bearbeiten' : 'Neues Angebot'}</DialogTitle>
          <DialogDescription>Angebot erstellen und Positionen hinzufügen</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="allgemein" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
            <TabsTrigger value="positionen">Positionen</TabsTrigger>
            <TabsTrigger value="kalkulation">Kalkulation</TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="angebotsnummer">Angebotsnummer *</Label>
                <Input
                  id="angebotsnummer"
                  value={formData.angebotsnummer}
                  onChange={(e) => handleChange('angebotsnummer', e.target.value)}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="datum">Datum *</Label>
                <Input
                  id="datum"
                  type="date"
                  value={formData.datum ? new Date(formData.datum).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('datum', new Date(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gueltigBis">Gültig bis</Label>
                <Input
                  id="gueltigBis"
                  type="date"
                  value={formData.gueltigBis ? new Date(formData.gueltigBis).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('gueltigBis', new Date(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="betreff">Betreff</Label>
              <Input
                id="betreff"
                value={formData.betreff || ''}
                onChange={(e) => handleChange('betreff', e.target.value)}
                placeholder="z.B. Gerüstbau für Neubau Einkaufszentrum"
              />
            </div>
          </TabsContent>

          <TabsContent value="positionen" className="space-y-4">
            <PositionenEditor
              positionen={formData.positionen || []}
              onChange={handlePositionenChange}
            />
          </TabsContent>

          <TabsContent value="kalkulation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Kalkulation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Zwischensumme:</span>
                  <span className="font-semibold text-gray-900">{formData.zwischensumme.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>

                <div className="flex items-center justify-between gap-4 py-2 border-t">
                  <Label htmlFor="rabatt">Rabatt (%):</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="rabatt"
                      type="number"
                      step="0.1"
                      value={formData.rabattProzent || 0}
                      onChange={(e) => handleRabattChange(parseFloat(e.target.value) || 0)}
                      className="w-24 text-right"
                    />
                    <span className="text-gray-600 w-32 text-right">- {formData.rabatt?.toLocaleString('de-DE', { minimumFractionDigits: 2 }) || '0,00'} €</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-t font-semibold">
                  <span className="text-gray-700">Netto:</span>
                  <span className="text-gray-900">{formData.netto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">MwSt. ({formData.mwstSatz}%):</span>
                  <span className="text-gray-600">{(formData.mwstBetrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t-2 border-gray-300">
                  <span className="text-lg font-bold text-gray-900">Gesamtsumme (Brutto):</span>
                  <span className="text-lg font-bold text-green-600">{formData.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>
              </CardContent>
            </Card>
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

