"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { X, AlertCircle } from 'lucide-react'
import { Mitarbeiter } from '@/lib/db/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface MitarbeiterDialogProps {
  open: boolean
  mitarbeiter?: Mitarbeiter
  onClose: (updated: boolean) => void
}

export default function MitarbeiterDialog({ open, mitarbeiter, onClose }: MitarbeiterDialogProps) {
  const [formData, setFormData] = useState<Partial<Mitarbeiter>>({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    personalnummer: '',
    beschaeftigungsart: 'festangestellt',
    eintrittsdatum: new Date(),
    aktiv: true,
    qualifikationen: [],
    adresse: {},
    stundensatz: 0,
    wochenarbeitsstunden: 40,
    notizen: '',
    dokumente: []
  })
  
  const [neueQualifikation, setNeueQualifikation] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingPersonalnummer, setLoadingPersonalnummer] = useState(false)
  const [personalnummerFehler, setPersonalnummerFehler] = useState('')
  const [checkingPersonalnummer, setCheckingPersonalnummer] = useState(false)

  // Nächste Personalnummer laden, wenn neuer Mitarbeiter erstellt wird
  useEffect(() => {
    const ladeNaechstePersonalnummer = async () => {
      if (!mitarbeiter && open) {
        setLoadingPersonalnummer(true)
        try {
          const response = await fetch('/api/mitarbeiter/naechste-personalnummer')
          const data = await response.json()
          if (data.erfolg) {
            setFormData(prev => ({
              ...prev,
              personalnummer: data.personalnummer
            }))
          }
        } catch (error) {
          console.error('Fehler beim Laden der nächsten Personalnummer:', error)
        } finally {
          setLoadingPersonalnummer(false)
        }
      }
    }

    if (mitarbeiter) {
      setFormData(mitarbeiter)
    } else {
      setFormData({
        vorname: '',
        nachname: '',
        email: '',
        telefon: '',
        personalnummer: '',
        beschaeftigungsart: 'festangestellt',
        eintrittsdatum: new Date(),
        aktiv: true,
        qualifikationen: [],
        adresse: {},
        stundensatz: 0,
        wochenarbeitsstunden: 40,
        notizen: '',
        dokumente: []
      })
      ladeNaechstePersonalnummer()
    }
  }, [mitarbeiter, open])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAdresseChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      adresse: { ...prev.adresse, [field]: value }
    }))
  }

  const handleQualifikationHinzufuegen = () => {
    if (neueQualifikation.trim()) {
      setFormData(prev => ({
        ...prev,
        qualifikationen: [...(prev.qualifikationen || []), neueQualifikation.trim()]
      }))
      setNeueQualifikation('')
    }
  }

  const handleQualifikationEntfernen = (index: number) => {
    setFormData(prev => ({
      ...prev,
      qualifikationen: prev.qualifikationen?.filter((_, i) => i !== index) || []
    }))
  }

  // Personalnummer prüfen (Duplikat-Check)
  const pruefePersonalnummer = async (personalnummer: string) => {
    if (!personalnummer || personalnummer.trim() === '') {
      setPersonalnummerFehler('')
      return true
    }

    // Wenn wir einen existierenden Mitarbeiter bearbeiten und die Nummer gleich bleibt
    if (mitarbeiter && mitarbeiter.personalnummer === personalnummer) {
      setPersonalnummerFehler('')
      return true
    }

    setCheckingPersonalnummer(true)
    setPersonalnummerFehler('')

    try {
      const response = await fetch(`/api/mitarbeiter/check-personalnummer?personalnummer=${encodeURIComponent(personalnummer)}`)
      const data = await response.json()

      if (!response.ok || !data.erfolg) {
        setPersonalnummerFehler('Fehler bei der Prüfung')
        return false
      }

      if (!data.verfuegbar) {
        setPersonalnummerFehler(`⚠️ Personalnummer "${personalnummer}" ist bereits vergeben`)
        toast.error('Personalnummer bereits vergeben', {
          description: `Die Personalnummer "${personalnummer}" wird bereits von einem anderen Mitarbeiter verwendet.`
        })
        return false
      }

      setPersonalnummerFehler('')
      return true
    } catch (error) {
      console.error('Fehler beim Prüfen der Personalnummer:', error)
      setPersonalnummerFehler('Fehler bei der Prüfung')
      return false
    } finally {
      setCheckingPersonalnummer(false)
    }
  }

  const handlePersonalnummerChange = async (value: string) => {
    handleChange('personalnummer', value)
    
    // Debounce: Prüfe erst nach kurzem Delay
    const timer = setTimeout(() => {
      pruefePersonalnummer(value)
    }, 500)

    return () => clearTimeout(timer)
  }

  const handleSubmit = async () => {
    // Validierung vor dem Absenden
    if (!formData.vorname || !formData.nachname || !formData.email) {
      toast.error('Pflichtfelder fehlen', {
        description: 'Bitte füllen Sie Vorname, Nachname und E-Mail aus'
      })
      return
    }

    if (!formData.personalnummer || formData.personalnummer.trim() === '') {
      toast.error('Personalnummer fehlt', {
        description: 'Bitte geben Sie eine Personalnummer ein'
      })
      return
    }

    // Prüfe Personalnummer nochmal vor dem Speichern
    const personalnummerGueltig = await pruefePersonalnummer(formData.personalnummer)
    if (!personalnummerGueltig) {
      toast.error('Personalnummer ungültig', {
        description: 'Die eingegebene Personalnummer ist bereits vergeben'
      })
      return
    }

    setSaving(true)
    try {
      const url = mitarbeiter?._id 
        ? `/api/mitarbeiter/${mitarbeiter._id}` 
        : '/api/mitarbeiter'
      
      const method = mitarbeiter?._id ? 'PUT' : 'POST'
      
      // Daten für API vorbereiten - Datum korrekt konvertieren
      const submitData = {
        ...formData,
        eintrittsdatum: formData.eintrittsdatum 
          ? (formData.eintrittsdatum instanceof Date 
              ? formData.eintrittsdatum.toISOString() 
              : new Date(formData.eintrittsdatum).toISOString())
          : new Date().toISOString(),
        austrittsdatum: formData.austrittsdatum
          ? (formData.austrittsdatum instanceof Date
              ? formData.austrittsdatum.toISOString()
              : new Date(formData.austrittsdatum).toISOString())
          : undefined
      }

      console.log('📤 Sende Mitarbeiter-Daten:', submitData)
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const data = await response.json()
      console.log('📥 API Response:', data)

      if (response.ok) {
        onClose(true)
      } else {
        // Detaillierte Fehlermeldung anzeigen
        const fehlerText = data.fehler || 'Fehler beim Speichern'
        const details = data.details ? `\n\nDetails: ${data.details}` : ''
        alert(`${fehlerText}${details}`)
        console.error('API Fehler:', data)
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      alert(`Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mitarbeiter ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Daten des Mitarbeiters ein
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="allgemein" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
            <TabsTrigger value="adresse">Adresse & Kontakt</TabsTrigger>
            <TabsTrigger value="arbeitszeit">Arbeitszeit & Quali.</TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personalnummer" className="flex items-center gap-2">
                  Personalnummer *
                  {checkingPersonalnummer && (
                    <span className="text-xs text-gray-500">(wird geprüft...)</span>
                  )}
                </Label>
                <Input
                  id="personalnummer"
                  value={formData.personalnummer || ''}
                  onChange={(e) => handlePersonalnummerChange(e.target.value)}
                  placeholder="z.B. M-001"
                  className={personalnummerFehler ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                  disabled={loadingPersonalnummer}
                />
                {personalnummerFehler && (
                  <div className="flex items-start gap-2 text-xs text-red-600 mt-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{personalnummerFehler}</span>
                  </div>
                )}
                {!personalnummerFehler && formData.personalnummer && !checkingPersonalnummer && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ Personalnummer verfügbar
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="beschaeftigungsart">Beschäftigungsart *</Label>
                <Select
                  value={formData.beschaeftigungsart}
                  onValueChange={(v) => handleChange('beschaeftigungsart', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="festangestellt">Festangestellt</SelectItem>
                    <SelectItem value="aushilfe">Aushilfe</SelectItem>
                    <SelectItem value="subunternehmer">Subunternehmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vorname">Vorname *</Label>
                <Input
                  id="vorname"
                  value={formData.vorname}
                  onChange={(e) => handleChange('vorname', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nachname">Nachname *</Label>
                <Input
                  id="nachname"
                  value={formData.nachname}
                  onChange={(e) => handleChange('nachname', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eintrittsdatum">Eintrittsdatum *</Label>
              <Input
                id="eintrittsdatum"
                type="date"
                value={formData.eintrittsdatum ? new Date(formData.eintrittsdatum).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('eintrittsdatum', new Date(e.target.value))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="aktiv"
                checked={formData.aktiv}
                onCheckedChange={(checked) => handleChange('aktiv', checked)}
              />
              <Label htmlFor="aktiv">Aktiv</Label>
            </div>
          </TabsContent>

          <TabsContent value="adresse" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefon">Telefon</Label>
              <Input
                id="telefon"
                type="tel"
                value={formData.telefon || ''}
                onChange={(e) => handleChange('telefon', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="strasse">Straße</Label>
                <Input
                  id="strasse"
                  value={formData.adresse?.strasse || ''}
                  onChange={(e) => handleAdresseChange('strasse', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hausnummer">Nr.</Label>
                <Input
                  id="hausnummer"
                  value={formData.adresse?.hausnummer || ''}
                  onChange={(e) => handleAdresseChange('hausnummer', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plz">PLZ</Label>
                <Input
                  id="plz"
                  value={formData.adresse?.plz || ''}
                  onChange={(e) => handleAdresseChange('plz', e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="ort">Ort</Label>
                <Input
                  id="ort"
                  value={formData.adresse?.ort || ''}
                  onChange={(e) => handleAdresseChange('ort', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="arbeitszeit" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stundensatz">Stundensatz (€)</Label>
                <Input
                  id="stundensatz"
                  type="number"
                  step="0.01"
                  value={formData.stundensatz || 0}
                  onChange={(e) => handleChange('stundensatz', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wochenarbeitsstunden">Wochenstunden</Label>
                <Input
                  id="wochenarbeitsstunden"
                  type="number"
                  value={formData.wochenarbeitsstunden || 40}
                  onChange={(e) => handleChange('wochenarbeitsstunden', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Qualifikationen</Label>
              <div className="flex gap-2">
                <Input
                  value={neueQualifikation}
                  onChange={(e) => setNeueQualifikation(e.target.value)}
                  placeholder="z.B. Gerüstbauer, Staplerführerschein"
                  onKeyPress={(e) => e.key === 'Enter' && handleQualifikationHinzufuegen()}
                />
                <Button type="button" onClick={handleQualifikationHinzufuegen}>
                  Hinzufügen
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.qualifikationen?.map((qual, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {qual}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleQualifikationEntfernen(index)}
                    />
                  </Badge>
                ))}
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
          <Button variant="outline" onClick={() => onClose(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

