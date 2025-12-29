'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FileWarning, AlertTriangle, ArrowRight, Clock, Euro, Calendar, Send, Info } from 'lucide-react'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { MahnwesenSettings } from '@/lib/db/types'

interface FolgemahnungErstellenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentMahnungId: string
  aktuellerMahnstufe: number
  kundeName: string
  rechnungsnummer: string
  offenerBetrag: number
  parentMahnungDatum?: Date
  parentMahnungFaelligAm?: Date
  parentMahnungVersandtAm?: Date
  onSuccess?: () => void
}

export default function FolgemahnungErstellenDialog({
  open,
  onOpenChange,
  parentMahnungId,
  aktuellerMahnstufe,
  kundeName,
  rechnungsnummer,
  offenerBetrag,
  parentMahnungDatum,
  parentMahnungFaelligAm,
  parentMahnungVersandtAm,
  onSuccess
}: FolgemahnungErstellenDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<MahnwesenSettings | null>(null)

  const neueMahnstufe = aktuellerMahnstufe + 1

  // Einstellungen laden
  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/mahnwesen')
      const data = await response.json()

      if (data.erfolg && data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error)
    }
  }

  const getMahngebuehren = (stufe: number) => {
    if (!settings) {
      // Fallback auf Standard-Werte
      switch (stufe) {
        case 1: return 5.0
        case 2: return 15.0
        case 3: return 25.0
        default: return 0
      }
    }
    
    switch (stufe) {
      case 1: return settings.mahngebuehrenStufe1
      case 2: return settings.mahngebuehrenStufe2
      case 3: return settings.mahngebuehrenStufe3
      default: return 0
    }
  }

  const getZahlungsfrist = (stufe: number) => {
    if (!settings) return 7 // Fallback
    
    switch (stufe) {
      case 1: return settings.zahlungsfristStufe1
      case 2: return settings.zahlungsfristStufe2
      case 3: return settings.zahlungsfristStufe3
      default: return 7
    }
  }

  const handleErstellen = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/mahnwesen/folgemahnung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentMahnungId })
      })

      const data = await response.json()
      if (data.erfolg) {
        toast.success(`Mahnung ${neueMahnstufe} erfolgreich erstellt`, {
          description: `Die Folgemahnung wurde erstellt und wartet auf Genehmigung.`
        })
        onOpenChange(false)
        onSuccess?.()
        
        // Navigation zur neuen Mahnung
        setTimeout(() => {
          router.push(`/dashboard/admin/mahnwesen/${data.mahnung._id}`)
        }, 500)
      } else {
        toast.error('Fehler beim Erstellen', {
          description: data.fehler || 'Die Folgemahnung konnte nicht erstellt werden.'
        })
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Folgemahnung:', error)
      toast.error('Fehler beim Erstellen', {
        description: 'Ein unerwarteter Fehler ist aufgetreten.'
      })
    } finally {
      setLoading(false)
    }
  }

  const getMahnstufeColor = (stufe: number) => {
    switch (stufe) {
      case 1:
        return 'bg-yellow-50 text-yellow-700 border-yellow-300'
      case 2:
        return 'bg-orange-50 text-orange-700 border-orange-300'
      case 3:
        return 'bg-red-50 text-red-700 border-red-300'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-300'
    }
  }

  const mahngebuehren = getMahngebuehren(neueMahnstufe)
  const neueGesamtforderung = offenerBetrag + mahngebuehren

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] bg-white flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <FileWarning className="h-5 w-5 text-orange-600" />
            Folgemahnung erstellen
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Erstellen Sie eine Mahnung {neueMahnstufe} aus der aktuellen Mahnung {aktuellerMahnstufe}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 px-1">
          {/* Mahnstufen-Visualisierung */}
          <div className="flex items-center justify-center gap-4 py-4">
            <Badge variant="outline" className={getMahnstufeColor(aktuellerMahnstufe)}>
              Mahnung {aktuellerMahnstufe}
            </Badge>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <Badge variant="outline" className={getMahnstufeColor(neueMahnstufe)}>
              Mahnung {neueMahnstufe}
            </Badge>
          </div>

          {/* Informationen zur vorherigen Mahnung */}
          {(parentMahnungDatum || parentMahnungFaelligAm || parentMahnungVersandtAm) && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Informationen zur Mahnung {aktuellerMahnstufe}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {parentMahnungDatum && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Erstellt am:
                    </span>
                    <span className="font-medium text-blue-900">
                      {format(new Date(parentMahnungDatum), 'dd.MM.yyyy', { locale: de })}
                    </span>
                  </div>
                )}
                {parentMahnungVersandtAm && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 flex items-center gap-2">
                      <Send className="h-3 w-3" />
                      Versendet am:
                    </span>
                    <span className="font-medium text-blue-900">
                      {format(new Date(parentMahnungVersandtAm), 'dd.MM.yyyy', { locale: de })}
                    </span>
                  </div>
                )}
                {parentMahnungFaelligAm && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Fällig am:
                    </span>
                    <span className="font-medium text-blue-900">
                      {format(new Date(parentMahnungFaelligAm), 'dd.MM.yyyy', { locale: de })}
                    </span>
                  </div>
                )}
                {parentMahnungFaelligAm && (
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="text-blue-700 font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      Tage überfällig:
                    </span>
                    <Badge variant="destructive" className="bg-red-600 text-white">
                      {differenceInDays(new Date(), new Date(parentMahnungFaelligAm))} Tage
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Kundeninformationen */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Kunde</p>
                <p className="font-semibold text-gray-900">{kundeName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Rechnung</p>
                <p className="font-semibold text-gray-900">{rechnungsnummer}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Offener Betrag:</span>
                <span className="font-medium text-gray-900">
                  {offenerBetrag.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mahngebühren (Stufe {neueMahnstufe}):</span>
                <span className="font-medium text-orange-600">
                  + {mahngebuehren.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Neue Gesamtforderung:</span>
                <span className="font-bold text-gray-900">
                  {neueGesamtforderung.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          </div>

          {/* Warnhinweis */}
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Wichtig:</strong> Die neue Mahnung wird mit Status &quot;Genehmigung ausstehend&quot; erstellt 
              und muss vor dem Versand manuell genehmigt werden.
            </AlertDescription>
          </Alert>

          {/* Informationen zur neuen Mahnung */}
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Zahlungsfrist: {getZahlungsfrist(neueMahnstufe)} Tage</span>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              <span>Mahngebühren werden aus Einstellungen übernommen ({mahngebuehren.toFixed(2)} €)</span>
            </div>
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              <span>Mahntext wird aus Vorlage für Stufe {neueMahnstufe} generiert</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 shrink-0 border-t pt-4 mt-4">
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
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Erstelle Mahnung {neueMahnstufe}...
              </>
            ) : (
              <>
                <FileWarning className="h-4 w-4 mr-2" />
                Mahnung {neueMahnstufe} erstellen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

