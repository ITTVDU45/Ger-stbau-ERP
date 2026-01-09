"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Plus, 
  Trash2, 
  FileSpreadsheet,
  GripVertical,
  Copy,
  BookOpen
} from 'lucide-react'
import { AngebotPosition } from '@/lib/db/types'
import { toast } from 'sonner'
import PositionsVorlageVerwaltungDialog from '@/app/dashboard/admin/angebote/components/PositionsVorlageVerwaltungDialog'

interface RechnungPositionenEditorProps {
  positionen: AngebotPosition[]
  onChange: (positionen: AngebotPosition[]) => void
  onOpenAngebotDialog: () => void
  kundeId?: string
}

const EINHEIT_OPTIONEN = [
  'Stück', 'm', 'm²', 'm³', 'kg', 'Stunden', 'Tage', 'Wochen', 'Monate', 'Pauschal', 'lfm'
]

const TYP_OPTIONEN = [
  { value: 'material', label: 'Material' },
  { value: 'arbeit', label: 'Arbeit' },
  { value: 'miete', label: 'Miete' },
  { value: 'pauschale', label: 'Pauschale' }
]

export default function RechnungPositionenEditor({
  positionen,
  onChange,
  onOpenAngebotDialog,
  kundeId
}: RechnungPositionenEditorProps) {
  const [shortcodeInput, setShortcodeInput] = useState('')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const addPosition = () => {
    const newPosition: AngebotPosition = {
      position: positionen.length + 1,
      typ: 'material',
      beschreibung: '',
      menge: 1,
      einheit: 'Stück',
      einzelpreis: 0,
      gesamtpreis: 0
    }
    onChange([...positionen, newPosition])
    toast.success('Position hinzugefügt')
  }

  const removePosition = (index: number) => {
    const updated = positionen.filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, position: i + 1 }))
    onChange(updated)
    toast.success('Position entfernt')
  }

  const duplicatePosition = (index: number) => {
    const original = positionen[index]
    const duplicate: AngebotPosition = {
      ...original,
      position: positionen.length + 1
    }
    onChange([...positionen, duplicate])
    toast.success('Position dupliziert')
  }

  const updatePosition = (index: number, field: keyof AngebotPosition, value: any) => {
    const updated = [...positionen]
    updated[index] = { ...updated[index], [field]: value }
    
    // Gesamtpreis automatisch berechnen
    if (field === 'menge' || field === 'einzelpreis') {
      const menge = field === 'menge' ? value : updated[index].menge
      const einzelpreis = field === 'einzelpreis' ? value : updated[index].einzelpreis
      
      // Bei Miete: Tagespreis × Anzahl Tage
      if (updated[index].typ === 'miete' && updated[index].mietVon && updated[index].mietBis) {
        const von = new Date(updated[index].mietVon!)
        const bis = new Date(updated[index].mietBis!)
        const tage = Math.ceil((bis.getTime() - von.getTime()) / (1000 * 60 * 60 * 24)) + 1
        updated[index].anzahlTage = tage
        updated[index].gesamtpreis = menge * einzelpreis * tage
      } else {
        updated[index].gesamtpreis = menge * einzelpreis
      }
    }
    
    // Bei Miete: Datum geändert → Tage neu berechnen
    if (field === 'mietVon' || field === 'mietBis') {
      const von = field === 'mietVon' ? new Date(value) : (updated[index].mietVon ? new Date(updated[index].mietVon!) : null)
      const bis = field === 'mietBis' ? new Date(value) : (updated[index].mietBis ? new Date(updated[index].mietBis!) : null)
      
      if (von && bis) {
        const tage = Math.ceil((bis.getTime() - von.getTime()) / (1000 * 60 * 60 * 24)) + 1
        updated[index].anzahlTage = tage
        updated[index].gesamtpreis = updated[index].menge * updated[index].einzelpreis * tage
      }
    }
    
    onChange(updated)
  }

  const handleShortcodeSubmit = async () => {
    if (!shortcodeInput.trim()) return

    try {
      const response = await fetch(`/api/positionen-vorlagen/shortcode/${shortcodeInput.trim()}`)
      if (response.ok) {
        const data = await response.json()
        const vorlage = data.vorlage
        
        const newPosition: AngebotPosition = {
          position: positionen.length + 1,
          typ: vorlage.typ || 'material',
          beschreibung: vorlage.beschreibung,
          menge: vorlage.menge || 1,
          einheit: vorlage.einheit || 'Stück',
          einzelpreis: vorlage.einzelpreis || 0,
          gesamtpreis: (vorlage.menge || 1) * (vorlage.einzelpreis || 0)
        }
        
        onChange([...positionen, newPosition])
        setShortcodeInput('')
        toast.success(`Vorlage "${vorlage.name}" hinzugefügt`)
      } else {
        toast.error('Vorlage nicht gefunden', {
          description: `Shortcode "${shortcodeInput}" existiert nicht`
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden der Vorlage')
    }
  }

  const handleVorlageAuswahl = (vorlage: any) => {
    const newPosition: AngebotPosition = {
      position: positionen.length + 1,
      typ: vorlage.typ || 'material',
      beschreibung: vorlage.beschreibung || vorlage.name,
      menge: vorlage.standardMenge || vorlage.menge || 1,
      einheit: vorlage.einheit || 'Stück',
      einzelpreis: vorlage.standardPreis || vorlage.einzelpreis || 0,
      gesamtpreis: (vorlage.standardMenge || vorlage.menge || 1) * (vorlage.standardPreis || vorlage.einzelpreis || 0)
    }
    
    onChange([...positionen, newPosition])
    toast.success(`Vorlage "${vorlage.name}" hinzugefügt`)
  }

  const gesamtNetto = positionen.reduce((sum, p) => sum + (p.gesamtpreis || 0), 0)

  return (
    <>
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg">Positionen</CardTitle>
            <div className="flex flex-wrap gap-2">
              {/* Shortcode-Eingabe */}
              <div className="flex gap-1">
                <Input
                  placeholder="Shortcode eingeben..."
                  value={shortcodeInput}
                  onChange={(e) => setShortcodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleShortcodeSubmit()}
                  className="w-40"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleShortcodeSubmit}
                  disabled={!shortcodeInput.trim()}
                >
                  OK
                </Button>
              </div>
              
              <PositionsVorlageVerwaltungDialog
                onVorlageEinfuegen={handleVorlageAuswahl}
                trigger={
                  <Button variant="outline" size="sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Vorlagen
                  </Button>
                }
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAngebotDialog}
                disabled={!kundeId}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Aus Angebot
              </Button>
              
              <Button
                size="sm"
                onClick={addPosition}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Position hinzufügen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-24">Typ</TableHead>
                  <TableHead className="min-w-[200px]">Beschreibung</TableHead>
                  <TableHead className="w-24 text-right">Menge</TableHead>
                  <TableHead className="w-24">Einheit</TableHead>
                  <TableHead className="w-32 text-right">Einzelpreis</TableHead>
                  <TableHead className="w-32 text-right">Gesamt</TableHead>
                  <TableHead className="w-24">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positionen.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Keine Positionen vorhanden</p>
                      <p className="text-sm">Fügen Sie Positionen hinzu oder importieren Sie sie aus einem Angebot</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  positionen.map((position, index) => (
                    <React.Fragment key={index}>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                            <span className="text-gray-600">{position.position}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={position.typ || 'material'}
                            onValueChange={(v) => updatePosition(index, 'typ', v)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TYP_OPTIONEN.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={position.beschreibung || ''}
                            onChange={(e) => updatePosition(index, 'beschreibung', e.target.value)}
                            placeholder="Beschreibung..."
                            className="min-w-[200px]"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={position.menge || 0}
                            onChange={(e) => updatePosition(index, 'menge', parseFloat(e.target.value) || 0)}
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={position.einheit || 'Stück'}
                            onValueChange={(v) => updatePosition(index, 'einheit', v)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EINHEIT_OPTIONEN.map(einheit => (
                                <SelectItem key={einheit} value={einheit}>
                                  {einheit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={position.einzelpreis || 0}
                            onChange={(e) => updatePosition(index, 'einzelpreis', parseFloat(e.target.value) || 0)}
                            className="w-28 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(position.gesamtpreis || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicatePosition(index)}
                              title="Duplizieren"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removePosition(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Miete: Zusatzzeile für Zeitraum */}
                      {position.typ === 'miete' && (
                        <TableRow className="bg-blue-50">
                          <TableCell colSpan={2}></TableCell>
                          <TableCell colSpan={6}>
                            <div className="flex items-center gap-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Von:</span>
                                <Input
                                  type="date"
                                  value={position.mietVon 
                                    ? (position.mietVon instanceof Date 
                                        ? position.mietVon.toISOString().split('T')[0]
                                        : new Date(position.mietVon).toISOString().split('T')[0])
                                    : ''}
                                  onChange={(e) => updatePosition(index, 'mietVon', e.target.value)}
                                  className="w-36"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Bis:</span>
                                <Input
                                  type="date"
                                  value={position.mietBis 
                                    ? (position.mietBis instanceof Date 
                                        ? position.mietBis.toISOString().split('T')[0]
                                        : new Date(position.mietBis).toISOString().split('T')[0])
                                    : ''}
                                  onChange={(e) => updatePosition(index, 'mietBis', e.target.value)}
                                  className="w-36"
                                />
                              </div>
                              {position.anzahlTage && (
                                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {position.anzahlTage} Tage
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summe */}
          {positionen.length > 0 && (
            <div className="flex justify-end mt-6 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-gray-600">Zwischensumme (netto)</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(gesamtNetto)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vorlagen-Dialog als versteckter Trigger - wird über Button im Header aufgerufen */}
    </>
  )
}
