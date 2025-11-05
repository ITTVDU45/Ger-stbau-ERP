"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

interface EinleitungstextSpeichernDialogProps {
  aktuellerText: string
}

export default function EinleitungstextSpeichernDialog({ aktuellerText }: EinleitungstextSpeichernDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSpeichern = async () => {
    if (!name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein', {
        description: 'Der Name der Vorlage ist erforderlich'
      })
      return
    }

    if (!aktuellerText.trim()) {
      toast.error('Kein Text zum Speichern vorhanden', {
        description: 'Bitte schreiben Sie zuerst einen Einleitungstext'
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/einleitungstext-vorlagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          text: aktuellerText,
          kategorie: kategorie.trim() || undefined,
          aktiv: true
        })
      })

      if (response.ok) {
        setOpen(false)
        setName('')
        setKategorie('')
        toast.success('Einleitungstext erfolgreich gespeichert', {
          description: `Vorlage "${name}" wurde erstellt und kann jetzt wiederverwendet werden`
        })
      } else {
        const error = await response.json()
        toast.error('Fehler beim Speichern', {
          description: error.fehler || 'Vorlage konnte nicht gespeichert werden'
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-gray-300 text-gray-900 hover:bg-gray-50"
          disabled={!aktuellerText.trim()}
        >
          <Save className="h-4 w-4 mr-2 text-gray-700" />
          <span className="font-medium">Text speichern</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 font-bold">Einleitungstext speichern</DialogTitle>
          <DialogDescription className="text-gray-700">
            Speichern Sie den aktuellen Einleitungstext als Vorlage für zukünftige Angebote
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vorlage-name" className="text-gray-900 font-medium">
              Name der Vorlage *
            </Label>
            <Input
              id="vorlage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Standard Anrede Bauunternehmen"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vorlage-kategorie" className="text-gray-900 font-medium">
              Kategorie (optional)
            </Label>
            <Input
              id="vorlage-kategorie"
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value)}
              placeholder="z.B. Bauunternehmen, Privatkunde"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Vorschau</Label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {aktuellerText || 'Kein Text vorhanden'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-gray-300 text-gray-900">
            Abbrechen
          </Button>
          <Button onClick={handleSpeichern} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

