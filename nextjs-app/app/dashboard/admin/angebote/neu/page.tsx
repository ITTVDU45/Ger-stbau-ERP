"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Send, Briefcase, CheckCircle, XCircle, Clock, ChevronsUpDown, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { Angebot, AngebotPosition } from '@/lib/db/types'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import ErweiterterPositionenEditor from '../components/ErweiterterPositionenEditor'
import AngebotKalkulation from '../components/AngebotKalkulation'
import AngebotVorschau from '../components/AngebotVorschau'
import EinleitungstextAuswahlDialog from '../components/EinleitungstextAuswahlDialog'
import EinleitungstextSpeichernDialog from '../components/EinleitungstextSpeichernDialog'
import SchlusstextDialog from '../components/SchlusstextDialog'
import BetreffDialog from '../components/BetreffDialog'
import NeuesProjektDialog from '../components/NeuesProjektDialog'
import { toast } from 'sonner'

const calculateTotals = (
  positionen: AngebotPosition[] = [],
  rabattProzent?: number,
  rabattFix?: number,
  mwstSatz?: number
) => {
  const steuerbarePositionen = positionen.filter((p) => p.typ !== 'miete')
  const zwischensumme = steuerbarePositionen.reduce((sum, p) => sum + (p.gesamtpreis || 0), 0)
  const rabattBetrag =
    rabattProzent && rabattProzent > 0
      ? (zwischensumme * rabattProzent) / 100
      : rabattFix || 0
  const netto = Math.max(0, zwischensumme - rabattBetrag)
  const effektiverMwstSatz = mwstSatz ?? 19
  const mwstBetrag = netto * effektiverMwstSatz / 100
  const brutto = netto + mwstBetrag

  return { zwischensumme, rabatt: rabattBetrag, netto, mwstBetrag, brutto }
}

