'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Projekt } from '@/lib/db/types'
import { Package, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface AngebotZuweisenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projekt: Projekt
  angebote: any[]
  onAngebotZugewiesen: () => void
}

export default function AngebotZuweisenDialog({
  open,
  onOpenChange,
  projekt,
  angebote,
  onAngebotZugewiesen
}: AngebotZuweisenDialogProps) {
  const [selectedAngebotId, setSelectedAngebotId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleZuweisen = async () => {
    if (!selectedAngebotId) {
      toast.error('Bitte wählen Sie ein Angebot aus')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/projekte/${projekt._id}/angebot-zuweisen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          angebotId: selectedAngebotId,
          benutzer: 'admin'
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Angebot erfolgreich zugewiesen', {
          description: 'Der Projektstatus wurde auf "Aktiv" gesetzt'
        })
        onAngebotZugewiesen()
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Zuweisen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Angebot zum Projekt zuweisen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Hinweis */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Was passiert bei der Zuweisung?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Das Angebot wird mit diesem Projekt verknüpft</li>
                <li>Der Projektstatus ändert sich automatisch auf <strong>"Aktiv"</strong></li>
                <li>Die Angebotssumme wird ins Projekt übernommen</li>
                <li>Sie können anschließend Rechnungen aus dem Angebot erstellen</li>
              </ul>
            </div>
          </div>

          {/* Angebots-Auswahl */}
          {angebote.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Keine angenommenen Angebote verfügbar</p>
              <p className="text-sm text-gray-500 mt-2">
                Erstellen Sie erst ein Angebot und lassen Sie es vom Kunden annehmen
              </p>
            </div>
          ) : (
            <RadioGroup value={selectedAngebotId} onValueChange={setSelectedAngebotId}>
              <div className="space-y-3">
                {angebote.map((angebot) => (
                  <div
                    key={angebot._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedAngebotId === angebot._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAngebotId(angebot._id)}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={angebot._id} id={angebot._id} className="mt-1" />
                      <Label htmlFor={angebot._id} className="flex-1 cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{angebot.angebotsnummer}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Erstellt am: {angebot.datum ? format(new Date(angebot.datum), 'dd.MM.yyyy', { locale: de }) : '-'}
                            </p>
                            {angebot.betreff && (
                              <p className="text-sm text-gray-700 mt-1">{angebot.betreff}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                Angenommen
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {angebot.positionen?.length || 0} Position(en)
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Summe (Brutto)</p>
                            <p className="text-xl font-bold text-gray-900">
                              {angebot.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

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
              onClick={handleZuweisen}
              disabled={loading || !selectedAngebotId || angebote.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Wird zugewiesen...' : 'Angebot zuweisen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

