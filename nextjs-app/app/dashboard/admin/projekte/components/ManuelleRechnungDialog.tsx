"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, Plus } from 'lucide-react'
import { Projekt, AngebotPosition } from '@/lib/db/types'
import { toast } from 'sonner'

interface ManuelleRechnungDialogProps {
  projekt: Projekt
  onSuccess: () => void
  children?: React.ReactNode
}

export default function ManuelleRechnungDialog({ projekt, onSuccess, children }: ManuelleRechnungDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    datum: new Date().toISOString().split('T')[0],
    faelligkeitsdatum: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 Tage
    zahlungsbedingungen: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    schlusstext: 'Vielen Dank für Ihren Auftrag!',
    mwstSatz: 19
  })

  const [positionen, setPositionen] = useState<AngebotPosition[]>([])
  const [neuePosition, setNeuePosition] = useState<AngebotPosition>({
    position: '01',
    beschreibung: '',
    menge: 1,
    einheit: 'St.',
    einzelpreis: 0,
    gesamtpreis: 0,
    typ: 'material'
  })

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNeuePositionChange = (field: string, value: any) => {
    const updated = { ...neuePosition, [field]: value }
    
    // Gesamtpreis berechnen
    if (field === 'menge' || field === 'einzelpreis') {
      const menge = field === 'menge' ? parseFloat(value) || 0 : neuePosition.menge
      const einzelpreis = field === 'einzelpreis' ? parseFloat(value) || 0 : neuePosition.einzelpreis
      updated.gesamtpreis = menge * einzelpreis
    }
    
    setNeuePosition(updated)
  }

  const handlePositionHinzufuegen = () => {
    if (!neuePosition.beschreibung || neuePosition.menge <= 0 || neuePosition.einzelpreis <= 0) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    const positionNummer = (positionen.length + 1).toString().padStart(2, '0')
    setPositionen([...positionen, { ...neuePosition, position: positionNummer }])
    
    // Reset
    setNeuePosition({
      position: '01',
      beschreibung: '',
      menge: 1,
      einheit: 'St.',
      einzelpreis: 0,
      gesamtpreis: 0,
      typ: 'material'
    })
  }

  const handlePositionLoeschen = (index: number) => {
    const updated = positionen.filter((_, i) => i !== index)
    // Renumber
    const renumbered = updated.map((p, i) => ({
      ...p,
      position: (i + 1).toString().padStart(2, '0')
    }))
    setPositionen(renumbered)
  }

  const berechneBetraege = () => {
    const netto = positionen.reduce((sum, p) => sum + p.gesamtpreis, 0)
    const mwst = netto * (formData.mwstSatz / 100)
    const brutto = netto + mwst
    return { netto, mwst, brutto }
  }

  const handleSpeichern = async () => {
    if (positionen.length === 0) {
      toast.error('Bitte fügen Sie mindestens eine Position hinzu')
      return
    }

    try {
      setLoading(true)
      const { netto, mwst, brutto } = berechneBetraege()
      
      const rechnungsnummer = `RE-${Date.now()}`
      const rechnungsData = {
        rechnungsnummer,
        projektId: projekt._id,
        projektnummer: projekt.projektnummer,
        kundeId: projekt.kundeId,
        kundeName: projekt.kundeName,
        datum: formData.datum,
        faelligkeitsdatum: formData.faelligkeitsdatum,
        positionen,
        netto,
        mwst,
        mwstSatz: formData.mwstSatz,
        brutto,
        status: 'entwurf',
        typ: 'schlussrechnung',
        zahlungsbedingungen: formData.zahlungsbedingungen,
        schlusstext: formData.schlusstext,
        erstelltAm: new Date().toISOString(),
        zuletztGeaendert: new Date().toISOString()
      }

      const response = await fetch('/api/rechnungen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rechnungsData)
      })

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Rechnung')
      }

      toast.success('Rechnung erfolgreich erstellt')
      setOpen(false)
      setPositionen([])
      setFormData({
        datum: new Date().toISOString().split('T')[0],
        faelligkeitsdatum: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        zahlungsbedingungen: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
        schlusstext: 'Vielen Dank für Ihren Auftrag!',
        mwstSatz: 19
      })
      onSuccess()
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Erstellen der Rechnung')
    } finally {
      setLoading(false)
    }
  }

  const { netto, mwst, brutto } = berechneBetraege()

  return (
    <Dialog open={open} onValueChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
            <Plus className="h-4 w-4 mr-2" />
            Manuelle Rechnung
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Rechnung ohne Angebot erstellen</DialogTitle>
          <DialogDescription className="text-gray-600">
            Projekt: {projekt.projektname} ({projekt.projektnummer})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rechnungsdetails */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-900">Rechnungsdatum *</Label>
              <Input
                type="date"
                value={formData.datum}
                onChange={(e) => handleFormChange('datum', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">Fälligkeitsdatum *</Label>
              <Input
                type="date"
                value={formData.faelligkeitsdatum}
                onChange={(e) => handleFormChange('faelligkeitsdatum', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900">MwSt.-Satz (%)</Label>
            <Input
              type="number"
              value={formData.mwstSatz}
              onChange={(e) => handleFormChange('mwstSatz', parseFloat(e.target.value) || 19)}
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          {/* Positionen hinzufügen */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Neue Position hinzufügen</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="text-gray-900">Beschreibung *</Label>
                  <Textarea
                    value={neuePosition.beschreibung}
                    onChange={(e) => handleNeuePositionChange('beschreibung', e.target.value)}
                    placeholder="z.B. Gerüstrohre 3m"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">Typ *</Label>
                  <Select
                    value={neuePosition.typ}
                    onValueChange={(v) => handleNeuePositionChange('typ', v)}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="dienstleistung">Dienstleistung</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="miete">Miete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">Menge *</Label>
                  <Input
                    type="number"
                    value={neuePosition.menge}
                    onChange={(e) => handleNeuePositionChange('menge', e.target.value)}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">Einheit *</Label>
                  <Select
                    value={neuePosition.einheit}
                    onValueChange={(v) => handleNeuePositionChange('einheit', v)}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="St.">St. (Stück)</SelectItem>
                      <SelectItem value="m">m (Meter)</SelectItem>
                      <SelectItem value="qm">qm (Quadratmeter)</SelectItem>
                      <SelectItem value="lfdm">lfdm (Laufende Meter)</SelectItem>
                      <SelectItem value="stgm">stgm (Ständermeter Gerüst)</SelectItem>
                      <SelectItem value="m³">m³ (Kubikmeter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">Einzelpreis (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={neuePosition.einzelpreis}
                    onChange={(e) => handleNeuePositionChange('einzelpreis', e.target.value)}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-gray-700">
                  Gesamtpreis: {neuePosition.gesamtpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
                <Button onClick={handlePositionHinzufuegen} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Position hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Positionen-Liste */}
          {positionen.length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-900 font-semibold">Hinzugefügte Positionen ({positionen.length})</Label>
              <div className="space-y-2">
                {positionen.map((pos, index) => (
                  <Card key={index} className="bg-white border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-600">{pos.position}</span>
                          <span className="font-medium text-gray-900">{pos.beschreibung}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {pos.menge} {pos.einheit} × {pos.einzelpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € 
                          = {pos.gesamtpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePositionLoeschen(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Summen */}
          {positionen.length > 0 && (
            <Card className="bg-gray-50 border-gray-300">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Netto:</span>
                  <span className="font-medium">{netto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>MwSt. ({formData.mwstSatz}%):</span>
                  <span className="font-medium">{mwst.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
                  <span>Brutto:</span>
                  <span>{brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zahlungsbedingungen */}
          <div className="space-y-2">
            <Label className="text-gray-900">Zahlungsbedingungen</Label>
            <Textarea
              value={formData.zahlungsbedingungen}
              onChange={(e) => handleFormChange('zahlungsbedingungen', e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
              rows={2}
            />
          </div>

          {/* Schlusstext */}
          <div className="space-y-2">
            <Label className="text-gray-900">Schlusstext</Label>
            <Textarea
              value={formData.schlusstext}
              onChange={(e) => handleFormChange('schlusstext', e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleSpeichern} disabled={loading || positionen.length === 0} className="bg-green-600 hover:bg-green-700">
            {loading ? 'Erstelle...' : 'Rechnung erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

