'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface GenehmigungDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mahnungId: string
  kundeName: string
  onSuccess?: () => void
}

export default function GenehmigungDialog({
  open,
  onOpenChange,
  mahnungId,
  kundeName,
  onSuccess
}: GenehmigungDialogProps) {
  const [aktion, setAktion] = useState<'genehmigen' | 'ablehnen'>('genehmigen')
  const [begruendung, setBegruendung] = useState('')
  const [kundeSperren, setKundeSperren] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    // Validierung
    if (aktion === 'ablehnen' && !begruendung.trim()) {
      toast.error('Bitte geben Sie eine Begründung für die Ablehnung ein')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/mahnwesen/${mahnungId}/genehmigen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aktion,
          begruendung: aktion === 'ablehnen' ? begruendung : undefined,
          kunde_sperren: aktion === 'ablehnen' ? kundeSperren : false
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success(data.nachricht || 'Aktion erfolgreich durchgeführt')
        onSuccess?.()
        onOpenChange(false)
        // Reset Form
        setAktion('genehmigen')
        setBegruendung('')
        setKundeSperren(false)
      } else {
        toast.error(data.fehler || 'Fehler bei der Verarbeitung')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler bei der Kommunikation mit dem Server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] bg-white flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-gray-900">Mahnung genehmigen/ablehnen</DialogTitle>
          <DialogDescription className="text-gray-600">
            Entscheiden Sie, ob die Mahnung genehmigt oder abgelehnt werden soll
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 px-1">
          {/* Aktion auswählen */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900">Aktion</Label>
            <RadioGroup value={aktion} onValueChange={(v: any) => setAktion(v)}>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="genehmigen" id="genehmigen" />
                <Label
                  htmlFor="genehmigen"
                  className="flex-1 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900">Genehmigen</div>
                    <div className="text-sm text-gray-600">
                      Mahnung wird für Versand freigegeben
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="ablehnen" id="ablehnen" />
                <Label
                  htmlFor="ablehnen"
                  className="flex-1 cursor-pointer flex items-center gap-2"
                >
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-gray-900">Ablehnen</div>
                    <div className="text-sm text-gray-600">
                      Mahnung wird nicht versendet
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Begründung (bei Ablehnung Pflicht) */}
          {aktion === 'ablehnen' && (
            <div className="space-y-2">
              <Label htmlFor="begruendung" className="text-base font-semibold text-gray-900">
                Begründung <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="begruendung"
                placeholder="Bitte geben Sie einen Grund für die Ablehnung an..."
                value={begruendung}
                onChange={(e) => setBegruendung(e.target.value)}
                rows={4}
                className="resize-none"
                required
              />
              <p className="text-xs text-gray-600">
                Die Begründung wird in der Chronik gespeichert
              </p>
            </div>
          )}

          {/* Kunde dauerhaft sperren */}
          {aktion === 'ablehnen' && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Checkbox
                id="kunde-sperren"
                checked={kundeSperren}
                onCheckedChange={(checked) => setKundeSperren(checked as boolean)}
              />
              <div className="flex-1">
                <Label
                  htmlFor="kunde-sperren"
                  className="font-medium text-gray-900 cursor-pointer"
                >
                  Kunde dauerhaft von Mahnungen ausschließen
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  Der Kunde <strong>{kundeName}</strong> wird für zukünftige Mahnungen gesperrt
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={
              aktion === 'genehmigen'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Verarbeite...
              </>
            ) : aktion === 'genehmigen' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Genehmigen
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Ablehnen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

