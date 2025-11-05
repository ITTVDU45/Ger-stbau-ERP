'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface AnfrageProjektZuweisenDialogProps {
  anfrageId: string
  anfragenummer: string
  kundeName: string
  kundeId: string
  onSuccess: () => void
  children: React.ReactNode
}

export default function AnfrageProjektZuweisenDialog({
  anfrageId,
  anfragenummer,
  kundeName,
  kundeId,
  onSuccess,
  children
}: AnfrageProjektZuweisenDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modus, setModus] = useState<'bestehend' | 'neu'>('bestehend')
  const [projekte, setProjekte] = useState<any[]>([])
  const [selectedProjektId, setSelectedProjektId] = useState<string>('')
  const [neuerProjektname, setNeuerProjektname] = useState('')

  useEffect(() => {
    if (open) {
      loadProjekte()
    }
  }, [open])

  const loadProjekte = async () => {
    try {
      const response = await fetch('/api/projekte')
      if (response.ok) {
        const data = await response.json()
        // Filtere Projekte nach Kunde wenn möglich
        const gefilterteProjekte = data.projekte.filter((p: any) => 
          p.kundeId === kundeId || !kundeId
        )
        setProjekte(gefilterteProjekte || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error)
    }
  }

  const handleConfirm = async () => {
    if (modus === 'bestehend' && !selectedProjektId) {
      toast.error('Bitte wählen Sie ein Projekt aus')
      return
    }

    if (modus === 'neu' && !neuerProjektname.trim()) {
      toast.error('Bitte geben Sie einen Projektnamen ein')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/anfragen/${anfrageId}/zu-projekt-zuweisen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projektId: modus === 'bestehend' ? selectedProjektId : undefined,
          neuesProjekt: modus === 'neu' ? { projektname: neuerProjektname } : undefined
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Anfrage zugewiesen', {
          description: modus === 'bestehend' 
            ? 'Anfrage wurde dem Projekt zugewiesen'
            : `Neues Projekt ${data.projektnummer} wurde erstellt`
        })
        setOpen(false)
        onSuccess()
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler beim Zuweisen:', error)
      toast.error('Fehler beim Zuweisen der Anfrage')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Anfrage zu Projekt zuweisen</DialogTitle>
          <DialogDescription className="text-gray-600">
            Weisen Sie die Anfrage {anfragenummer} einem bestehenden oder neuen Projekt zu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Anfrage:</span>
                <span className="font-semibold text-gray-900">{anfragenummer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kunde:</span>
                <span className="font-semibold text-gray-900">{kundeName}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-gray-900 font-medium">Projekt-Auswahl</Label>
            <RadioGroup value={modus} onValueChange={(v) => setModus(v as 'bestehend' | 'neu')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bestehend" id="bestehend" />
                <Label htmlFor="bestehend" className="font-normal cursor-pointer">
                  Bestehendes Projekt auswählen
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="neu" id="neu" />
                <Label htmlFor="neu" className="font-normal cursor-pointer">
                  Neues Projekt erstellen
                </Label>
              </div>
            </RadioGroup>
          </div>

          {modus === 'bestehend' && (
            <div className="space-y-2">
              <Label htmlFor="projekt" className="text-gray-900 font-medium">
                Projekt auswählen
              </Label>
              <Select value={selectedProjektId} onValueChange={setSelectedProjektId}>
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue placeholder="Projekt auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {projekte.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Keine Projekte gefunden</div>
                  ) : (
                    projekte.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.projektnummer}: {p.projektname}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {projekte.length === 0 && (
                <p className="text-xs text-gray-600">
                  Keine Projekte für diesen Kunden gefunden. Erstellen Sie ein neues Projekt.
                </p>
              )}
            </div>
          )}

          {modus === 'neu' && (
            <div className="space-y-2">
              <Label htmlFor="projektname" className="text-gray-900 font-medium">
                Projektname
              </Label>
              <Input
                id="projektname"
                value={neuerProjektname}
                onChange={(e) => setNeuerProjektname(e.target.value)}
                placeholder="z.B. Gerüstbau Einkaufszentrum"
                className="bg-white border-gray-300"
              />
              <p className="text-xs text-gray-600">
                Die Projektnummer wird automatisch generiert.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Wird zugewiesen...' : 'Zuweisen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

