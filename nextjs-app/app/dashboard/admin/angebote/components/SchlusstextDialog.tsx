"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Search, Save } from 'lucide-react'
import { SchlusstextVorlage } from '@/lib/db/types'
import { toast } from 'sonner'

interface SchlusstextDialogProps {
  aktuellerText: string
  onAuswahl: (text: string) => void
  typ: 'auswahl' | 'speichern'
}

export default function SchlusstextDialog({ aktuellerText, onAuswahl, typ }: SchlusstextDialogProps) {
  const [open, setOpen] = useState(false)
  const [vorlagen, setVorlagen] = useState<SchlusstextVorlage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && typ === 'auswahl') {
      loadVorlagen()
    }
  }, [open, typ])

  const loadVorlagen = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/schlusstext-vorlagen')
      if (response.ok) {
        const data = await response.json()
        setVorlagen(data.vorlagen || [])
      }
    } catch (error) {
      console.error('Fehler:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAuswahl = (vorlage: SchlusstextVorlage) => {
    onAuswahl(vorlage.text)
    setOpen(false)
    setSearchTerm('')
  }

  const handleSpeichern = async () => {
    if (!name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein')
      return
    }

    if (!aktuellerText.trim()) {
      toast.error('Kein Text zum Speichern vorhanden')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/schlusstext-vorlagen', {
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
        toast.success('Schlusstext erfolgreich gespeichert', {
          description: `Vorlage "${name}" wurde erstellt`
        })
      } else {
        const error = await response.json()
        toast.error('Fehler beim Speichern', { description: error.fehler })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  const filteredVorlagen = vorlagen.filter(v =>
    searchTerm === '' ||
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.text.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (typ === 'auswahl') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="border-gray-300 text-gray-900 hover:bg-gray-50">
            <FileText className="h-4 w-4 mr-2 text-gray-700" />
            <span className="font-medium">Vorlage wählen</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold">Gespeicherte Schlusstexte</DialogTitle>
            <DialogDescription className="text-gray-700">Wählen Sie eine Vorlage aus</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900"
              />
            </div>
            {loading ? (
              <p className="text-center py-8 text-gray-500">Lade Vorlagen...</p>
            ) : filteredVorlagen.length === 0 ? (
              <p className="text-center py-8 text-gray-600">Keine Vorlagen gefunden</p>
            ) : (
              <div className="space-y-3">
                {filteredVorlagen.map(v => (
                  <div
                    key={v._id}
                    className="p-4 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleAuswahl(v)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{v.name}</h4>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Auswählen</Button>
                    </div>
                    <p className="text-sm text-gray-700">{v.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-gray-300 text-gray-900 hover:bg-gray-50" disabled={!aktuellerText.trim()}>
          <Save className="h-4 w-4 mr-2 text-gray-700" />
          <span className="font-medium">Speichern</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 font-bold">Schlusstext speichern</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Name der Vorlage *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Freundliche Grüße" className="bg-white border-gray-300 text-gray-900" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Vorschau</Label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-800">{aktuellerText}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSpeichern} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

