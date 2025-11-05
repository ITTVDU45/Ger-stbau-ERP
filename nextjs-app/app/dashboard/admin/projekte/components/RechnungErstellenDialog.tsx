'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Projekt } from '@/lib/db/types'
import { FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface RechnungErstellenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projekt: Projekt
  onRechnungErstellt: () => void
}

export default function RechnungErstellenDialog({
  open,
  onOpenChange,
  projekt,
  onRechnungErstellt
}: RechnungErstellenDialogProps) {
  const [typ, setTyp] = useState<'teil' | 'schluss'>('teil')
  const [methode, setMethode] = useState<'positionen' | 'prozent'>('prozent')
  const [prozentsatz, setProzentsatz] = useState<number>(30)
  const [selectedPositionen, setSelectedPositionen] = useState<string[]>([])
  const [angebote, setAngebote] = useState<any[]>([])
  const [selectedAngebotId, setSelectedAngebotId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingAngebote, setLoadingAngebote] = useState(false)

  useEffect(() => {
    if (open) {
      loadAngebote()
    }
  }, [open, projekt._id])

  const loadAngebote = async () => {
    try {
      setLoadingAngebote(true)
      const response = await fetch(`/api/projekte/${projekt._id}/angebote`)
      const data = await response.json()
      
      if (data.erfolg) {
        // Nur angenommene Angebote
        const angenommeneAngebote = data.angebote.filter((a: any) => a.status === 'angenommen')
        setAngebote(angenommeneAngebote)
        
        // Automatisch das erste Angebot auswählen
        if (angenommeneAngebote.length > 0) {
          setSelectedAngebotId(angenommeneAngebote[0]._id)
        }
      } else {
        toast.error('Fehler beim Laden der Angebote')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setLoadingAngebote(false)
    }
  }

  const angebot = angebote.find(a => a._id === selectedAngebotId)

  const handlePositionToggle = (positionId: string) => {
    setSelectedPositionen(prev =>
      prev.includes(positionId)
        ? prev.filter(id => id !== positionId)
        : [...prev, positionId]
    )
  }

  const calculatePreview = () => {
    if (!angebot) return { netto: 0, mwst: 0, brutto: 0 }

    if (typ === 'schluss') {
      return {
        netto: angebot.netto,
        mwst: angebot.mwstBetrag,
        brutto: angebot.brutto
      }
    }

    if (methode === 'prozent') {
      const faktor = prozentsatz / 100
      return {
        netto: angebot.netto * faktor,
        mwst: angebot.mwstBetrag * faktor,
        brutto: angebot.brutto * faktor
      }
    }

    // Positionen-Methode
    const selectedPos = angebot.positionen.filter((p: any) =>
      selectedPositionen.includes(p._id?.toString() || p.position)
    )
    const netto = selectedPos.reduce((sum: number, p: any) => sum + (p.gesamtpreis || p.gesamt || 0), 0)
    const mwstSatz = angebot.mwstSatz || 19
    const mwst = netto * (mwstSatz / 100)
    const brutto = netto + mwst

    return { netto, mwst, brutto }
  }

  const handleErstellen = async () => {
    if (typ === 'teil' && methode === 'positionen' && selectedPositionen.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine Position aus')
      return
    }

    if (typ === 'teil' && methode === 'prozent' && (prozentsatz <= 0 || prozentsatz > 100)) {
      toast.error('Bitte geben Sie einen gültigen Prozentsatz ein (1-100)')
      return
    }

    if (!selectedAngebotId) {
      toast.error('Bitte wählen Sie ein Angebot aus')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/projekte/${projekt._id}/rechnung-erstellen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          angebotId: selectedAngebotId,
          typ,
          ...(typ === 'teil' && methode === 'prozent' ? { prozentsatz } : {}),
          ...(typ === 'teil' && methode === 'positionen' ? { positionen: selectedPositionen } : {}),
          benutzer: 'admin'
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Rechnung erfolgreich erstellt', {
          description: `Rechnung ${data.rechnungsnummer} wurde als Entwurf erstellt`
        })
        onRechnungErstellt()
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Erstellen')
    } finally {
      setLoading(false)
    }
  }

  const preview = calculatePreview()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rechnung erstellen
          </DialogTitle>
        </DialogHeader>

        {loadingAngebote ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : angebote.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Keine angenommenen Angebote gefunden</p>
            <p className="text-sm text-gray-500 mt-2">
              Es müssen erst Angebote dem Projekt zugewiesen und angenommen werden.
            </p>
          </div>
        ) : !angebot ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Angebot konnte nicht geladen werden</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Hinweis */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Rechnung aus Angebot erstellen</p>
                <p className="text-blue-800">
                  Die Rechnung wird als Entwurf erstellt und noch nicht automatisch versendet.
                  Sie können sie anschließend prüfen und manuell versenden.
                </p>
              </div>
            </div>

            {/* Angebot auswählen (falls mehrere vorhanden) */}
            {angebote.length > 1 && (
              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Angebot auswählen</Label>
                <Select value={selectedAngebotId} onValueChange={setSelectedAngebotId}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Angebot auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {angebote.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.angebotsnummer} - {a.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Typ auswählen */}
            <div className="space-y-3">
              <Label className="text-gray-900 font-medium">Rechnungstyp</Label>
              <RadioGroup value={typ} onValueChange={(v) => setTyp(v as 'teil' | 'schluss')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teil" id="teil" />
                  <Label htmlFor="teil" className="cursor-pointer">
                    Teilrechnung - Nur einen Teil des Angebots abrechnen
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="schluss" id="schluss" />
                  <Label htmlFor="schluss" className="cursor-pointer">
                    Schlussrechnung - Gesamte Angebotssumme abrechnen
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Teilrechnung-Optionen */}
            {typ === 'teil' && (
              <Tabs value={methode} onValueChange={(v) => setMethode(v as 'positionen' | 'prozent')}>
                <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                  <TabsTrigger value="prozent" className="data-[state=active]:bg-white">
                    Prozentual
                  </TabsTrigger>
                  <TabsTrigger value="positionen" className="data-[state=active]:bg-white">
                    Nach Positionen
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="prozent" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prozentsatz" className="text-gray-900">
                      Prozentsatz der Angebotssumme
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="prozentsatz"
                        type="number"
                        min="1"
                        max="100"
                        value={prozentsatz}
                        onChange={(e) => setProzentsatz(parseFloat(e.target.value) || 0)}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                      <span className="text-gray-700">%</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      z.B. 30% für eine Anzahlung, 70% für die Restrechnung
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="positionen" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Positionen auswählen</Label>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                      {angebot.positionen.map((position: any, index: number) => {
                        const gesamt = position.gesamtpreis || position.gesamt || 0
                        const einzelpreis = position.einzelpreis || 0
                        return (
                          <div key={index} className="p-3 hover:bg-gray-50">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`pos-${index}`}
                                checked={selectedPositionen.includes(position._id?.toString() || position.position)}
                                onCheckedChange={() =>
                                  handlePositionToggle(position._id?.toString() || position.position)
                                }
                              />
                              <label htmlFor={`pos-${index}`} className="flex-1 cursor-pointer">
                                <p className="text-sm font-medium text-gray-900">{position.beschreibung}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {position.menge} {position.einheit} × {einzelpreis.toFixed(2)} € = 
                                  <span className="font-semibold"> {gesamt.toFixed(2)} €</span>
                                </p>
                              </label>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Vorschau */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Vorschau</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Netto</span>
                  <span className="font-medium text-gray-900">
                    {preview.netto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">MwSt. ({angebot.mwstSatz}%)</span>
                  <span className="font-medium text-gray-900">
                    {preview.mwst.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-semibold text-gray-900">Brutto</span>
                  <span className="text-xl font-bold text-gray-900">
                    {preview.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleErstellen}
                disabled={loading || preview.brutto === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? 'Wird erstellt...' : 'Rechnung erstellen'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

