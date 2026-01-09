"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { 
  FileSpreadsheet, 
  Check, 
  X, 
  AlertCircle,
  Package,
  Wrench,
  Calendar,
  FileText
} from 'lucide-react'
import { AngebotPosition } from '@/lib/db/types'
import { toast } from 'sonner'

interface PositionAusAngebotDialogProps {
  open: boolean
  onClose: () => void
  kundeId: string
  onExtrahieren: (angebotData: any, selectedPositions: AngebotPosition[]) => void
}

export default function PositionAusAngebotDialog({
  open,
  onClose,
  kundeId,
  onExtrahieren
}: PositionAusAngebotDialogProps) {
  const [angebote, setAngebote] = useState<any[]>([])
  const [selectedAngebotId, setSelectedAngebotId] = useState<string>('')
  const [selectedAngebot, setSelectedAngebot] = useState<any>(null)
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && kundeId) {
      loadAngebote()
    }
  }, [open, kundeId])

  useEffect(() => {
    if (selectedAngebotId) {
      loadAngebotDetails(selectedAngebotId)
    } else {
      setSelectedAngebot(null)
      setSelectedPositionIds(new Set())
    }
  }, [selectedAngebotId])

  const loadAngebote = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/angebote?kundeId=${kundeId}`)
      if (response.ok) {
        const data = await response.json()
        // Nur angenommene oder gesendete Angebote
        const relevanteAngebote = (data.angebote || []).filter(
          (a: any) => a.status === 'angenommen' || a.status === 'gesendet'
        )
        setAngebote(relevanteAngebote)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Angebote:', error)
      toast.error('Fehler beim Laden der Angebote')
    } finally {
      setLoading(false)
    }
  }

  const loadAngebotDetails = async (angebotId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/angebote/${angebotId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedAngebot(data.angebot)
        // Standardmäßig alle Positionen auswählen
        const allIds = new Set(
          (data.angebot.positionen || []).map((_: any, index: number) => String(index))
        )
        setSelectedPositionIds(allIds)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Angebots:', error)
      toast.error('Fehler beim Laden des Angebots')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const togglePosition = (positionIndex: number) => {
    const id = String(positionIndex)
    const newSet = new Set(selectedPositionIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedPositionIds(newSet)
  }

  const selectAll = () => {
    if (selectedAngebot) {
      const allIds = new Set(
        (selectedAngebot.positionen || []).map((_: any, index: number) => String(index))
      )
      setSelectedPositionIds(allIds)
    }
  }

  const selectNone = () => {
    setSelectedPositionIds(new Set())
  }

  const handleExtrahieren = () => {
    if (!selectedAngebot) return

    const selectedPositions = (selectedAngebot.positionen || [])
      .filter((_: any, index: number) => selectedPositionIds.has(String(index)))
      .map((p: any, index: number) => ({
        ...p,
        position: index + 1,
        angebotPositionId: p._id || String(index)
      }))

    if (selectedPositions.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine Position aus')
      return
    }

    onExtrahieren(selectedAngebot, selectedPositions)
  }

  const getTypIcon = (typ: string) => {
    switch (typ) {
      case 'material':
        return <Package className="h-4 w-4 text-blue-600" />
      case 'arbeit':
        return <Wrench className="h-4 w-4 text-green-600" />
      case 'miete':
        return <Calendar className="h-4 w-4 text-purple-600" />
      case 'pauschale':
        return <FileText className="h-4 w-4 text-orange-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string, color: string }> = {
      angenommen: { label: 'Angenommen', color: 'bg-green-100 text-green-800' },
      gesendet: { label: 'Gesendet', color: 'bg-blue-100 text-blue-800' },
      entwurf: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800' },
      abgelehnt: { label: 'Abgelehnt', color: 'bg-red-100 text-red-800' }
    }
    const s = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return <Badge className={s.color}>{s.label}</Badge>
  }

  const selectedSum = selectedAngebot
    ? (selectedAngebot.positionen || [])
        .filter((_: any, index: number) => selectedPositionIds.has(String(index)))
        .reduce((sum: number, p: any) => sum + (p.gesamtpreis || 0), 0)
    : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Positionen aus Angebot übernehmen
          </DialogTitle>
          <DialogDescription>
            Wählen Sie ein Angebot und die zu übernehmenden Positionen aus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Angebots-Auswahl */}
          <div className="space-y-2">
            <Label>Angebot auswählen</Label>
            <Select
              value={selectedAngebotId}
              onValueChange={setSelectedAngebotId}
              disabled={loading || angebote.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loading 
                    ? "Laden..." 
                    : angebote.length === 0 
                      ? "Keine Angebote gefunden" 
                      : "Angebot auswählen"
                } />
              </SelectTrigger>
              <SelectContent>
                {angebote.map(angebot => (
                  <SelectItem key={angebot._id} value={angebot._id}>
                    <div className="flex items-center gap-2">
                      <span>{angebot.angebotsnummer}</span>
                      <span className="text-gray-500">-</span>
                      <span className="text-gray-600">{angebot.betreff || 'Ohne Betreff'}</span>
                      <span className="text-gray-500">({formatCurrency(angebot.brutto || 0)})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keine Angebote Warnung */}
          {!loading && angebote.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Keine Angebote gefunden</p>
                <p className="text-sm text-yellow-700">
                  Für diesen Kunden existieren keine angenommenen oder gesendeten Angebote.
                </p>
              </div>
            </div>
          )}

          {/* Angebot-Details & Positionen */}
          {selectedAngebot && (
            <>
              {/* Angebot-Info */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{selectedAngebot.angebotsnummer}</p>
                    <p className="text-sm text-gray-600">{selectedAngebot.betreff || 'Ohne Betreff'}</p>
                  </div>
                  {getStatusBadge(selectedAngebot.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Gesamtbetrag</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedAngebot.brutto || 0)}</p>
                </div>
              </div>

              {/* Auswahl-Buttons */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedPositionIds.size} von {(selectedAngebot.positionen || []).length} Positionen ausgewählt
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    <Check className="h-4 w-4 mr-1" />
                    Alle auswählen
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectNone}>
                    <X className="h-4 w-4 mr-1" />
                    Keine
                  </Button>
                </div>
              </div>

              {/* Positionen-Liste */}
              <ScrollArea className="flex-1 max-h-[300px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {(selectedAngebot.positionen || []).map((position: any, index: number) => {
                    const isSelected = selectedPositionIds.has(String(index))
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => togglePosition(index)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePosition(index)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getTypIcon(position.typ)}
                            <span className="font-medium truncate">{position.beschreibung}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>{position.menge} {position.einheit}</span>
                            <span>× {formatCurrency(position.einzelpreis || 0)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(position.gesamtpreis || 0)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Summe der Auswahl */}
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="font-medium text-blue-800">Summe der ausgewählten Positionen:</span>
                <span className="font-bold text-xl text-blue-600">{formatCurrency(selectedSum)}</span>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleExtrahieren}
            disabled={!selectedAngebot || selectedPositionIds.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Check className="h-4 w-4 mr-2" />
            {selectedPositionIds.size} Position(en) übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
