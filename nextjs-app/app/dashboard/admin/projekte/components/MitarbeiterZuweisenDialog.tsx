"use client"

import React, { useState, useEffect } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users } from 'lucide-react'
import { Projekt, Mitarbeiter } from '@/lib/db/types'
import { toast } from 'sonner'

interface MitarbeiterZuweisenDialogProps {
  projekt: Projekt
  onSuccess: () => void
  children?: React.ReactNode
}

export default function MitarbeiterZuweisenDialog({ projekt, onSuccess, children }: MitarbeiterZuweisenDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mitarbeiterListe, setMitarbeiterListe] = useState<Mitarbeiter[]>([])
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    rolle: 'monteur',
    aufbauVon: new Date().toISOString().split('T')[0],
    aufbauBis: '',
    abbauVon: '',
    abbauBis: '',
    stundenAufbau: 0,
    stundenAbbau: 0
  })

  useEffect(() => {
    if (open) {
      loadMitarbeiter()
    }
  }, [open])

  const loadMitarbeiter = async () => {
    try {
      const response = await fetch('/api/mitarbeiter')
      if (response.ok) {
        const data = await response.json()
        // Zeige alle, außer explizit deaktivierte (aktiv === false)
        const verfuegbare = (data.mitarbeiter || []).filter((m: Mitarbeiter) => m.aktiv !== false)
        setMitarbeiterListe(verfuegbare)
      } else {
        toast.error('Fehler beim Laden der Mitarbeiter')
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error)
      toast.error('Fehler beim Laden der Mitarbeiter')
    }
  }

  const handleToggleMitarbeiter = (mitarbeiterId: string) => {
    const newSelected = new Set(selectedMitarbeiter)
    if (newSelected.has(mitarbeiterId)) {
      newSelected.delete(mitarbeiterId)
    } else {
      newSelected.add(mitarbeiterId)
    }
    setSelectedMitarbeiter(newSelected)
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleZuweisen = async () => {
    if (selectedMitarbeiter.size === 0) {
      toast.error('Bitte wählen Sie mindestens einen Mitarbeiter aus')
      return
    }

    try {
      setLoading(true)
      
      // Gesamt-Zeitraum ableiten (für Anzeige in Übersicht)
      const overallVon = formData.aufbauVon || formData.abbauVon || new Date().toISOString().split('T')[0]
      // Bis = spätestes angegebenes Datum (Aufbau oder Abbau), fallback auf Von
      const overallBis =
        formData.abbauBis ||
        formData.aufbauBis ||
        formData.abbauVon ||
        formData.aufbauVon ||
        ''

      // Neue Mitarbeiter-Zuweisungen erstellen
      const neueMitarbeiter = Array.from(selectedMitarbeiter).map(id => {
        const mitarbeiter = mitarbeiterListe.find(m => m._id === id)
        return {
          mitarbeiterId: id,
          mitarbeiterName: mitarbeiter ? `${mitarbeiter.vorname} ${mitarbeiter.nachname}` : 'Unbekannt',
          rolle: formData.rolle,
          von: overallVon,
          bis: overallBis || undefined,
          aufbauVon: formData.aufbauVon,
          aufbauBis: formData.aufbauBis || undefined,
          abbauVon: formData.abbauVon || undefined,
          abbauBis: formData.abbauBis || undefined,
          stundenAufbau: formData.stundenAufbau,
          stundenAbbau: formData.stundenAbbau
        }
      })

      // Verwende neue API-Route, die auch Zeiterfassungen erstellt
      const response = await fetch(`/api/projekte/${projekt._id}/mitarbeiter-zuweisen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neueMitarbeiter
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Zuweisen der Mitarbeiter')
      }

      const result = await response.json()
      
      toast.success(
        `${selectedMitarbeiter.size} Mitarbeiter zugewiesen. ${result.erstellteZeiterfassungen || 0} Zeiterfassungen erstellt.`
      )
      setOpen(false)
      setSelectedMitarbeiter(new Set())
      setFormData({
        rolle: 'monteur',
        aufbauVon: new Date().toISOString().split('T')[0],
        aufbauBis: '',
        abbauVon: '',
        abbauBis: '',
        stundenAufbau: 0,
        stundenAbbau: 0
      })
      onSuccess()
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Zuweisen der Mitarbeiter')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
            <Users className="h-4 w-4 mr-2" />
            Mitarbeiter zuweisen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Mitarbeiter zum Projekt zuweisen</DialogTitle>
          <DialogDescription className="text-gray-600">
            Projekt: {projekt.projektname} ({projekt.projektnummer})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mitarbeiter-Auswahl */}
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Mitarbeiter auswählen *</Label>
            {mitarbeiterListe.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                Keine verfügbaren Mitarbeiter gefunden
              </div>
            ) : (
              <ScrollArea className="h-[200px] border border-gray-300 rounded-md p-4 bg-white">
                <div className="space-y-3">
                  {mitarbeiterListe.map((mitarbeiter) => (
                    <div key={mitarbeiter._id} className="flex items-center space-x-3">
                      <Checkbox
                        id={mitarbeiter._id}
                        checked={selectedMitarbeiter.has(mitarbeiter._id || '')}
                        onCheckedChange={() => handleToggleMitarbeiter(mitarbeiter._id || '')}
                      />
                      <label
                        htmlFor={mitarbeiter._id}
                        className="flex-1 text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {mitarbeiter.vorname} {mitarbeiter.nachname}
                        {mitarbeiter.personalnummer && (
                          <span className="text-gray-600 ml-2">(#{mitarbeiter.personalnummer})</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <p className="text-xs text-gray-600">
              {selectedMitarbeiter.size} Mitarbeiter ausgewählt
            </p>
          </div>

          {/* Rolle */}
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Rolle im Projekt *</Label>
            <Select
              value={formData.rolle}
              onValueChange={(v) => handleFormChange('rolle', v)}
            >
              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kolonnenfuehrer">Kolonnenführer</SelectItem>
                <SelectItem value="vorarbeiter">Vorarbeiter</SelectItem>
                <SelectItem value="monteur">Monteur</SelectItem>
                <SelectItem value="helfer">Helfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aufbau/Abbau Planung */}
          <div className="border-t border-gray-200 pt-4">
            <Label className="text-gray-900 font-semibold mb-3 block">
              Aufbau/Abbau Planung (optional)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Aufbau: Von *</Label>
                <Input
                  type="date"
                  value={formData.aufbauVon}
                  onChange={(e) => handleFormChange('aufbauVon', e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Aufbau: Bis (optional)</Label>
                <Input
                  type="date"
                  value={formData.aufbauBis}
                  onChange={(e) => handleFormChange('aufbauBis', e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Stunden Aufbau
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.stundenAufbau}
                  onChange={(e) => handleFormChange('stundenAufbau', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white border-gray-300 text-gray-900"
                />
                <p className="text-xs text-gray-500">Geplante Aufbau-Stunden</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Stunden Abbau
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.stundenAbbau}
                  onChange={(e) => handleFormChange('stundenAbbau', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white border-gray-300 text-gray-900"
                />
                <p className="text-xs text-gray-500">Geplante Abbau-Stunden</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Abbau: Von (optional)</Label>
                <Input
                  type="date"
                  value={formData.abbauVon}
                  onChange={(e) => handleFormChange('abbauVon', e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Abbau: Bis (optional)</Label>
                <Input
                  type="date"
                  value={formData.abbauBis}
                  onChange={(e) => handleFormChange('abbauBis', e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleZuweisen} 
            disabled={loading || selectedMitarbeiter.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Weise zu...' : `${selectedMitarbeiter.size} Mitarbeiter zuweisen`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

