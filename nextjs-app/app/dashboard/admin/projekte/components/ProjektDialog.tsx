"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Upload, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Projekt } from '@/lib/db/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

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
  const [kundeSearchOpen, setKundeSearchOpen] = useState(false)
  const [kundeSearchQuery, setKundeSearchQuery] = useState('')
  const [dokumenteFiles, setDokumenteFiles] = useState<Array<{ file: File, kategorie: string, kommentar: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [budgetBrutto, setBudgetBrutto] = useState<number>(0)
  const [budgetNetto, setBudgetNetto] = useState<number>(0)
  const [lastEditedBudget, setLastEditedBudget] = useState<'netto' | 'brutto'>('netto')
  const MWST_SATZ = 0.19 // 19% MwSt

  useEffect(() => {
    loadKunden()
  }, [])

  useEffect(() => {
    if (projekt) {
      setFormData(projekt)
      // Budget-Werte initialisieren
      const netto = projekt.budget || 0
      setBudgetNetto(netto)
      setBudgetBrutto(netto * (1 + MWST_SATZ))
    } else {
      // Projektnummer wird automatisch vom Server generiert (JJ-NNN Format)
      setFormData({
        projektnummer: '',  // Server generiert automatisch
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
      setBudgetNetto(0)
      setBudgetBrutto(0)
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

  // Gefilterte Kundenliste basierend auf Suche
  const filteredKunden = useMemo(() => {
    if (!kundeSearchQuery.trim()) return kunden
    const query = kundeSearchQuery.toLowerCase()
    return kunden.filter(k => {
      const searchStr = `${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''} ${k.kundennummer || ''}`.toLowerCase()
      return searchStr.includes(query)
    })
  }, [kunden, kundeSearchQuery])

  // Farbzuweisung basierend auf Branche
  const getBrancheColor = (branche?: string) => {
    switch (branche) {
      case 'dachdecker': return 'bg-blue-500'
      case 'maler': return 'bg-green-500'
      case 'bauunternehmen': return 'bg-purple-500'
      case 'privat': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
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

  const handleBudgetNettoChange = (value: number) => {
    setBudgetNetto(value)
    setBudgetBrutto(value * (1 + MWST_SATZ))
    setLastEditedBudget('netto')
    setFormData(prev => ({ ...prev, budget: value }))
  }

  const handleBudgetBruttoChange = (value: number) => {
    setBudgetBrutto(value)
    const netto = value / (1 + MWST_SATZ)
    setBudgetNetto(netto)
    setLastEditedBudget('brutto')
    setFormData(prev => ({ ...prev, budget: netto }))
  }

  const handleDokumentHinzufuegen = () => {
    if (!fileInputRef.current?.files?.length) return

    const files = Array.from(fileInputRef.current.files)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    const ALLOWED_TYPES = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    const validFiles: File[] = []
    const invalidFiles: string[] = []

    files.forEach(file => {
      // File-Size prüfen
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name} (zu groß: ${(file.size / 1024 / 1024).toFixed(1)}MB)`)
        return
      }

      // MIME-Type prüfen
      if (!ALLOWED_TYPES.includes(file.type)) {
        // Zusätzlich Dateiendung prüfen (Fallback für Android)
        const ext = file.name.split('.').pop()?.toLowerCase()
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx']
        
        if (!ext || !validExtensions.includes(ext)) {
          invalidFiles.push(`${file.name} (ungültiger Dateityp)`)
          return
        }
      }

      validFiles.push(file)
    })

    // Warnung für ungültige Dateien
    if (invalidFiles.length > 0) {
      toast.error(`Folgende Dateien wurden übersprungen:\n${invalidFiles.slice(0, 3).join('\n')}${invalidFiles.length > 3 ? `\n... und ${invalidFiles.length - 3} weitere` : ''}`)
    }

    // Gültige Dateien hinzufügen
    if (validFiles.length > 0) {
      const newDokumente = validFiles.map(file => ({
        file,
        kategorie: 'sonstiges' as const,
        kommentar: ''
      }))

      setDokumenteFiles(prev => [...prev, ...newDokumente])
      
      if (validFiles.length > 0) {
        toast.success(`${validFiles.length} Datei(en) hinzugefügt`)
      }
    }
    
    // Input zurücksetzen
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDokumentEntfernen = (index: number) => {
    setDokumenteFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDokumentKategorieAendern = (index: number, kategorie: string) => {
    setDokumenteFiles(prev => prev.map((doc, i) => 
      i === index ? { ...doc, kategorie } : doc
    ))
  }

  const handleDokumentKommentarAendern = (index: number, kommentar: string) => {
    setDokumenteFiles(prev => prev.map((doc, i) => 
      i === index ? { ...doc, kommentar } : doc
    ))
  }

  const uploadDokumente = async (projektId: string) => {
    if (dokumenteFiles.length === 0) return

    const uploadPromises = dokumenteFiles.map(async ({ file, kategorie, kommentar }) => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projektId', projektId)
        formData.append('kategorie', kategorie)
        formData.append('kommentar', kommentar)
        formData.append('benutzer', 'admin')

        const response = await fetch(`/api/projekte/${projektId}/dokumente`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Upload-Fehler für ${file.name}:`, errorText)
          return { erfolg: false, fehler: `Upload fehlgeschlagen: ${response.statusText}` }
        }

        return await response.json()
      } catch (error) {
        console.error(`Upload-Fehler für ${file.name}:`, error)
        return { erfolg: false, fehler: error instanceof Error ? error.message : 'Unbekannter Fehler' }
      }
    })

    const results = await Promise.all(uploadPromises)
    const erfolgreiche = results.filter(r => r.erfolg).length
    const fehlgeschlagene = results.length - erfolgreiche

    if (erfolgreiche > 0) {
      toast.success(`${erfolgreiche} Dokument(e) hochgeladen`)
    }
    if (fehlgeschlagene > 0) {
      toast.error(`${fehlgeschlagene} Dokument(e) konnten nicht hochgeladen werden`)
    }

    return { erfolgreiche, fehlgeschlagene }
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

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Projekt-Speicher-Fehler:', errorText)
        toast.error('Fehler beim Speichern des Projekts')
        return
      }

      const data = await response.json()
      const projektId = projekt?._id || data.projektId || data.projekt?._id

      if (!projektId) {
        console.error('Keine Projekt-ID in Response gefunden:', data)
        toast.error('Fehler: Projekt-ID konnte nicht ermittelt werden')
        return
      }

      // Projekt erfolgreich gespeichert
      toast.success(projekt ? 'Projekt aktualisiert' : 'Projekt erstellt')

      // Dokumente hochladen, falls vorhanden
      if (dokumenteFiles.length > 0) {
        toast.info(`Lade ${dokumenteFiles.length} Dokument(e) hoch...`)
        try {
          const uploadResult = await uploadDokumente(projektId)
          // uploadDokumente zeigt bereits Toast-Benachrichtigungen
        } catch (error) {
          console.error('Fehler beim Dokument-Upload:', error)
          toast.error('Fehler beim Hochladen der Dokumente')
        }
      }

      // State zurücksetzen und Dialog schließen
      setDokumenteFiles([])
      setBudgetNetto(0)
      setBudgetBrutto(0)
      setLastEditedBudget('netto')
      
      onClose(true)
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setDokumenteFiles([])
        setBudgetNetto(0)
        setBudgetBrutto(0)
        setLastEditedBudget('netto')
      }
      onClose(false)
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{projekt ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
          <DialogDescription>Projekt-Details erfassen</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="allgemein" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
            <TabsTrigger value="zeitraum">Zeitraum & Budget</TabsTrigger>
            <TabsTrigger value="kontakt">Ansprechpartner</TabsTrigger>
            <TabsTrigger value="dokumente">
              Dokumente {dokumenteFiles.length > 0 && `(${dokumenteFiles.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projektnummer">Projektnummer *</Label>
                <Input
                  id="projektnummer"
                  value={formData.projektnummer || 'Wird automatisch generiert...'}
                  onChange={(e) => handleChange('projektnummer', e.target.value)}
                  disabled={!projekt}
                  className={!projekt ? 'bg-gray-100 text-gray-600' : ''}
                  placeholder="z.B. 26-001"
                />
                {!projekt && (
                  <p className="text-xs text-gray-500">Format: JJ-NNN (Jahr-Laufnummer)</p>
                )}
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
              <Popover open={kundeSearchOpen} onOpenChange={setKundeSearchOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={kundeSearchOpen}
                    className="w-full justify-between font-normal"
                    type="button"
                  >
                    {formData.kundeId ? (
                      <span className="flex items-center gap-2">
                        <span 
                          className={cn(
                            "w-3 h-3 rounded-full",
                            getBrancheColor(kunden.find(k => k._id === formData.kundeId)?.branche)
                          )}
                        />
                        {formData.kundeName || kunden.find(k => k._id === formData.kundeId)?.firma || 'Kunde auswählen'}
                      </span>
                    ) : (
                      "Kunde auswählen"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[400px] p-0 z-[9999]" 
                  align="start" 
                  sideOffset={4}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <Command style={{ backgroundColor: '#FFFFFF' }}>
                    <CommandInput 
                      placeholder="Kunde suchen..." 
                      value={kundeSearchQuery}
                      onValueChange={setKundeSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Kein Kunde gefunden.</CommandEmpty>
                      {/* Dachdecker - Blau */}
                      {filteredKunden.filter(k => k.branche === 'dachdecker').length > 0 && (
                        <CommandGroup heading={
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500" />
                            Dachdecker
                          </span>
                        }>
                          {filteredKunden.filter(k => k.branche === 'dachdecker').map(k => (
                            <CommandItem
                              key={k._id}
                              value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''}`}
                              onSelect={() => {
                                handleKundeChange(k._id)
                                setKundeSearchOpen(false)
                                setKundeSearchQuery('')
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                              <span className="flex-1">{k.firma || `${k.vorname} ${k.nachname}`}</span>
                              {formData.kundeId === k._id && <Check className="h-4 w-4 text-green-600" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Maler - Grün */}
                      {filteredKunden.filter(k => k.branche === 'maler').length > 0 && (
                        <CommandGroup heading={
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500" />
                            Maler
                          </span>
                        }>
                          {filteredKunden.filter(k => k.branche === 'maler').map(k => (
                            <CommandItem
                              key={k._id}
                              value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''}`}
                              onSelect={() => {
                                handleKundeChange(k._id)
                                setKundeSearchOpen(false)
                                setKundeSearchQuery('')
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                              <span className="flex-1">{k.firma || `${k.vorname} ${k.nachname}`}</span>
                              {formData.kundeId === k._id && <Check className="h-4 w-4 text-green-600" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Bauunternehmen - Lila */}
                      {filteredKunden.filter(k => k.branche === 'bauunternehmen').length > 0 && (
                        <CommandGroup heading={
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-purple-500" />
                            Bauunternehmen
                          </span>
                        }>
                          {filteredKunden.filter(k => k.branche === 'bauunternehmen').map(k => (
                            <CommandItem
                              key={k._id}
                              value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''}`}
                              onSelect={() => {
                                handleKundeChange(k._id)
                                setKundeSearchOpen(false)
                                setKundeSearchQuery('')
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0" />
                              <span className="flex-1">{k.firma || `${k.vorname} ${k.nachname}`}</span>
                              {formData.kundeId === k._id && <Check className="h-4 w-4 text-green-600" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Privat - Gelb */}
                      {filteredKunden.filter(k => k.branche === 'privat' || (k.kundentyp === 'privat' && !k.branche)).length > 0 && (
                        <CommandGroup heading={
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-yellow-500" />
                            Privat
                          </span>
                        }>
                          {filteredKunden.filter(k => k.branche === 'privat' || (k.kundentyp === 'privat' && !k.branche)).map(k => (
                            <CommandItem
                              key={k._id}
                              value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''}`}
                              onSelect={() => {
                                handleKundeChange(k._id)
                                setKundeSearchOpen(false)
                                setKundeSearchQuery('')
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                              <span className="flex-1">{k.firma || `${k.vorname} ${k.nachname}`}</span>
                              {formData.kundeId === k._id && <Check className="h-4 w-4 text-green-600" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Sonstige - Grau (keine Branche gesetzt) */}
                      {filteredKunden.filter(k => !k.branche && k.kundentyp !== 'privat').length > 0 && (
                        <CommandGroup heading={
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-gray-400" />
                            Sonstige
                          </span>
                        }>
                          {filteredKunden.filter(k => !k.branche && k.kundentyp !== 'privat').map(k => (
                            <CommandItem
                              key={k._id}
                              value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''}`}
                              onSelect={() => {
                                handleKundeChange(k._id)
                                setKundeSearchOpen(false)
                                setKundeSearchQuery('')
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
                              <span className="flex-1">{k.firma || `${k.vorname} ${k.nachname}`}</span>
                              {formData.kundeId === k._id && <Check className="h-4 w-4 text-green-600" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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

            <div className="space-y-4">
              {/* Budget Netto/Brutto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetNetto" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    Budget Netto (€)
                    {lastEditedBudget === 'netto' && (
                      <Badge variant="secondary" className="text-xs">Eingegeben</Badge>
                    )}
                  </Label>
                  <Input
                    id="budgetNetto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={budgetNetto.toFixed(2)}
                    onChange={(e) => handleBudgetNettoChange(parseFloat(e.target.value) || 0)}
                    disabled={lastEditedBudget === 'brutto'}
                    placeholder="0,00"
                    className={lastEditedBudget === 'brutto' ? 'bg-gray-100 text-gray-600' : 'bg-white'}
                  />
                  <p className="text-xs text-gray-600">
                    {lastEditedBudget === 'brutto' ? 'Automatisch berechnet' : 'Netto-Betrag für Vor- und Nachkalkulation'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetBrutto" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    Budget Brutto (€)
                    {lastEditedBudget === 'brutto' && (
                      <Badge variant="secondary" className="text-xs">Eingegeben</Badge>
                    )}
                  </Label>
                  <Input
                    id="budgetBrutto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={budgetBrutto.toFixed(2)}
                    onChange={(e) => handleBudgetBruttoChange(parseFloat(e.target.value) || 0)}
                    disabled={lastEditedBudget === 'netto'}
                    placeholder="0,00"
                    className={lastEditedBudget === 'netto' ? 'bg-gray-100 text-gray-600' : 'bg-white'}
                  />
                  <p className="text-xs text-gray-600">
                    {lastEditedBudget === 'netto' ? 'Automatisch berechnet (inkl. 19% MwSt)' : 'Brutto-Betrag inkl. 19% MwSt'}
                  </p>
                </div>
              </div>

              {/* Fortschritt */}
              <div className="space-y-2">
                <Label htmlFor="fortschritt">Fortschritt (%)</Label>
                <Input
                  id="fortschritt"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.fortschritt || 0}
                  onChange={(e) => handleChange('fortschritt', parseInt(e.target.value))}
                  className="bg-white"
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

          <TabsContent value="dokumente" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Dokumente hinzufügen</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Diese Dokumente werden nach dem Speichern des Projekts hochgeladen
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Dateien auswählen
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx"
                className="hidden"
                onChange={handleDokumentHinzufuegen}
              />

              {dokumenteFiles.length === 0 ? (
                <Card className="p-8 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">
                    Noch keine Dokumente ausgewählt
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Bilder (JPG, PNG, GIF, WEBP), PDF, Word - Max. 10MB pro Datei
                  </p>
                </Card>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {dokumenteFiles.map((doc, index) => (
                    <Card key={index} className="p-4 bg-white border-gray-200">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.file.name}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {(doc.file.size / 1024).toFixed(1)} KB
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600">Kategorie</Label>
                              <Select
                                value={doc.kategorie}
                                onValueChange={(value) => handleDokumentKategorieAendern(index, value)}
                              >
                                <SelectTrigger className="h-8 text-xs bg-white border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bauplan">Bauplan</SelectItem>
                                  <SelectItem value="lieferschein">Lieferschein</SelectItem>
                                  <SelectItem value="aufmass">Aufmaß</SelectItem>
                                  <SelectItem value="sicherheit">Sicherheit</SelectItem>
                                  <SelectItem value="foto">Foto</SelectItem>
                                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Kommentar (optional)</Label>
                              <Input
                                value={doc.kommentar}
                                onChange={(e) => handleDokumentKommentarAendern(index, e.target.value)}
                                placeholder="z.B. Seite 1-3"
                                className="h-8 text-xs bg-white border-gray-300"
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDokumentEntfernen(index)}
                          className="flex-shrink-0 h-8 w-8 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {dokumenteFiles.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-900">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">
                      {dokumenteFiles.length} Dokument(e) bereit zum Hochladen
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDokumenteFiles([])}
                    className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                  >
                    Alle entfernen
                  </Button>
                </div>
              )}
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

