"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileText, Search } from 'lucide-react'
import { EinleitungstextVorlage } from '@/lib/db/types'

interface EinleitungstextAuswahlDialogProps {
  onAuswahl: (text: string) => void
}

export default function EinleitungstextAuswahlDialog({ onAuswahl }: EinleitungstextAuswahlDialogProps) {
  const [open, setOpen] = useState(false)
  const [vorlagen, setVorlagen] = useState<EinleitungstextVorlage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadVorlagen()
    }
  }, [open])

  const loadVorlagen = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/einleitungstext-vorlagen')
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

  const handleAuswahl = (vorlage: EinleitungstextVorlage) => {
    onAuswahl(vorlage.text)
    setOpen(false)
    setSearchTerm('')
  }

  const filteredVorlagen = vorlagen.filter(v =>
    searchTerm === '' ||
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.kategorie?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-gray-300 text-gray-900 hover:bg-gray-50">
          <FileText className="h-4 w-4 mr-2 text-gray-700" />
          <span className="font-medium">Vorlage auswählen</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 font-bold">Gespeicherte Einleitungstexte</DialogTitle>
          <DialogDescription className="text-gray-700">
            Wählen Sie einen gespeicherten Einleitungstext aus
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Nach Name oder Kategorie suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {loading ? (
            <p className="text-center py-8 text-gray-500">Lade Vorlagen...</p>
          ) : filteredVorlagen.length === 0 ? (
            <p className="text-center py-8 text-gray-600">
              Keine Einleitungstext-Vorlagen gefunden. Speichern Sie Texte, um sie später wiederzuverwenden.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredVorlagen.map(v => (
                <div
                  key={v._id}
                  className="p-4 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleAuswahl(v)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{v.name}</h4>
                      {v.kategorie && (
                        <Badge variant="outline" className="border-blue-400 text-blue-700 text-xs">
                          {v.kategorie}
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Auswählen
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                    {v.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

