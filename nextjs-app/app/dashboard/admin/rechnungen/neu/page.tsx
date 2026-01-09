"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Save, 
  Send, 
  FileText, 
  Calculator, 
  Eye, 
  ListPlus, 
  Download,
  FileSpreadsheet,
  CheckCircle
} from 'lucide-react'
import { Rechnung, AngebotPosition, Kunde, Projekt } from '@/lib/db/types'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

import ErweiterterPositionenEditor from '@/app/dashboard/admin/angebote/components/ErweiterterPositionenEditor'
import RechnungKalkulation from '../components/RechnungKalkulation'
import RechnungVorschau from '../components/RechnungVorschau'
import PositionAusAngebotDialog from '../components/PositionAusAngebotDialog'

// Berechnungsfunktion
const calculateTotals = (
  positionen: AngebotPosition[] = [],
  rabattProzent?: number,
  rabattFix?: number,
  mwstSatz?: number
) => {
  const steuerbarePositionen = positionen.filter((p) => p.typ !== 'miete')
  const mietPositionen = positionen.filter((p) => p.typ === 'miete')
  
  const zwischensumme = steuerbarePositionen.reduce((sum, p) => sum + (p.gesamtpreis || 0), 0)
  const mietSumme = mietPositionen.reduce((sum, p) => sum + (p.gesamtpreis || 0), 0)
  
  const rabattBetrag =
    rabattProzent && rabattProzent > 0
      ? (zwischensumme * rabattProzent) / 100
      : rabattFix || 0
  
  const nettoOhneMiete = Math.max(0, zwischensumme - rabattBetrag)
  const netto = nettoOhneMiete + mietSumme
  const effektiverMwstSatz = mwstSatz ?? 19
  const mwstBetrag = nettoOhneMiete * effektiverMwstSatz / 100
  const brutto = netto + mwstBetrag

  return { zwischensumme: zwischensumme + mietSumme, rabatt: rabattBetrag, netto, mwstBetrag, brutto }
}

