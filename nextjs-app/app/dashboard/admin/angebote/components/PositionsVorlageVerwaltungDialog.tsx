"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { PositionsVorlage, AngebotPosition } from '@/lib/db/types'
import { Search, Plus, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface PositionsVorlageVerwaltungDialogProps {
  onVorlageEinfuegen: (vorlage: PositionsVorlage) => void
  trigger?: React.ReactNode
}

export default function PositionsVorlageVerwaltungDialog({ onVorlageEinfuegen, trigger }: PositionsVorlageVerwaltungDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('auswahl')
  const [vorlagen, setVorlagen] = useState<PositionsVorlage[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Neue Vorlage State
  const [neueVorlage, setNeueVorlage] = useState<Partial<PositionsVorlage>>({
    shortcode: '',
    name: '',
    beschreibung: '',
    typ: 'material',
    einheit: 'Stk',
    standardPreis: 0,
    standardMenge: 1,
    standardProzentsatz: undefined,
    kategorie: '',
    aktiv: true
  })

  useEffect(() => {
    if (open) {
      loadVorlagen()
    }
  }, [open])

  const loadVorlagen = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/positionen-vorlagen')
      if (response.ok) {
        const data = await response.json()
        setVorlagen(data.vorlagen || [])
      } else {
        toast.error('Fehler beim Laden', {
          description: 'Vorlagen konnten nicht geladen werden'
        })
      }
    } catch (error) {
      console.error('Fehler beim Laden der Vorlagen:', error)
      toast.error('Fehler', {
        description: 'Netzwerkfehler beim Laden der Vorlagen'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVorlageAuswaehlen = (vorlage: PositionsVorlage) => {
    onVorlageEinfuegen(vorlage)
    setOpen(false)
    setSearchQuery('')
  }

  const handleNeueVorlageChange = (field: string, value: any) => {
    setNeueVorlage(prev => ({ ...prev, [field]: value }))
  }

  const handleVorlageSpeichern = async () => {
    // Validierung
    if (!neueVorlage.shortcode || !neueVorlage.name || !neueVorlage.beschreibung) {
      toast.error('Unvollständige Eingabe', {
        description: 'Bitte Shortcode, Name und Beschreibung ausfüllen'
      })
      return
    }

    // Shortcode auf Großbuchstaben und ohne Leerzeichen
    const cleanedShortcode = neueVorlage.shortcode.toUpperCase().replace(/\s+/g, '_')

    setLoading(true)
    try {
      const response = await fetch('/api/positionen-vorlagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...neueVorlage,
          shortcode: cleanedShortcode,
          erstelltAm: new Date(),
          zuletztGeaendert: new Date()
        })
      })

      if (response.ok) {
        toast.success('Vorlage gespeichert', {
          description: `${cleanedShortcode} wurde erfolgreich erstellt`
        })
        
        // Reset Form
        setNeueVorlage({
          shortcode: '',
          name: '',
          beschreibung: '',
          typ: 'material',
          einheit: 'Stk',
          standardPreis: 0,
          standardMenge: 1,
          standardProzentsatz: undefined,
          kategorie: '',
          aktiv: true
        })
        
        // Vorlagen neu laden
        await loadVorlagen()
        
        // Zum Auswahl-Tab wechseln
        setActiveTab('auswahl')
      } else {
        const error = await response.json()
        toast.error('Fehler beim Speichern', {
          description: error.message || 'Vorlage konnte nicht gespeichert werden'
        })
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast.error('Fehler', {
        description: 'Netzwerkfehler beim Speichern der Vorlage'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVorlageLoeschen = async (id: string) => {
    if (!confirm('Möchten Sie diese Vorlage wirklich löschen?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/positionen-vorlagen/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Vorlage gelöscht', {
          description: 'Die Vorlage wurde erfolgreich gelöscht'
        })
        await loadVorlagen()
      } else {
        toast.error('Fehler beim Löschen', {
          description: 'Vorlage konnte nicht gelöscht werden'
        })
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler', {
        description: 'Netzwerkfehler beim Löschen der Vorlage'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredVorlagen = vorlagen.filter(v =>
    searchQuery === '' ||
    v.shortcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.beschreibung.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-50">
            <Search className="h-4 w-4 mr-2 text-gray-700" />
            <span className="font-medium">Aus Vorlage auswählen</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 font-bold text-2xl">Positions-Vorlagen</DialogTitle>
          <DialogDescription className="text-gray-700">
            Wählen Sie eine bestehende Vorlage aus oder erstellen Sie eine neue Vorlage
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger value="auswahl" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              Vorlage auswählen
            </TabsTrigger>
            <TabsTrigger value="erstellen" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              Neue Vorlage erstellen
            </TabsTrigger>
          </TabsList>

          {/* Tab: Vorlage auswählen */}
          <TabsContent value="auswahl" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Shortcode, Name oder Beschreibung suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-600">
                <p>Lade Vorlagen...</p>
              </div>
            ) : filteredVorlagen.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p>Keine Vorlagen gefunden.</p>
                <Button
                  variant="outline"
                  className="mt-4 border-gray-300 text-gray-900 hover:bg-gray-50"
                  onClick={() => setActiveTab('erstellen')}
                >
                  Erste Vorlage erstellen
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredVorlagen.map(vorlage => (
                  <Card key={vorlage._id} className="bg-white border-gray-200 hover:border-blue-400 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="border-blue-400 text-blue-700 font-bold">
                              {vorlage.shortcode}
                            </Badge>
                            <Badge variant="outline" className="border-gray-400 text-gray-700">
                              {vorlage.typ === 'material' ? 'Material' :
                               vorlage.typ === 'lohn' ? 'Lohn' :
                               vorlage.typ === 'miete' ? 'Miete' :
                               vorlage.typ === 'transport' ? 'Transport' : 'Sonstiges'}
                            </Badge>
                            {vorlage.kategorie && (
                              <Badge variant="outline" className="border-green-400 text-green-700">
                                {vorlage.kategorie}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 text-lg">{vorlage.name}</h4>
                          <p className="text-sm text-gray-700 mt-1">{vorlage.beschreibung}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-700">
                            <span className="font-medium">
                              {vorlage.standardMenge} {vorlage.einheit}
                            </span>
                            <span className="text-gray-500">×</span>
                            <span className="font-medium">
                              {vorlage.standardPreis?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                            </span>
                            {vorlage.standardProzentsatz && (
                              <>
                                <span className="text-gray-500">×</span>
                                <Badge variant="outline" className="border-green-400 text-green-700 font-semibold">
                                  {vorlage.standardProzentsatz}%
                                </Badge>
                              </>
                            )}
                            <span className="text-gray-500">=</span>
                            <span className="font-bold text-gray-900">
                              {(() => {
                                const zwischensumme = (vorlage.standardMenge || 0) * (vorlage.standardPreis || 0)
                                const gesamt = vorlage.standardProzentsatz 
                                  ? zwischensumme * (vorlage.standardProzentsatz / 100)
                                  : zwischensumme
                                return gesamt.toLocaleString('de-DE', { minimumFractionDigits: 2 })
                              })()} €
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleVorlageAuswaehlen(vorlage)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Auswählen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => vorlage._id && handleVorlageLoeschen(vorlage._id)}
                            className="border-red-400 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Neue Vorlage erstellen */}
          <TabsContent value="erstellen" className="space-y-4">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Shortcode * (z.B. EINR, MIETE4W)</Label>
                    <Input
                      value={neueVorlage.shortcode}
                      onChange={(e) => handleNeueVorlageChange('shortcode', e.target.value)}
                      placeholder="EINR"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 uppercase"
                    />
                    <p className="text-xs text-gray-600">Wird automatisch in Großbuchstaben umgewandelt</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Name *</Label>
                    <Input
                      value={neueVorlage.name}
                      onChange={(e) => handleNeueVorlageChange('name', e.target.value)}
                      placeholder="z.B. Einrüstung Standard"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Beschreibung *</Label>
                  <Input
                    value={neueVorlage.beschreibung}
                    onChange={(e) => handleNeueVorlageChange('beschreibung', e.target.value)}
                    placeholder="Detaillierte Beschreibung der Position"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Typ *</Label>
                    <Select value={neueVorlage.typ} onValueChange={(v) => handleNeueVorlageChange('typ', v)}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="lohn">Lohn</SelectItem>
                        <SelectItem value="miete">Miete</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="sonstiges">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Einheit *</Label>
                    <Input
                      value={neueVorlage.einheit}
                      onChange={(e) => handleNeueVorlageChange('einheit', e.target.value)}
                      placeholder="Stk, m, kg"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Kategorie</Label>
                    <Input
                      value={neueVorlage.kategorie}
                      onChange={(e) => handleNeueVorlageChange('kategorie', e.target.value)}
                      placeholder="z.B. Gerüstbau"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Standard-Menge</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={neueVorlage.standardMenge || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        handleNeueVorlageChange('standardMenge', isNaN(val) ? 1 : val)
                      }}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Standard-Preis (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={neueVorlage.standardPreis || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        handleNeueVorlageChange('standardPreis', isNaN(val) ? 0 : val)
                      }}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Standard-Prozentsatz (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={neueVorlage.standardProzentsatz || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        handleNeueVorlageChange('standardProzentsatz', isNaN(val) ? undefined : val)
                      }}
                      placeholder="Optional"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-300 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      {neueVorlage.standardMenge && neueVorlage.standardPreis ? (
                        <>
                          <span className="font-medium">Vorschau: </span>
                          <span className="text-gray-900">
                            {neueVorlage.standardMenge} {neueVorlage.einheit} × {neueVorlage.standardPreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                            {neueVorlage.standardProzentsatz && ` × ${neueVorlage.standardProzentsatz}%`}
                            {' = '}
                            <span className="font-bold">
                              {(() => {
                                const zwischensumme = neueVorlage.standardMenge * neueVorlage.standardPreis
                                const gesamt = neueVorlage.standardProzentsatz
                                  ? zwischensumme * (neueVorlage.standardProzentsatz / 100)
                                  : zwischensumme
                                return gesamt.toLocaleString('de-DE', { minimumFractionDigits: 2 })
                              })()} €
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500">Füllen Sie die Felder aus, um eine Vorschau zu sehen</span>
                      )}
                    </div>
                    <Button
                      onClick={handleVorlageSpeichern}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="font-medium">Vorlage speichern</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