export default function NeuesAngebotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const angebotId = searchParams.get('id')
  
  const [formData, setFormData] = useState<Partial<Angebot>>({
    angebotsnummer: '',
    kundeId: '',
    kundeName: '',
    datum: new Date(),
    gueltigBis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    betreff: '',
    einleitung: '',
    positionen: [],
    zwischensumme: 0,
    rabatt: 0,
    rabattProzent: 0,
    netto: 0,
    mwstSatz: 19,
    mwstBetrag: 0,
    brutto: 0,
    zahlungsbedingungen: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    schlusstext: 'Wir freuen uns auf Ihre Auftragserteilung.',
    status: 'entwurf',
    versionsnummer: 1,
    projektId: undefined
  })
  
  const [kunden, setKunden] = useState<any[]>([])
  const [projekte, setProjekte] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const [kundeSearchOpen, setKundeSearchOpen] = useState(false)
  const [kundeSearchQuery, setKundeSearchQuery] = useState('')

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

  const getBrancheName = (branche?: string) => {
    switch (branche) {
      case 'dachdecker': return 'Dachdecker'
      case 'maler': return 'Maler'
      case 'bauunternehmen': return 'Bauunternehmen'
      case 'privat': return 'Privat'
      default: return 'Sonstige'
    }
  }

  // Kunden nach Branche gruppieren
  const kundenGruppen = useMemo(() => {
    const gruppen: Record<string, any[]> = {
      dachdecker: [],
      maler: [],
      bauunternehmen: [],
      privat: [],
      sonstige: []
    }
    filteredKunden.forEach(k => {
      const branche = k.branche || 'sonstige'
      if (gruppen[branche]) {
        gruppen[branche].push(k)
      } else {
        gruppen.sonstige.push(k)
      }
    })
    return gruppen
  }, [filteredKunden])

  useEffect(() => {
    loadKunden()
    if (angebotId) {
      loadAngebot(angebotId)
    } else {
      generiereAngebotsnummer()
    }
  }, [angebotId])

  useEffect(() => {
    if (formData.kundeId) {
      loadProjekte(formData.kundeId)
    } else {
      setProjekte([])
    }
  }, [formData.kundeId])

  // Auto-Save: Speichere Änderungen automatisch nach 3 Sekunden
  useEffect(() => {
    // Nur auto-save, wenn wir ein bestehendes Angebot bearbeiten
    if (!angebotId || loading) return
    
    // Kein Auto-Save für angenommene oder abgelehnte Angebote
    if (formData.status === 'angenommen' || formData.status === 'abgelehnt') return
    
    // Nur speichern, wenn Kunde und Positionen vorhanden sind
    if (!formData.kundeId || !formData.positionen || formData.positionen.length === 0) return

    const timeoutId = setTimeout(() => {
      autoSaveAngebot()
    }, 3000) // 3 Sekunden nach letzter Änderung

    return () => clearTimeout(timeoutId)
  }, [formData, angebotId, loading])

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

  const loadAngebot = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/angebote/${id}`)
      if (response.ok) {
        const data = await response.json()
        const angebot = data.angebot
        
        // Konvertiere Datum-Strings zu Date-Objekten
        const berechnet = calculateTotals(
          angebot.positionen || [],
          angebot.rabattProzent,
          angebot.rabatt,
          angebot.mwstSatz
        )

        setFormData({
          ...angebot,
          datum: new Date(angebot.datum),
          gueltigBis: angebot.gueltigBis ? new Date(angebot.gueltigBis) : undefined,
          positionen: angebot.positionen || [],
          projektId: angebot.projektId || undefined, // Explizit setzen
          ...berechnet
        })
        
        // Projekte für den Kunden laden, damit das zugewiesene Projekt angezeigt wird
        if (angebot.kundeId) {
          await loadProjekte(angebot.kundeId)
        }
        
        toast.success('Angebot geladen')
      } else {
        toast.error('Fehler beim Laden des Angebots')
        router.push('/dashboard/admin/angebote')
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error)
      toast.error('Fehler beim Laden des Angebots')
      router.push('/dashboard/admin/angebote')
    } finally {
      setLoading(false)
    }
  }

  const loadProjekte = async (kundeId: string) => {
    try {
      const response = await fetch(`/api/kunden/${kundeId}/projekte`)
      if (response.ok) {
        const data = await response.json()
        setProjekte(data.projekte || [])
      }
    } catch (error) {
      console.error('Fehler:', error)
      setProjekte([])
    }
  }

  const handleProjektErstellt = (neuesProjekt: any) => {
    setProjekte(prev => [...prev, neuesProjekt])
    setFormData(prev => ({ ...prev, projektId: neuesProjekt._id }))
    toast.success('Projekt zugewiesen', {
      description: `Das Angebot wurde dem Projekt "${neuesProjekt.projektname}" zugewiesen`
    })
  }

  const generiereAngebotsnummer = async () => {
    const jahr = new Date().getFullYear()
    const angebotsnummer = `A-${jahr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    setFormData(prev => ({ ...prev, angebotsnummer }))
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

  const autoSaveAngebot = async () => {
    if (!angebotId || autoSaving) return
    
    setAutoSaving(true)
    try {
      const response = await fetch(`/api/angebote/${angebotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: formData.status || 'entwurf',
          erstelltVon: 'admin'
        })
      })

      if (response.ok) {
        setLastSaved(new Date())
        // Keine Toast-Benachrichtigung beim Auto-Save, um nicht zu stören
      }
    } catch (error) {
      console.error('Auto-Save Fehler:', error)
      // Fehler beim Auto-Save nicht anzeigen, um den Workflow nicht zu unterbrechen
    } finally {
      setAutoSaving(false)
    }
  }

  const handlePositionenChange = (positionen: AngebotPosition[]) => {
    // Kalkulation durchführen (Miet-Positionen NICHT in Summe)
    const summen = calculateTotals(
      positionen,
      formData.rabattProzent,
      formData.rabatt,
      formData.mwstSatz
    )

    setFormData(prev => ({
      ...prev,
      positionen,
      ...summen
    }))
  }

  const handleSpeichern = async (alsEntwurf: boolean = true) => {
    if (!formData.kundeId || !formData.positionen || formData.positionen.length === 0) {
      toast.error('Unvollständiges Angebot', {
        description: 'Bitte Kunde auswählen und mindestens eine Position hinzufügen'
      })
      return
    }

    setSaving(true)
    try {
      const isUpdate = !!angebotId
      const url = isUpdate ? `/api/angebote/${angebotId}` : '/api/angebote'
      const method = isUpdate ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: alsEntwurf ? 'entwurf' : 'gesendet',
          erstelltVon: 'admin'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const successTitle = isUpdate 
          ? (alsEntwurf ? 'Angebot aktualisiert' : 'Angebot aktualisiert & versendet')
          : (alsEntwurf ? 'Angebot als Entwurf gespeichert' : 'Angebot erfolgreich gespeichert & versendet')
        
        toast.success(successTitle, {
          description: `Angebotsnummer: ${formData.angebotsnummer}`
        })
        router.push('/dashboard/admin/angebote')
      } else {
        const error = await response.json()
        toast.error('Fehler beim Speichern', {
          description: error.fehler || 'Angebot konnte nicht gespeichert werden'
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Netzwerkfehler', {
        description: 'Verbindung zum Server fehlgeschlagen'
      })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: Angebot['status']) => {
    switch (status) {
      case 'entwurf':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Entwurf
        </Badge>
      case 'gesendet':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 flex items-center gap-1">
          <Send className="h-3 w-3" />
          Versendet
        </Badge>
      case 'angenommen':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Angenommen
        </Badge>
      case 'abgelehnt':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Abgelehnt
        </Badge>
      default:
        return null
    }
  }

  const isReadOnly = formData.status === 'angenommen' || formData.status === 'abgelehnt'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-700">Angebot wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild className="border-gray-300 text-gray-900 hover:bg-gray-50">
                <Link href="/dashboard/admin/angebote">
                  <ArrowLeft className="h-4 w-4 mr-2 text-gray-700" />
                  <span className="font-medium">Zurück</span>
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl text-gray-900 font-bold">
                    {angebotId ? 'Angebot bearbeiten' : 'Neues Angebot erstellen'}
                  </CardTitle>
                  {formData.status && getStatusBadge(formData.status)}
                  {angebotId && !isReadOnly && (
                    <div className="flex items-center gap-2 text-sm">
                      {autoSaving && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          Speichert...
                        </span>
                      )}
                      {!autoSaving && lastSaved && (
                        <span className="text-green-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          {new Date(lastSaved).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1 font-medium">
                  Angebotsnummer: {formData.angebotsnummer}
                  {angebotId && !isReadOnly && <span className="ml-2 text-gray-500">• Änderungen werden automatisch gespeichert</span>}
                  {isReadOnly && <span className="ml-2 text-orange-600">• Dieses Angebot kann nicht mehr bearbeitet werden</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isReadOnly && (
                <>
                  <Button variant="outline" onClick={() => handleSpeichern(true)} disabled={saving} className="border-gray-300 text-gray-900 hover:bg-gray-50">
                    <Save className="h-4 w-4 mr-2 text-gray-700" />
                    <span className="font-medium">Als Entwurf speichern</span>
                  </Button>
                  <Button onClick={() => handleSpeichern(false)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                    <Send className="h-4 w-4 mr-2" />
                    <span className="font-medium">Speichern & Versenden</span>
                  </Button>
                </>
              )}
              
              {/* "Zum Projekt" Button - erscheint wenn projektId vorhanden ist */}
              {formData.projektId && (
                <Button
                  onClick={() => router.push(`/dashboard/admin/projekte/${formData.projektId}`)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  <span className="font-medium">Zum Projekt</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Hauptinhalt */}
      <Tabs defaultValue="allgemein" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
          <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
          <TabsTrigger value="positionen">Positionen ({formData.positionen?.length || 0})</TabsTrigger>
          <TabsTrigger value="kalkulation">Kalkulation</TabsTrigger>
          <TabsTrigger value="vorschau">Vorschau</TabsTrigger>
        </TabsList>

        <TabsContent value="allgemein" className="space-y-4">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 font-semibold">Angebotsdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kunde" className="text-gray-900 font-medium">Kunde *</Label>
                  <Popover open={kundeSearchOpen} onOpenChange={setKundeSearchOpen} modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={kundeSearchOpen}
                        className={cn(
                          "w-full justify-between border-gray-300 text-gray-900",
                          isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                        )}
                        disabled={isReadOnly}
                      >
                        {formData.kundeId ? (
                          <span className="flex items-center gap-2 truncate">
                            <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", getBrancheColor(kunden.find(k => k._id === formData.kundeId)?.branche))} />
                            {kunden.find(k => k._id === formData.kundeId)?.firma || 
                             `${kunden.find(k => k._id === formData.kundeId)?.vorname} ${kunden.find(k => k._id === formData.kundeId)?.nachname}`}
                          </span>
                        ) : (
                          "Kunde auswählen..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 z-[9999] bg-white" align="start" sideOffset={4}>
                      <Command>
                        <CommandInput 
                          placeholder="Kunde suchen..." 
                          value={kundeSearchQuery}
                          onValueChange={setKundeSearchQuery}
                          className="text-gray-900"
                        />
                        <CommandList>
                          <CommandEmpty>Kein Kunde gefunden.</CommandEmpty>
                          {/* Dachdecker - Blau */}
                          {kundenGruppen.dachdecker.length > 0 && (
                            <CommandGroup heading={<span className="flex items-center gap-2 text-blue-600 font-semibold"><span className="w-2 h-2 rounded-full bg-blue-500" /> Dachdecker</span>}>
                              {kundenGruppen.dachdecker.map(k => (
                                <CommandItem
                                  key={k._id}
                                  value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''} ${k.kundennummer || ''}`}
                                  onSelect={() => {
                                    handleKundeChange(k._id)
                                    setKundeSearchOpen(false)
                                    setKundeSearchQuery('')
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-gray-900 hover:bg-gray-100"
                                >
                                  <Check className={cn("h-4 w-4", formData.kundeId === k._id ? "opacity-100" : "opacity-0")} />
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  {k.firma || `${k.vorname} ${k.nachname}`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {/* Maler - Grün */}
                          {kundenGruppen.maler.length > 0 && (
                            <CommandGroup heading={<span className="flex items-center gap-2 text-green-600 font-semibold"><span className="w-2 h-2 rounded-full bg-green-500" /> Maler</span>}>
                              {kundenGruppen.maler.map(k => (
                                <CommandItem
                                  key={k._id}
                                  value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''} ${k.kundennummer || ''}`}
                                  onSelect={() => {
                                    handleKundeChange(k._id)
                                    setKundeSearchOpen(false)
                                    setKundeSearchQuery('')
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-gray-900 hover:bg-gray-100"
                                >
                                  <Check className={cn("h-4 w-4", formData.kundeId === k._id ? "opacity-100" : "opacity-0")} />
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  {k.firma || `${k.vorname} ${k.nachname}`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {/* Bauunternehmen - Lila */}
                          {kundenGruppen.bauunternehmen.length > 0 && (
                            <CommandGroup heading={<span className="flex items-center gap-2 text-purple-600 font-semibold"><span className="w-2 h-2 rounded-full bg-purple-500" /> Bauunternehmen</span>}>
                              {kundenGruppen.bauunternehmen.map(k => (
                                <CommandItem
                                  key={k._id}
                                  value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''} ${k.kundennummer || ''}`}
                                  onSelect={() => {
                                    handleKundeChange(k._id)
                                    setKundeSearchOpen(false)
                                    setKundeSearchQuery('')
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-gray-900 hover:bg-gray-100"
                                >
                                  <Check className={cn("h-4 w-4", formData.kundeId === k._id ? "opacity-100" : "opacity-0")} />
                                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                                  {k.firma || `${k.vorname} ${k.nachname}`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {/* Privat - Gelb */}
                          {kundenGruppen.privat.length > 0 && (
                            <CommandGroup heading={<span className="flex items-center gap-2 text-yellow-600 font-semibold"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Privat</span>}>
                              {kundenGruppen.privat.map(k => (
                                <CommandItem
                                  key={k._id}
                                  value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''} ${k.kundennummer || ''}`}
                                  onSelect={() => {
                                    handleKundeChange(k._id)
                                    setKundeSearchOpen(false)
                                    setKundeSearchQuery('')
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-gray-900 hover:bg-gray-100"
                                >
                                  <Check className={cn("h-4 w-4", formData.kundeId === k._id ? "opacity-100" : "opacity-0")} />
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  {k.firma || `${k.vorname} ${k.nachname}`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {/* Sonstige - Grau */}
                          {kundenGruppen.sonstige.length > 0 && (
                            <CommandGroup heading={<span className="flex items-center gap-2 text-gray-600 font-semibold"><span className="w-2 h-2 rounded-full bg-gray-400" /> Sonstige</span>}>
                              {kundenGruppen.sonstige.map(k => (
                                <CommandItem
                                  key={k._id}
                                  value={`${k.firma || ''} ${k.vorname || ''} ${k.nachname || ''} ${k.kundennummer || ''}`}
                                  onSelect={() => {
                                    handleKundeChange(k._id)
                                    setKundeSearchOpen(false)
                                    setKundeSearchQuery('')
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-gray-900 hover:bg-gray-100"
                                >
                                  <Check className={cn("h-4 w-4", formData.kundeId === k._id ? "opacity-100" : "opacity-0")} />
                                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                                  {k.firma || `${k.vorname} ${k.nachname}`}
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
                  <Label className="text-gray-900 font-medium">Projekt (optional)</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.projektId || 'KEIN_PROJEKT'} 
                      onValueChange={(v) => handleChange('projektId', v === 'KEIN_PROJEKT' ? undefined : v)}
                      disabled={!formData.kundeId || isReadOnly}
                    >
                      <SelectTrigger className={`${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-gray-300 text-gray-900 flex-1`}>
                        <SelectValue placeholder="Projekt auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KEIN_PROJEKT">Kein Projekt</SelectItem>
                        {projekte.map(p => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.projektnummer}: {p.projektname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.kundeId && !isReadOnly && (
                      <NeuesProjektDialog 
                        kundeId={formData.kundeId}
                        kundeName={formData.kundeName}
                        onProjektErstellt={handleProjektErstellt}
                      />
                    )}
                  </div>
                  {!formData.kundeId && (
                    <p className="text-xs text-gray-600">Bitte wählen Sie zuerst einen Kunden aus</p>
                  )}
                </div>

                {formData.kundeId && (
                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Angebots-Typ *</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={formData.angebotTyp === 'dachdecker' ? 'default' : 'outline'}
                        onClick={() => handleChange('angebotTyp', 'dachdecker')}
                        className="flex-1"
                        disabled={isReadOnly}
                      >
                        Dachdecker
                      </Button>
                      <Button
                        type="button"
                        variant={formData.angebotTyp === 'maler' ? 'default' : 'outline'}
                        onClick={() => handleChange('angebotTyp', 'maler')}
                        className="flex-1"
                        disabled={isReadOnly}
                      >
                        Maler
                      </Button>
                      <Button
                        type="button"
                        variant={formData.angebotTyp === 'bauunternehmen' ? 'default' : 'outline'}
                        onClick={() => handleChange('angebotTyp', 'bauunternehmen')}
                        className="flex-1"
                        disabled={isReadOnly}
                      >
                        Bauunternehmen
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="datum" className="text-gray-900 font-medium">Datum *</Label>
                <Input
                  id="datum"
                  type="date"
                  value={formData.datum ? new Date(formData.datum).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('datum', new Date(e.target.value))}
                  className={`${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-gray-300 text-gray-900`}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="betreff" className="text-gray-900 font-medium">Bauvorhaben</Label>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <BetreffDialog 
                        currentText={formData.betreff || ''} 
                        onSelect={(text) => handleChange('betreff', text)}
                      />
                    </div>
                  )}
                </div>
                <Input
                  id="betreff"
                  value={formData.betreff || ''}
                  onChange={(e) => handleChange('betreff', e.target.value)}
                  placeholder="z.B. Gerüstbau für Neubau Einkaufszentrum"
                  className={`${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-gray-300 text-gray-900 placeholder:text-gray-500`}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="einleitung" className="text-gray-900 font-medium">Einleitungstext</Label>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <EinleitungstextAuswahlDialog 
                        onAuswahl={(text) => handleChange('einleitung', text)}
                      />
                      <EinleitungstextSpeichernDialog 
                        aktuellerText={formData.einleitung || ''}
                      />
                    </div>
                  )}
                </div>
                <Textarea
                  id="einleitung"
                  value={formData.einleitung || ''}
                  onChange={(e) => handleChange('einleitung', e.target.value)}
                  rows={3}
                  placeholder="Anrede und Einleitung..."
                  className={`${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-gray-300 text-gray-900 placeholder:text-gray-500`}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gueltigBis" className="text-gray-900 font-medium">Gültig bis *</Label>
                <Input
                  id="gueltigBis"
                  type="date"
                  value={formData.gueltigBis ? new Date(formData.gueltigBis).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('gueltigBis', new Date(e.target.value))}
                  className={`${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-gray-300 text-gray-900`}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="schlusstext" className="text-gray-900 font-medium">Schlusstext</Label>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <SchlusstextDialog 
                        aktuellerText={formData.schlusstext || ''}
                        onAuswahl={(text) => handleChange('schlusstext', text)}
                        typ="auswahl"
                      />
                      <SchlusstextDialog 
                        aktuellerText={formData.schlusstext || ''}
                        onAuswahl={() => {}}
                        typ="speichern"
                      />
                    </div>
                  )}
                </div>
                <Textarea
                  id="schlusstext"
                  value={formData.schlusstext || ''}
                  onChange={(e) => handleChange('schlusstext', e.target.value)}
                  rows={2}
                  className={`${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-gray-300 text-gray-900`}
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positionen">
          {isReadOnly ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <div className="text-center text-gray-600">
                  <p className="text-lg font-medium mb-2">Schreibgeschützt</p>
                  <p className="text-sm">Positionen können bei angenommenen Angeboten nicht mehr bearbeitet werden.</p>
                  <p className="text-sm mt-4">Wechseln Sie zur "Vorschau", um die Positionen anzusehen.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ErweiterterPositionenEditor
              positionen={formData.positionen || []}
              onChange={handlePositionenChange}
            />
          )}
        </TabsContent>

        <TabsContent value="kalkulation">
          {isReadOnly ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <div className="text-center text-gray-600">
                  <p className="text-lg font-medium mb-2">Schreibgeschützt</p>
                  <p className="text-sm">Die Kalkulation kann bei angenommenen Angeboten nicht mehr bearbeitet werden.</p>
                  <p className="text-sm mt-4">Wechseln Sie zur "Vorschau", um die Kalkulation anzusehen.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AngebotKalkulation
              formData={formData}
              onRabattChange={(prozent) => {
                const summen = calculateTotals(
                  formData.positionen || [],
                  prozent,
                  undefined,
                  formData.mwstSatz
                )

                setFormData(prev => ({
                  ...prev,
                  rabattProzent: prozent,
                  ...summen
                }))
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="vorschau">
          <AngebotVorschau
            angebot={{
              ...formData,
              angebotsdatum: formData.datum,
              einleitungstext: formData.einleitung
            }}
            positionen={formData.positionen || []}
            kalkulation={{
              nettosumme: formData.netto || 0,
              mwstBetrag: formData.mwstBetrag || 0,
              bruttosumme: formData.brutto || 0
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