export default function NeueRechnungPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rechnungId = searchParams.get('id')
  const angebotIdParam = searchParams.get('angebotId')
  
  const [formData, setFormData] = useState<Partial<Rechnung>>({
    rechnungsnummer: '',
    kundeId: '',
    kundeName: '',
    projektId: '',
    angebotId: '',
    rechnungsdatum: new Date(),
    faelligAm: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    zahlungsziel: 14,
    typ: 'vollrechnung',
    positionen: [],
    zwischensumme: 0,
    rabatt: 0,
    rabattProzent: 0,
    netto: 0,
    mwstSatz: 19,
    mwstBetrag: 0,
    brutto: 0,
    status: 'entwurf',
    mahnstufe: 0,
    notizen: ''
  })
  
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [angebote, setAngebote] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState('allgemein')
  const [template, setTemplate] = useState<'modern' | 'klassisch' | 'kompakt'>('modern')
  const [showAngebotDialog, setShowAngebotDialog] = useState(false)
  const [companySettings, setCompanySettings] = useState<any>(null)

  useEffect(() => {
    loadKunden()
    loadCompanySettings()
    loadTemplate()
    
    if (rechnungId) {
      loadRechnung(rechnungId)
    } else {
      generiereRechnungsnummer()
    }
    
    if (angebotIdParam) {
      loadAngebotData(angebotIdParam)
    }
  }, [rechnungId, angebotIdParam])

  useEffect(() => {
    if (formData.kundeId) {
      loadProjekte(formData.kundeId)
      loadAngebote(formData.kundeId)
    } else {
      setProjekte([])
      setAngebote([])
    }
  }, [formData.kundeId])

  useEffect(() => {
    const berechnet = calculateTotals(
      formData.positionen as AngebotPosition[],
      formData.rabattProzent,
      formData.rabatt,
      formData.mwstSatz
    )
    setFormData(prev => ({ ...prev, ...berechnet }))
  }, [formData.positionen, formData.rabattProzent, formData.mwstSatz])

  useEffect(() => {
    if (formData.rechnungsdatum && formData.zahlungsziel) {
      const datum = new Date(formData.rechnungsdatum)
      datum.setDate(datum.getDate() + formData.zahlungsziel)
      setFormData(prev => ({ ...prev, faelligAm: datum }))
    }
  }, [formData.rechnungsdatum, formData.zahlungsziel])

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

  const loadProjekte = async (kundeId: string) => {
    try {
      const response = await fetch(`/api/projekte?kundeId=${kundeId}`)
      if (response.ok) {
        const data = await response.json()
        setProjekte(data.projekte || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error)
    }
  }

  const loadAngebote = async (kundeId: string) => {
    try {
      const response = await fetch(`/api/angebote?kundeId=${kundeId}`)
      if (response.ok) {
        const data = await response.json()
        const relevanteAngebote = (data.angebote || []).filter(
          (a: any) => a.status === 'angenommen' || a.status === 'gesendet'
        )
        setAngebote(relevanteAngebote)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Angebote:', error)
    }
  }

  const loadCompanySettings = async () => {
    try {
      const response = await fetch('/api/settings/company')
      if (response.ok) {
        const data = await response.json()
        setCompanySettings(data.settings)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Firmeneinstellungen:', error)
    }
  }

  const loadTemplate = async () => {
    try {
      const response = await fetch('/api/settings/templates')
      if (response.ok) {
        const data = await response.json()
        if (data.templates?.invoice) {
          setTemplate(data.templates.invoice)
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Templates:', error)
    }
  }

  const loadRechnung = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/rechnungen/${id}`)
      if (response.ok) {
        const data = await response.json()
        const rechnung = data.rechnung
        
        setFormData({
          ...rechnung,
          rechnungsdatum: new Date(rechnung.rechnungsdatum),
          faelligAm: rechnung.faelligAm ? new Date(rechnung.faelligAm) : undefined,
          positionen: rechnung.positionen || []
        })
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rechnung:', error)
      toast.error('Fehler beim Laden der Rechnung')
    } finally {
      setLoading(false)
    }
  }

  const loadAngebotData = async (angebotId: string) => {
    try {
      const response = await fetch(`/api/angebote/${angebotId}`)
      if (response.ok) {
        const data = await response.json()
        const angebot = data.angebot
        
        setFormData(prev => ({
          ...prev,
          kundeId: angebot.kundeId,
          kundeName: angebot.kundeName,
          projektId: angebot.projektId || '',
          angebotId: angebot._id,
          positionen: angebot.positionen || [],
          rabattProzent: angebot.rabattProzent,
          rabatt: angebot.rabatt,
          mwstSatz: angebot.mwstSatz || 19
        }))
        
        toast.success('Daten aus Angebot übernommen')
      }
    } catch (error) {
      console.error('Fehler beim Laden des Angebots:', error)
      toast.error('Fehler beim Laden des Angebots')
    }
  }

  const generiereRechnungsnummer = async () => {
    try {
      const response = await fetch('/api/rechnungen/naechste-nummer')
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, rechnungsnummer: data.rechnungsnummer }))
      }
    } catch (error) {
      console.error('Fehler:', error)
      const jahr = new Date().getFullYear()
      const random = Math.floor(Math.random() * 10000)
      setFormData(prev => ({ ...prev, rechnungsnummer: `R-${jahr}-${String(random).padStart(4, '0')}` }))
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleKundeChange = (kundeId: string) => {
    const kunde = kunden.find(k => k._id === kundeId)
    if (kunde) {
      const adresse = kunde.adresse 
        ? `${kunde.adresse.strasse || ''} ${kunde.adresse.hausnummer || ''}, ${kunde.adresse.plz || ''} ${kunde.adresse.ort || ''}`
        : ''
      setFormData(prev => ({
        ...prev,
        kundeId,
        kundeName: kunde.firma || `${kunde.vorname} ${kunde.nachname}`,
        kundeAdresse: adresse
      }))
    }
  }

  const handlePositionenChange = (positionen: AngebotPosition[]) => {
    setFormData(prev => ({ ...prev, positionen }))
  }

  const handleSpeichern = async (alsEntwurf: boolean = true) => {
    if (!formData.kundeId) {
      toast.error('Bitte wählen Sie einen Kunden aus')
      return
    }

    if (!formData.positionen || formData.positionen.length === 0) {
      toast.error('Bitte fügen Sie mindestens eine Position hinzu')
      return
    }

    try {
      setSaving(true)
      
      const payload = {
        ...formData,
        status: alsEntwurf ? 'entwurf' : 'gesendet',
        template,
        rechnungsdatum: formData.rechnungsdatum instanceof Date 
          ? formData.rechnungsdatum.toISOString() 
          : formData.rechnungsdatum,
        faelligAm: formData.faelligAm instanceof Date 
          ? formData.faelligAm.toISOString() 
          : formData.faelligAm
      }

      const url = rechnungId ? `/api/rechnungen/${rechnungId}` : '/api/rechnungen'
      const method = rechnungId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        setLastSaved(new Date())
        toast.success(
          alsEntwurf 
            ? 'Rechnung als Entwurf gespeichert' 
            : 'Rechnung gespeichert und versendet'
        )
        
        if (!rechnungId && data.rechnungId) {
          router.push(`/dashboard/admin/rechnungen/neu?id=${data.rechnungId}`)
        }
      } else {
        let errorMessage = 'Unbekannter Fehler'
        try {
          const errorData = await response.json()
          errorMessage = errorData.fehler || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        toast.error('Fehler beim Speichern', {
          description: errorMessage
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Speichern der Rechnung')
    } finally {
      setSaving(false)
    }
  }

  const handlePdfDownload = async () => {
    if (!rechnungId) {
      toast.error('Bitte speichern Sie die Rechnung zuerst')
      return
    }

    try {
      const response = await fetch('/api/rechnungen/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechnungId, template })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Rechnung-${formData.rechnungsnummer}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF heruntergeladen')
      } else {
        toast.error('Fehler beim Generieren des PDFs')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Generieren des PDFs')
    }
  }

  const handleAngebotExtrahieren = (angebotData: any, selectedPositions: AngebotPosition[]) => {
    setFormData(prev => ({
      ...prev,
      kundeId: angebotData.kundeId,
      kundeName: angebotData.kundeName,
      projektId: angebotData.projektId || prev.projektId,
      angebotId: angebotData._id,
      positionen: selectedPositions,
      rabattProzent: angebotData.rabattProzent,
      rabatt: angebotData.rabatt,
      mwstSatz: angebotData.mwstSatz || 19
    }))
    setShowAngebotDialog(false)
    toast.success(`${selectedPositions.length} Positionen aus Angebot übernommen`)
  }

  const getStatusBadge = () => {
    const statusMap: Record<string, { label: string, color: string }> = {
      entwurf: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800' },
      gesendet: { label: 'Gesendet', color: 'bg-blue-100 text-blue-800' },
      bezahlt: { label: 'Bezahlt', color: 'bg-green-100 text-green-800' },
      ueberfaellig: { label: 'Überfällig', color: 'bg-red-100 text-red-800' },
      storniert: { label: 'Storniert', color: 'bg-gray-100 text-gray-800' }
    }
    const status = statusMap[formData.status || 'entwurf']
    return <Badge className={status.color}>{status.label}</Badge>
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild className="border-gray-300 text-gray-900 hover:bg-gray-50">
                <Link href="/dashboard/admin/rechnungen">
                  <ArrowLeft className="h-4 w-4 mr-2 text-gray-700" />
                  <span className="font-medium">Zurück</span>
                </Link>
              </Button>
              <div>
                <CardTitle className="text-xl md:text-2xl text-gray-900 flex items-center gap-3">
                  {rechnungId ? 'Rechnung bearbeiten' : 'Neue Rechnung erstellen'}
                  {getStatusBadge()}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Rechnungsnummer: {formData.rechnungsnummer || 'Wird generiert...'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => handleSpeichern(true)}
                disabled={saving}
                className="border-gray-300 text-gray-900 hover:bg-gray-50 gap-2"
              >
                <FileText className="h-4 w-4 text-gray-700" />
                <span className="font-medium">Als Entwurf speichern</span>
              </Button>
              <Button 
                onClick={() => handleSpeichern(false)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Send className="h-4 w-4" />
                <span className="font-medium">Speichern & Versenden</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Card className="bg-white">
          <CardContent className="pt-4">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100">
              <TabsTrigger value="allgemein" className="gap-2 text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Allgemein</span>
              </TabsTrigger>
              <TabsTrigger value="positionen" className="gap-2 text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900">
                <ListPlus className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Positionen ({formData.positionen?.length || 0})</span>
              </TabsTrigger>
              <TabsTrigger value="kalkulation" className="gap-2 text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Kalkulation</span>
              </TabsTrigger>
              <TabsTrigger value="vorschau" className="gap-2 text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Vorschau</span>
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        {/* Allgemein Tab */}
        <TabsContent value="allgemein" className="mt-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Allgemeine Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Kunde & Projekt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kunde *</Label>
                  <Select
                    value={formData.kundeId || ''}
                    onValueChange={handleKundeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kunde auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {kunden.map(kunde => (
                        <SelectItem key={kunde._id} value={kunde._id || ''}>
                          {kunde.firma || `${kunde.vorname} ${kunde.nachname}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Projekt (optional)</Label>
                  <Select
                    value={formData.projektId || 'none'}
                    onValueChange={(v) => handleFormChange('projektId', v === 'none' ? '' : v)}
                    disabled={!formData.kundeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Projekt auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Projekt</SelectItem>
                      {projekte.map(projekt => (
                        <SelectItem key={projekt._id} value={projekt._id || `projekt-${projekt._id}`}>
                          {projekt.projektname} ({projekt.projektnummer})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Angebot-Verknüpfung */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Angebot verknüpfen (optional)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.angebotId || 'none'}
                      onValueChange={(v) => handleFormChange('angebotId', v === 'none' ? '' : v)}
                      disabled={!formData.kundeId}
                    >
                      <SelectTrigger className="flex-1 text-gray-900">
                        <SelectValue placeholder="Angebot auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Kein Angebot</SelectItem>
                        {angebote.map(angebot => (
                          <SelectItem key={angebot._id} value={angebot._id || `angebot-${angebot._id}`}>
                            {angebot.angebotsnummer} - {angebot.betreff || 'Ohne Betreff'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAngebotDialog(true)}
                      disabled={!formData.kundeId}
                      className="border-gray-300 text-gray-900 hover:bg-gray-50"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-gray-700" />
                      <span className="font-medium">Aus Angebot</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Rechnungstyp</Label>
                  <Select
                    value={formData.typ || 'vollrechnung'}
                    onValueChange={(v) => handleFormChange('typ', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vollrechnung">Vollrechnung</SelectItem>
                      <SelectItem value="teilrechnung">Teilrechnung</SelectItem>
                      <SelectItem value="abschlagsrechnung">Abschlagsrechnung</SelectItem>
                      <SelectItem value="schlussrechnung">Schlussrechnung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Datum & Zahlungsziel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Rechnungsdatum</Label>
                  <Input
                    type="date"
                    value={formData.rechnungsdatum 
                      ? (formData.rechnungsdatum instanceof Date 
                          ? formData.rechnungsdatum.toISOString().split('T')[0]
                          : new Date(formData.rechnungsdatum).toISOString().split('T')[0])
                      : ''}
                    onChange={(e) => handleFormChange('rechnungsdatum', new Date(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Zahlungsziel (Tage)</Label>
                  <Select
                    value={String(formData.zahlungsziel || 14)}
                    onValueChange={(v) => handleFormChange('zahlungsziel', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Tage</SelectItem>
                      <SelectItem value="14">14 Tage</SelectItem>
                      <SelectItem value="21">21 Tage</SelectItem>
                      <SelectItem value="30">30 Tage</SelectItem>
                      <SelectItem value="45">45 Tage</SelectItem>
                      <SelectItem value="60">60 Tage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fällig am</Label>
                  <Input
                    type="date"
                    value={formData.faelligAm 
                      ? (formData.faelligAm instanceof Date 
                          ? formData.faelligAm.toISOString().split('T')[0]
                          : new Date(formData.faelligAm).toISOString().split('T')[0])
                      : ''}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* MwSt & Rabatt */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>MwSt-Satz</Label>
                  <Select
                    value={String(formData.mwstSatz || 19)}
                    onValueChange={(v) => handleFormChange('mwstSatz', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="19">19%</SelectItem>
                      <SelectItem value="7">7%</SelectItem>
                      <SelectItem value="0">0% (steuerfrei)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rabatt (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.rabattProzent || 0}
                    onChange={(e) => handleFormChange('rabattProzent', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rabatt (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rabatt || 0}
                    onChange={(e) => handleFormChange('rabatt', parseFloat(e.target.value) || 0)}
                    disabled={!!formData.rabattProzent && formData.rabattProzent > 0}
                  />
                </div>
              </div>

              {/* Notizen */}
              <div className="space-y-2">
                <Label>Interne Notizen</Label>
                <Textarea
                  value={formData.notizen || ''}
                  onChange={(e) => handleFormChange('notizen', e.target.value)}
                  rows={3}
                  placeholder="Interne Notizen (werden nicht auf der Rechnung gedruckt)"
                />
              </div>

              {lastSaved && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Zuletzt gespeichert: {format(lastSaved, 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Positionen Tab */}
        <TabsContent value="positionen" className="mt-4 space-y-4">
          {/* Aus Angebot Button */}
          <Card className="bg-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Positionen aus einem bestehenden Angebot übernehmen
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowAngebotDialog(true)}
                  disabled={!formData.kundeId}
                  className="gap-2 border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  <FileSpreadsheet className="h-4 w-4 text-gray-700" />
                  <span className="font-medium">Aus Angebot extrahieren</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <ErweiterterPositionenEditor
            positionen={formData.positionen as AngebotPosition[] || []}
            onChange={handlePositionenChange}
          />
        </TabsContent>

        {/* Kalkulation Tab */}
        <TabsContent value="kalkulation" className="mt-4">
          <RechnungKalkulation
            formData={formData}
            angebote={angebote}
          />
        </TabsContent>

        {/* Vorschau Tab */}
        <TabsContent value="vorschau" className="mt-4">
          <RechnungVorschau
            formData={formData}
            template={template}
            companySettings={companySettings}
            onDownloadPdf={handlePdfDownload}
            rechnungId={rechnungId}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog: Positionen aus Angebot */}
      <PositionAusAngebotDialog
        open={showAngebotDialog}
        onClose={() => setShowAngebotDialog(false)}
        kundeId={formData.kundeId || ''}
        onExtrahieren={handleAngebotExtrahieren}
      />
    </div>
  )
}
