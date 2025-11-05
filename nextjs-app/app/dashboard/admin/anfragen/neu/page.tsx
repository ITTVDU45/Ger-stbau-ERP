'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { Anfrage } from '@/lib/db/types'
import { toast } from 'sonner'
import DokumenteUpload from '../components/DokumenteUpload'
import NeuerKundeDialog from '../components/NeuerKundeDialog'

export default function NeueAnfragePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const anfrageId = searchParams.get('id')
  
  const [loading, setLoading] = useState(false)
  const [kunden, setKunden] = useState<Array<any>>([])
  const [mitarbeiter, setMitarbeiter] = useState<Array<{ _id: string; vorname: string; nachname: string }>>([])
  
  const [formData, setFormData] = useState<Partial<Anfrage>>({
    kundeId: '',
    kundeName: '',
    ansprechpartner: '',
    bauvorhaben: {
      objektname: '',
      strasse: '',
      plz: '',
      ort: '',
      besonderheiten: ''
    },
    artDerArbeiten: {
      dachdecker: false,
      fassade: false,
      daemmung: false,
      sonstige: false,
      sonstigeText: ''
    },
    geruestseiten: {
      vorderseite: false,
      rueckseite: false,
      rechteSeite: false,
      linkeSeite: false,
      gesamtflaeche: 0
    },
    anmerkungen: '',
    dokumente: [],
    status: 'offen',
    zustaendig: '',
    erstelltVon: 'admin'
  })

  // Anfrage laden (bei Bearbeitung)
  useEffect(() => {
    if (anfrageId) {
      loadAnfrage()
    }
  }, [anfrageId])

  // Kunden und Mitarbeiter laden
  useEffect(() => {
    loadKunden()
    loadMitarbeiter()
  }, [])

  const loadAnfrage = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/anfragen/${anfrageId}`)
      const data = await response.json()
      
      if (data.erfolg) {
        setFormData(data.anfrage)
      } else {
        toast.error('Fehler beim Laden der Anfrage')
        router.push('/dashboard/admin/anfragen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const loadKunden = async () => {
    try {
      const response = await fetch('/api/kunden')
      const data = await response.json()
      if (data.erfolg) {
        setKunden(data.kunden)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error)
    }
  }

  const loadMitarbeiter = async () => {
    try {
      const response = await fetch('/api/mitarbeiter')
      const data = await response.json()
      if (data.erfolg) {
        setMitarbeiter(data.mitarbeiter)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBauvorhabenChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      bauvorhaben: {
        ...prev.bauvorhaben!,
        [field]: value
      }
    }))
  }

  const handleArtDerArbeitenChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      artDerArbeiten: {
        ...prev.artDerArbeiten!,
        [field]: value
      }
    }))
  }

  const handleGeruestseitenChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      geruestseiten: {
        ...prev.geruestseiten!,
        [field]: value
      }
    }))
  }

  const handleKundeChange = (kundeId: string) => {
    const kunde = kunden.find(k => k._id === kundeId)
    if (kunde) {
      // Kundenname: Firma oder Vorname + Nachname
      const kundeName = kunde.firma || `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
      
      setFormData(prev => ({
        ...prev,
        kundeId: kunde._id,
        kundeName: kundeName
      }))
    }
  }

  const handleDokumenteChange = (dokumente: Anfrage['dokumente']) => {
    setFormData(prev => ({ ...prev, dokumente }))
  }

  const handleSpeichern = async (statusNeu: 'offen' | 'in_bearbeitung') => {
    // Validierung
    if (!formData.kundeId) {
      toast.error('Validierung fehlgeschlagen', {
        description: 'Bitte wählen Sie einen Kunden aus'
      })
      return
    }

    if (!formData.bauvorhaben?.objektname) {
      toast.error('Validierung fehlgeschlagen', {
        description: 'Bitte geben Sie einen Objektnamen ein'
      })
      return
    }

    try {
      setLoading(true)
      
      const payload = {
        ...formData,
        status: statusNeu
      }

      let response
      if (anfrageId) {
        // Update
        response = await fetch(`/api/anfragen/${anfrageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        // Create
        response = await fetch('/api/anfragen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Erfolgreich gespeichert', {
          description: anfrageId ? 'Anfrage wurde aktualisiert' : 'Neue Anfrage wurde erstellt'
        })
        router.push('/dashboard/admin/anfragen')
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast.error('Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  if (loading && anfrageId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/admin/anfragen')}
            className="text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {anfrageId ? 'Anfrage bearbeiten' : 'Neue Anfrage erstellen'}
            </h1>
            <p className="text-gray-600 mt-1">
              Erfassen Sie alle Details zur Kundenanfrage
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleSpeichern('offen')}
            disabled={loading}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Save className="mr-2 h-4 w-4" />
            Als Entwurf speichern
          </Button>
          <Button
            onClick={() => handleSpeichern('in_bearbeitung')}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="mr-2 h-4 w-4" />
            Speichern & In Bearbeitung
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="allgemein" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="allgemein" className="data-[state=active]:bg-white">Allgemein</TabsTrigger>
          <TabsTrigger value="leistungen" className="data-[state=active]:bg-white">Leistungen</TabsTrigger>
          <TabsTrigger value="dokumente" className="data-[state=active]:bg-white">
            Dokumente ({formData.dokumente?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Allgemein */}
        <TabsContent value="allgemein">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Allgemeine Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Kunde */}
              <div className="space-y-2">
                <Label htmlFor="kunde" className="text-gray-900 font-medium">Kunde *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.kundeId}
                    onValueChange={handleKundeChange}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Kunde auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {kunden.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          Keine Kunden gefunden
                        </div>
                      ) : (
                        kunden.map(k => {
                          // Anzeigename: Firma oder Vorname + Nachname
                          const displayName = k.firma || `${k.vorname || ''} ${k.nachname || ''}`.trim() || 'Unbekannter Kunde'
                          return (
                            <SelectItem key={k._id} value={k._id}>
                              {displayName}
                              {k.kundennummer && (
                                <span className="text-gray-500 ml-2 text-xs">
                                  (#{k.kundennummer})
                                </span>
                              )}
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                  <NeuerKundeDialog onKundeErstellt={loadKunden} />
                </div>
              </div>

              {/* Ansprechpartner */}
              <div className="space-y-2">
                <Label htmlFor="ansprechpartner" className="text-gray-900 font-medium">Ansprechpartner</Label>
                <Input
                  id="ansprechpartner"
                  value={formData.ansprechpartner || ''}
                  onChange={(e) => handleChange('ansprechpartner', e.target.value)}
                  placeholder="z.B. Max Mustermann"
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              {/* Bauvorhaben */}
              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Bauvorhaben</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="objektname" className="text-gray-900 font-medium">Objektname *</Label>
                  <Input
                    id="objektname"
                    value={formData.bauvorhaben?.objektname || ''}
                    onChange={(e) => handleBauvorhabenChange('objektname', e.target.value)}
                    placeholder="z.B. Neubau Einfamilienhaus"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="strasse" className="text-gray-900 font-medium">Straße</Label>
                    <Input
                      id="strasse"
                      value={formData.bauvorhaben?.strasse || ''}
                      onChange={(e) => handleBauvorhabenChange('strasse', e.target.value)}
                      placeholder="Musterstraße 123"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="plz" className="text-gray-900 font-medium">PLZ</Label>
                      <Input
                        id="plz"
                        value={formData.bauvorhaben?.plz || ''}
                        onChange={(e) => handleBauvorhabenChange('plz', e.target.value)}
                        placeholder="12345"
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="ort" className="text-gray-900 font-medium">Ort</Label>
                      <Input
                        id="ort"
                        value={formData.bauvorhaben?.ort || ''}
                        onChange={(e) => handleBauvorhabenChange('ort', e.target.value)}
                        placeholder="Musterstadt"
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="besonderheiten" className="text-gray-900 font-medium">Besonderheiten</Label>
                  <Textarea
                    id="besonderheiten"
                    value={formData.bauvorhaben?.besonderheiten || ''}
                    onChange={(e) => handleBauvorhabenChange('besonderheiten', e.target.value)}
                    placeholder="z.B. Denkmalgeschütztes Gebäude, enge Zufahrt..."
                    rows={3}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Zuständig */}
              <div className="border-t border-gray-200 pt-6 space-y-2">
                <Label htmlFor="zustaendig" className="text-gray-900 font-medium">Verantwortlicher Mitarbeiter</Label>
                <Select
                  value={formData.zustaendig}
                  onValueChange={(value) => handleChange('zustaendig', value)}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Mitarbeiter zuweisen" />
                  </SelectTrigger>
                  <SelectContent>
                    {mitarbeiter.map(m => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.vorname} {m.nachname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Leistungen */}
        <TabsContent value="leistungen">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Leistungen & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Art der Arbeiten */}
              <div className="space-y-4">
                <Label className="text-gray-900 font-medium">Art der Arbeiten</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dachdecker"
                      checked={formData.artDerArbeiten?.dachdecker}
                      onCheckedChange={(checked) => handleArtDerArbeitenChange('dachdecker', checked)}
                    />
                    <label htmlFor="dachdecker" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Dachdecker-Arbeiten
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fassade"
                      checked={formData.artDerArbeiten?.fassade}
                      onCheckedChange={(checked) => handleArtDerArbeitenChange('fassade', checked)}
                    />
                    <label htmlFor="fassade" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Fassadenarbeiten
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="daemmung"
                      checked={formData.artDerArbeiten?.daemmung}
                      onCheckedChange={(checked) => handleArtDerArbeitenChange('daemmung', checked)}
                    />
                    <label htmlFor="daemmung" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Dämmarbeiten
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sonstige"
                      checked={formData.artDerArbeiten?.sonstige}
                      onCheckedChange={(checked) => handleArtDerArbeitenChange('sonstige', checked)}
                    />
                    <label htmlFor="sonstige" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Sonstige Arbeiten
                    </label>
                  </div>

                  {formData.artDerArbeiten?.sonstige && (
                    <Input
                      placeholder="Bitte spezifizieren..."
                      value={formData.artDerArbeiten?.sonstigeText || ''}
                      onChange={(e) => handleArtDerArbeitenChange('sonstigeText', e.target.value)}
                      className="ml-6 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    />
                  )}
                </div>
              </div>

              {/* Gerüstseiten */}
              <div className="border-t border-gray-200 pt-6 space-y-4">
                <Label className="text-gray-900 font-medium">Gerüstseiten</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="vorderseite"
                      checked={formData.geruestseiten?.vorderseite}
                      onCheckedChange={(checked) => handleGeruestseitenChange('vorderseite', checked)}
                    />
                    <label htmlFor="vorderseite" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Vorderseite
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rueckseite"
                      checked={formData.geruestseiten?.rueckseite}
                      onCheckedChange={(checked) => handleGeruestseitenChange('rueckseite', checked)}
                    />
                    <label htmlFor="rueckseite" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Rückseite
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rechteSeite"
                      checked={formData.geruestseiten?.rechteSeite}
                      onCheckedChange={(checked) => handleGeruestseitenChange('rechteSeite', checked)}
                    />
                    <label htmlFor="rechteSeite" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Rechte Seite
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="linkeSeite"
                      checked={formData.geruestseiten?.linkeSeite}
                      onCheckedChange={(checked) => handleGeruestseitenChange('linkeSeite', checked)}
                    />
                    <label htmlFor="linkeSeite" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Linke Seite
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gesamtflaeche" className="text-gray-900 font-medium">
                    Gesamtfläche (m²)
                  </Label>
                  <Input
                    id="gesamtflaeche"
                    type="number"
                    value={formData.geruestseiten?.gesamtflaeche || ''}
                    onChange={(e) => handleGeruestseitenChange('gesamtflaeche', parseFloat(e.target.value) || 0)}
                    placeholder="z.B. 250"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Anmerkungen */}
              <div className="border-t border-gray-200 pt-6 space-y-2">
                <Label htmlFor="anmerkungen" className="text-gray-900 font-medium">Anmerkungen</Label>
                <Textarea
                  id="anmerkungen"
                  value={formData.anmerkungen || ''}
                  onChange={(e) => handleChange('anmerkungen', e.target.value)}
                  placeholder="Zusätzliche Informationen zur Anfrage..."
                  rows={5}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dokumente */}
        <TabsContent value="dokumente">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Dokumente</CardTitle>
            </CardHeader>
            <CardContent>
              <DokumenteUpload
                anfrageId={anfrageId || 'temp'}
                dokumente={formData.dokumente || []}
                onChange={handleDokumenteChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

