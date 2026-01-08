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
import { X, AlertCircle, Plus, Pencil, Trash2, Calendar } from 'lucide-react'
import { Mitarbeiter, Urlaub } from '@/lib/db/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

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
  
  // Abwesenheiten
  const [abwesenheiten, setAbwesenheiten] = useState<Urlaub[]>([])
  const [loadingAbwesenheiten, setLoadingAbwesenheiten] = useState(false)
  const [editingAbwesenheit, setEditingAbwesenheit] = useState<Urlaub | null>(null)
  const [showAbwesenheitForm, setShowAbwesenheitForm] = useState(false)
  const [abwesenheitForm, setAbwesenheitForm] = useState({
    von: '',
    bis: '',
    typ: 'urlaub' as 'urlaub' | 'krankheit' | 'sonderurlaub' | 'unbezahlt' | 'sonstiges',
    status: 'genehmigt' as 'beantragt' | 'genehmigt' | 'abgelehnt',
    grund: '',
    vertretung: ''
  })
  const [mitarbeiterListe, setMitarbeiterListe] = useState<Mitarbeiter[]>([])

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

  // Abwesenheiten laden
  const ladeAbwesenheiten = async () => {
    if (!mitarbeiter?._id) return
    
    setLoadingAbwesenheiten(true)
    try {
      const response = await fetch(`/api/urlaub?mitarbeiterId=${mitarbeiter._id}`)
      const data = await response.json()
      if (data.erfolg) {
        setAbwesenheiten(data.urlaube || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Abwesenheiten:', error)
      toast.error('Fehler beim Laden der Abwesenheiten')
    } finally {
      setLoadingAbwesenheiten(false)
    }
  }

  // Mitarbeiterliste für Vertretung laden
  const ladeMitarbeiterListe = async () => {
    try {
      const response = await fetch('/api/mitarbeiter')
      const data = await response.json()
      if (data.erfolg) {
        setMitarbeiterListe(data.mitarbeiter || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error)
    }
  }

  // Abwesenheiten beim Öffnen des Dialogs laden
  useEffect(() => {
    if (open && mitarbeiter?._id) {
      ladeAbwesenheiten()
      ladeMitarbeiterListe()
    }
  }, [open, mitarbeiter?._id])

  // Abwesenheit speichern
  const handleAbwesenheitSpeichern = async () => {
    if (!abwesenheitForm.von || !abwesenheitForm.bis) {
      toast.error('Pflichtfelder fehlen', {
        description: 'Bitte geben Sie Von- und Bis-Datum ein'
      })
      return
    }

    if (new Date(abwesenheitForm.von) > new Date(abwesenheitForm.bis)) {
      toast.error('Ungültiger Zeitraum', {
        description: 'Das Von-Datum muss vor dem Bis-Datum liegen'
      })
      return
    }

    try {
      // Anzahl Tage berechnen
      const von = new Date(abwesenheitForm.von)
      const bis = new Date(abwesenheitForm.bis)
      const diffTime = Math.abs(bis.getTime() - von.getTime())
      const anzahlTage = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

      // Vertretungsname ermitteln
      const vertretungMitarbeiter = mitarbeiterListe.find(m => m._id === abwesenheitForm.vertretung)
      const vertretungName = vertretungMitarbeiter 
        ? `${vertretungMitarbeiter.vorname} ${vertretungMitarbeiter.nachname}`
        : undefined

      const payload = {
        mitarbeiterId: mitarbeiter?._id,
        mitarbeiterName: `${formData.vorname} ${formData.nachname}`,
        von: abwesenheitForm.von,
        bis: abwesenheitForm.bis,
        typ: abwesenheitForm.typ,
        status: abwesenheitForm.status,
        grund: abwesenheitForm.grund || undefined,
        vertretung: abwesenheitForm.vertretung || undefined,
        vertretungName: vertretungName,
        anzahlTage
      }

      const url = editingAbwesenheit?._id
        ? `/api/urlaub/${editingAbwesenheit._id}`
        : '/api/urlaub'
      const method = editingAbwesenheit?._id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(
          editingAbwesenheit ? 'Abwesenheit aktualisiert' : 'Abwesenheit hinzugefügt'
        )
        setShowAbwesenheitForm(false)
        setEditingAbwesenheit(null)
        setAbwesenheitForm({
          von: '',
          bis: '',
          typ: 'urlaub',
          status: 'genehmigt',
          grund: '',
          vertretung: ''
        })
        ladeAbwesenheiten()
      } else {
        toast.error('Fehler beim Speichern', {
          description: data.fehler || 'Unbekannter Fehler'
        })
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Abwesenheit:', error)
      toast.error('Fehler beim Speichern der Abwesenheit')
    }
  }

  // Abwesenheit bearbeiten
  const handleAbwesenheitBearbeiten = (abw: Urlaub) => {
    setEditingAbwesenheit(abw)
    setAbwesenheitForm({
      von: new Date(abw.von).toISOString().split('T')[0],
      bis: new Date(abw.bis).toISOString().split('T')[0],
      typ: abw.typ,
      status: abw.status,
      grund: abw.grund || '',
      vertretung: abw.vertretung || ''
    })
    setShowAbwesenheitForm(true)
  }

  // Abwesenheit löschen
  const handleAbwesenheitLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie diese Abwesenheit wirklich löschen?')) {
      return
    }

    try {
      const response = await fetch(`/api/urlaub/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Abwesenheit gelöscht')
        ladeAbwesenheiten()
      } else {
        toast.error('Fehler beim Löschen', {
          description: data.fehler || 'Unbekannter Fehler'
        })
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Abwesenheit:', error)
      toast.error('Fehler beim Löschen der Abwesenheit')
    }
  }

  // Formular zurücksetzen
  const resetAbwesenheitForm = () => {
    setShowAbwesenheitForm(false)
    setEditingAbwesenheit(null)
    setAbwesenheitForm({
      von: '',
      bis: '',
      typ: 'urlaub',
      status: 'genehmigt',
      grund: '',
      vertretung: ''
    })
  }

  // Typ-Label Helper
  const getTypLabel = (typ: string) => {
    const labels: Record<string, string> = {
      urlaub: 'Urlaub',
      krankheit: 'Krankheit',
      sonderurlaub: 'Sonderurlaub',
      unbezahlt: 'Unbezahlt',
      sonstiges: 'Sonstiges'
    }
    return labels[typ] || typ
  }

  // Status-Badge Helper
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; color: string }> = {
      genehmigt: { variant: 'default', label: 'Genehmigt', color: 'bg-green-100 text-green-800 border-green-200' },
      beantragt: { variant: 'secondary', label: 'Beantragt', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      abgelehnt: { variant: 'destructive', label: 'Abgelehnt', color: 'bg-red-100 text-red-800 border-red-200' }
    }
    return variants[status] || variants.genehmigt
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
            <TabsTrigger value="adresse">Adresse & Kontakt</TabsTrigger>
            <TabsTrigger value="arbeitszeit">Arbeitszeit & Quali.</TabsTrigger>
            <TabsTrigger value="abwesenheiten">Abwesenheiten</TabsTrigger>
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

          <TabsContent value="abwesenheiten" className="space-y-4">
            {!mitarbeiter?._id ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Bitte speichern Sie den Mitarbeiter zuerst, bevor Sie Abwesenheiten hinzufügen können.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Abwesenheiten verwalten</h3>
                  <Button
                    onClick={() => setShowAbwesenheitForm(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Neue Abwesenheit
                  </Button>
                </div>

                {showAbwesenheitForm && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">
                        {editingAbwesenheit ? 'Abwesenheit bearbeiten' : 'Neue Abwesenheit'}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetAbwesenheitForm}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="abw-von">Von *</Label>
                        <Input
                          id="abw-von"
                          type="date"
                          value={abwesenheitForm.von}
                          onChange={(e) => setAbwesenheitForm(prev => ({ ...prev, von: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="abw-bis">Bis *</Label>
                        <Input
                          id="abw-bis"
                          type="date"
                          value={abwesenheitForm.bis}
                          onChange={(e) => setAbwesenheitForm(prev => ({ ...prev, bis: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="abw-typ">Typ</Label>
                        <Select
                          value={abwesenheitForm.typ}
                          onValueChange={(v: any) => setAbwesenheitForm(prev => ({ ...prev, typ: v }))}
                        >
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
                        <Label htmlFor="abw-status">Status</Label>
                        <Select
                          value={abwesenheitForm.status}
                          onValueChange={(v: any) => setAbwesenheitForm(prev => ({ ...prev, status: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beantragt">Beantragt</SelectItem>
                            <SelectItem value="genehmigt">Genehmigt</SelectItem>
                            <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="abw-vertretung">Vertretung (optional)</Label>
                      <Select
                        value={abwesenheitForm.vertretung || 'none'}
                        onValueChange={(v) => setAbwesenheitForm(prev => ({ ...prev, vertretung: v === 'none' ? '' : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Keine Vertretung" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Keine Vertretung</SelectItem>
                          {mitarbeiterListe
                            .filter(m => m._id !== mitarbeiter?._id && m.aktiv !== false)
                            .map(m => (
                              <SelectItem key={m._id} value={m._id || ''}>
                                {m.vorname} {m.nachname} {m.personalnummer ? `(${m.personalnummer})` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="abw-grund">Grund (optional)</Label>
                      <Textarea
                        id="abw-grund"
                        value={abwesenheitForm.grund}
                        onChange={(e) => setAbwesenheitForm(prev => ({ ...prev, grund: e.target.value }))}
                        rows={2}
                        placeholder="z.B. Jahresurlaub, Arzttermin..."
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={resetAbwesenheitForm}>
                        Abbrechen
                      </Button>
                      <Button onClick={handleAbwesenheitSpeichern}>
                        {editingAbwesenheit ? 'Änderungen speichern' : 'Hinzufügen'}
                      </Button>
                    </div>
                  </div>
                )}

                {loadingAbwesenheiten ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Lade Abwesenheiten...</p>
                  </div>
                ) : abwesenheiten.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Noch keine Abwesenheiten eingetragen</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Von</TableHead>
                          <TableHead>Bis</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Tage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abwesenheiten.map((abw) => {
                          const statusInfo = getStatusBadge(abw.status)
                          return (
                            <TableRow key={abw._id}>
                              <TableCell className="font-medium">
                                {format(new Date(abw.von), 'dd.MM.yyyy', { locale: de })}
                              </TableCell>
                              <TableCell>
                                {format(new Date(abw.bis), 'dd.MM.yyyy', { locale: de })}
                              </TableCell>
                              <TableCell>{getTypLabel(abw.typ)}</TableCell>
                              <TableCell>{abw.anzahlTage}</TableCell>
                              <TableCell>
                                <Badge className={statusInfo.color}>
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAbwesenheitBearbeiten(abw)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAbwesenheitLoeschen(abw._id || '')}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
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

