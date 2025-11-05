"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { BetreffVorlage } from '@/lib/db/types'
import { Search, Save, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface BetreffDialogProps {
  currentText: string
  onSelect: (text: string) => void
}

export default function BetreffDialog({ currentText, onSelect }: BetreffDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('auswahl')
  const [vorlagen, setVorlagen] = useState<BetreffVorlage[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Neue Vorlage State
  const [neueName, setNeueName] = useState('')
  const [neueKategorie, setNeueKategorie] = useState('')

  useEffect(() => {
    if (open) {
      loadVorlagen()
    }
  }, [open])

  const loadVorlagen = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/betreff-vorlagen')
      if (response.ok) {
        const data = await response.json()
        setVorlagen(data.vorlagen || [])
      } else {
        toast.error('Fehler beim Laden', {
          description: 'Vorlagen konnten nicht geladen werden'
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler', {
        description: 'Netzwerkfehler beim Laden der Vorlagen'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVorlageAuswaehlen = (vorlage: BetreffVorlage) => {
    onSelect(vorlage.text)
    setOpen(false)
    setSearchQuery('')
    toast.success('Vorlage eingefügt', {
      description: vorlage.name
    })
  }

  const handleVorlageSpeichern = async () => {
    if (!neueName.trim() || !currentText.trim()) {
      toast.error('Unvollständige Eingabe', {
        description: 'Bitte Name und Betreff eingeben'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/betreff-vorlagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: neueName,
          text: currentText,
          kategorie: neueKategorie
        })
      })

      if (response.ok) {
        toast.success('Vorlage gespeichert', {
          description: `"${neueName}" wurde erfolgreich gespeichert`
        })
        
        setNeueName('')
        setNeueKategorie('')
        await loadVorlagen()
        setActiveTab('auswahl')
      } else {
        const error = await response.json()
        toast.error('Fehler beim Speichern', {
          description: error.fehler || 'Vorlage konnte nicht gespeichert werden'
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
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
      const response = await fetch(`/api/betreff-vorlagen/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Vorlage gelöscht')
        await loadVorlagen()
      } else {
        toast.error('Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Löschen')
    } finally {
      setLoading(false)
    }
  }

  const filteredVorlagen = vorlagen.filter(v =>
    searchQuery === '' ||
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.kategorie && v.kategorie.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); setActiveTab('auswahl') }}
        className="border-gray-300 text-gray-900 hover:bg-gray-50"
      >
        <Search className="h-4 w-4 mr-1 text-gray-700" />
        <span className="font-medium">Vorlage wählen</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); setActiveTab('speichern') }}
        disabled={!currentText.trim()}
        className="border-gray-300 text-gray-900 hover:bg-gray-50"
      >
        <Save className="h-4 w-4 mr-1 text-gray-700" />
        <span className="font-medium">Als Vorlage</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold text-2xl">Betreff-Vorlagen</DialogTitle>
            <DialogDescription className="text-gray-700">
              Wählen Sie eine Vorlage aus oder speichern Sie den aktuellen Betreff
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="auswahl" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
                Vorlage auswählen
              </TabsTrigger>
              <TabsTrigger value="speichern" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
                Aktuelle speichern
              </TabsTrigger>
            </TabsList>

            {/* Tab: Vorlage auswählen */}
            <TabsContent value="auswahl" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Vorlagen durchsuchen..."
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
                    onClick={() => setActiveTab('speichern')}
                  >
                    Erste Vorlage speichern
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
                              <span className="font-semibold text-gray-900 text-lg">{vorlage.name}</span>
                              {vorlage.kategorie && (
                                <Badge variant="outline" className="border-green-400 text-green-700">
                                  {vorlage.kategorie}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                              {vorlage.text}
                            </p>
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

            {/* Tab: Aktuelle speichern */}
            <TabsContent value="speichern" className="space-y-4">
              <Card className="bg-white border-gray-200">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-900 font-medium">Aktueller Betreff</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-900">
                      {currentText || <span className="text-gray-500 italic">Kein Betreff eingegeben</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900 font-medium">Vorlagenname *</Label>
                      <Input
                        value={neueName}
                        onChange={(e) => setNeueName(e.target.value)}
                        placeholder="z.B. Gerüstbau Standard"
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-900 font-medium">Kategorie (optional)</Label>
                      <Input
                        value={neueKategorie}
                        onChange={(e) => setNeueKategorie(e.target.value)}
                        placeholder="z.B. Neubau, Sanierung"
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-4 flex justify-end">
                    <Button
                      onClick={handleVorlageSpeichern}
                      disabled={loading || !neueName.trim() || !currentText.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      <span className="font-medium">Vorlage speichern</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

