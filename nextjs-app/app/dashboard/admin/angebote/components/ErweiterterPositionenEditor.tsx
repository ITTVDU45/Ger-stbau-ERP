"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AngebotPosition, PositionsVorlage } from '@/lib/db/types'
import { Plus, Trash2, ChevronUp, ChevronDown, Link2, Search, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from 'sonner'
import PositionsVorlageVerwaltungDialog from './PositionsVorlageVerwaltungDialog'
import RichTextEditor from './RichTextEditor'

interface ErweiterterPositionenEditorProps {
  positionen: AngebotPosition[]
  onChange: (positionen: AngebotPosition[]) => void
}

export default function ErweiterterPositionenEditor({ positionen, onChange }: ErweiterterPositionenEditorProps) {
  // Hilfsfunktion zum Entfernen von HTML-Tags für Textanzeige
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const [neuePosition, setNeuePosition] = useState<Partial<AngebotPosition>>({
    position: (positionen.length + 1).toString().padStart(2, '0'),
    typ: 'material',
    beschreibung: '',
    menge: 1,
    einheit: 'St.',
    einzelpreis: 0,
    gesamtpreis: 0,
    prozentsatz: undefined,
    verknuepftMitPosition: undefined,
    verknuepfungsTyp: undefined
  })

  const [vorlagen, setVorlagen] = useState<PositionsVorlage[]>([])
  const [vorlagenDialogOpen, setVorlagenDialogOpen] = useState(false)
  const [shortcodeSearch, setShortcodeSearch] = useState('')
  const [bearbeitenDialogOpen, setBearbeitenDialogOpen] = useState(false)
  const [zuBearbeitendePosition, setZuBearbeitendePosition] = useState<{ index: number, position: AngebotPosition } | null>(null)

  useEffect(() => {
    loadVorlagen()
  }, [])

  const loadVorlagen = async () => {
    try {
      const response = await fetch('/api/positionen-vorlagen')
      if (response.ok) {
        const data = await response.json()
        setVorlagen(data.vorlagen || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Vorlagen:', error)
    }
  }

  const handleNeuePositionChange = (field: string, value: any) => {
    let updated = { ...neuePosition, [field]: value }
    
    // Wenn Verknüpfung geändert wird, Werte aus verknüpfter Position übernehmen
    if (field === 'verknuepftMitPosition' && value !== undefined) {
      const verknuepftePosition = positionen.find(p => p.position === value.toString().padStart(2, '0') || parseInt(p.position) === value)
      if (verknuepftePosition) {
        updated = {
          ...updated,
          menge: verknuepftePosition.menge,
          einheit: verknuepftePosition.einheit,
          einzelpreis: verknuepftePosition.einzelpreis,
          prozentsatz: verknuepftePosition.prozentsatz
        }
        toast.info('Werte übernommen', {
          description: `Menge, Einheit, Einzelpreis und Prozentsatz von Position ${verknuepftePosition.position} übernommen`
        })
      }
    }
    
    // Gesamtpreis automatisch berechnen
    if (field === 'menge' || field === 'einzelpreis' || field === 'prozentsatz' || field === 'verknuepftMitPosition') {
      const zwischensumme = (updated.menge || 0) * (updated.einzelpreis || 0)
      
      // Wenn Prozentsatz angegeben, wird dieser von der Zwischensumme berechnet
      if (updated.prozentsatz && updated.prozentsatz > 0) {
        updated.gesamtpreis = zwischensumme * (updated.prozentsatz / 100)
      } else {
        updated.gesamtpreis = zwischensumme
      }
    }
    
    setNeuePosition(updated)
  }

  const handlePositionHinzufuegen = () => {
    if (!neuePosition.beschreibung || !neuePosition.menge || !neuePosition.einzelpreis) {
      toast.error('Unvollständige Position', {
        description: 'Bitte Beschreibung, Menge und Einzelpreis ausfüllen'
      })
      return
    }

    const zwischensumme = (neuePosition.menge || 0) * (neuePosition.einzelpreis || 0)
    let gesamtpreis = zwischensumme
    
    // Prozentuale Berechnung wenn Prozentsatz angegeben
    if (neuePosition.prozentsatz && neuePosition.prozentsatz > 0) {
      gesamtpreis = zwischensumme * (neuePosition.prozentsatz / 100)
    }

    const position: AngebotPosition = {
      position: (positionen.length + 1).toString().padStart(2, '0'),
      typ: neuePosition.typ || 'material',
      beschreibung: neuePosition.beschreibung,
      menge: neuePosition.menge || 0,
      einheit: neuePosition.einheit || 'St.',
      einzelpreis: neuePosition.einzelpreis || 0,
      gesamtpreis: gesamtpreis,
      prozentsatz: neuePosition.prozentsatz,
      verknuepftMitPosition: neuePosition.verknuepftMitPosition,
      verknuepfungsTyp: neuePosition.verknuepftMitPosition ? 'abhaengig' : undefined,
      verknuepfungsBeschreibung: neuePosition.verknuepftMitPosition 
        ? `Bezieht sich auf Position ${neuePosition.verknuepftMitPosition}`
        : undefined
    }

    onChange([...positionen, position])
    
    toast.success('Position hinzugefügt', {
      description: `Pos. ${position.position}: ${stripHtml(position.beschreibung).substring(0, 50)}${stripHtml(position.beschreibung).length > 50 ? '...' : ''}`
    })

    // Reset
    setNeuePosition({
      position: (positionen.length + 2).toString().padStart(2, '0'),
      typ: 'material',
      beschreibung: '',
      menge: 1,
      einheit: 'St.',
      einzelpreis: 0,
      gesamtpreis: 0,
      prozentsatz: undefined,
      verknuepftMitPosition: undefined,
      verknuepfungsTyp: undefined
    })
  }

  // Hilfsfunktion zum Neu-Nummerieren der Positionen
  const renumberPositions = (positions: AngebotPosition[]): AngebotPosition[] => {
    return positions.map((p, i) => ({
      ...p,
      position: (i + 1).toString().padStart(2, '0')
    }))
  }

  const handlePositionVerschieben = (index: number, richtung: 'up' | 'down') => {
    const newIndex = richtung === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= positionen.length) return

    const updated = [...positionen]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp

    // Positionen neu nummerieren
    const renumbered = renumberPositions(updated)
    onChange(renumbered)
  }

  const handlePositionLoeschen = (index: number) => {
    const updated = positionen.filter((_, i) => i !== index)
    const renumbered = renumberPositions(updated)
    onChange(renumbered)
  }

  const handlePositionBearbeitenOeffnen = (index: number) => {
    setZuBearbeitendePosition({ index, position: { ...positionen[index] } })
    setBearbeitenDialogOpen(true)
  }

  const handlePositionBearbeitenChange = (field: string, value: any) => {
    if (!zuBearbeitendePosition) return
    
    let updated = { ...zuBearbeitendePosition.position, [field]: value }
    
    // Wenn Verknüpfung geändert wird, Werte aus verknüpfter Position übernehmen
    if (field === 'verknuepftMitPosition' && value !== undefined) {
      const verknuepftePosition = positionen.find(p => p.position === value.toString().padStart(2, '0') || parseInt(p.position) === value)
      if (verknuepftePosition) {
        updated = {
          ...updated,
          menge: verknuepftePosition.menge,
          einheit: verknuepftePosition.einheit,
          einzelpreis: verknuepftePosition.einzelpreis,
          prozentsatz: verknuepftePosition.prozentsatz
        }
        toast.info('Werte übernommen', {
          description: `Menge, Einheit, Einzelpreis und Prozentsatz von Position ${verknuepftePosition.position} übernommen`
        })
      }
    }
    
    // Gesamtpreis automatisch berechnen
    if (field === 'menge' || field === 'einzelpreis' || field === 'prozentsatz' || field === 'verknuepftMitPosition') {
      const zwischensumme = (updated.menge || 0) * (updated.einzelpreis || 0)
      
      if (updated.prozentsatz && updated.prozentsatz > 0) {
        updated.gesamtpreis = zwischensumme * (updated.prozentsatz / 100)
      } else {
        updated.gesamtpreis = zwischensumme
      }
    }
    
    setZuBearbeitendePosition({ ...zuBearbeitendePosition, position: updated })
  }

  const handlePositionBearbeitenSpeichern = () => {
    if (!zuBearbeitendePosition) return
    
    const updated = [...positionen]
    updated[zuBearbeitendePosition.index] = zuBearbeitendePosition.position
    onChange(updated)
    
    toast.success('Position aktualisiert', {
      description: `Pos. ${zuBearbeitendePosition.position.position} wurde erfolgreich aktualisiert`
    })
    
    setBearbeitenDialogOpen(false)
    setZuBearbeitendePosition(null)
  }

  const handleVorlageEinfuegen = (vorlage: PositionsVorlage) => {
    const zwischensumme = (vorlage.standardMenge || 1) * (vorlage.standardPreis || 0)
    let gesamtpreis = zwischensumme
    
    if (vorlage.standardProzentsatz && vorlage.standardProzentsatz > 0) {
      gesamtpreis = zwischensumme * (vorlage.standardProzentsatz / 100)
    }

    const position: AngebotPosition = {
      position: (positionen.length + 1).toString().padStart(2, '0'),
      typ: vorlage.typ,
      beschreibung: vorlage.beschreibung,
      menge: vorlage.standardMenge || 1,
      einheit: vorlage.einheit,
      einzelpreis: vorlage.standardPreis || 0,
      gesamtpreis: gesamtpreis,
      prozentsatz: vorlage.standardProzentsatz
    }

    onChange([...positionen, position])
    setVorlagenDialogOpen(false)
    setShortcodeSearch('')
    
    toast.success('Vorlage eingefügt', {
      description: `${vorlage.shortcode}: ${vorlage.name}`
    })
  }

  const filteredVorlagen = vorlagen.filter(v => 
    shortcodeSearch === '' ||
    v.shortcode.toLowerCase().includes(shortcodeSearch.toLowerCase()) ||
    v.name.toLowerCase().includes(shortcodeSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Vorlagen-Schnellzugriff */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-gray-900 font-semibold">Vorlagen einfügen</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <PositionsVorlageVerwaltungDialog onVorlageEinfuegen={handleVorlageEinfuegen} />
              <Dialog open={vorlagenDialogOpen} onOpenChange={setVorlagenDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-50 w-full sm:w-auto">
                    <Search className="h-4 w-4 mr-2 text-gray-700" />
                    <span className="font-medium">Schnellsuche</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900 font-bold">Positions-Vorlagen</DialogTitle>
                    <DialogDescription className="text-gray-700">Wählen Sie eine Vorlage aus oder suchen Sie nach Shortcode</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Shortcode oder Name suchen..."
                      value={shortcodeSearch}
                      onChange={(e) => setShortcodeSearch(e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    />
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredVorlagen.map(v => (
                        <div key={v._id} className="flex items-center justify-between p-3 border border-gray-200 bg-white rounded-lg hover:bg-gray-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-blue-400 text-blue-700 font-medium">{v.shortcode}</Badge>
                              <span className="font-semibold text-gray-900">{v.name}</span>
                            </div>
                            <div 
                              className="text-sm text-gray-700 mt-1 rich-text-content"
                              dangerouslySetInnerHTML={{ __html: v.beschreibung }}
                            />
                            <p className="text-xs text-gray-600 mt-1 font-medium">
                              {v.standardMenge} {v.einheit} × {v.standardPreis?.toLocaleString('de-DE')} €
                            </p>
                          </div>
                          <Button size="sm" onClick={() => handleVorlageEinfuegen(v)} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Einfügen
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Angebotspositionen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 font-semibold">Angebotspositionen</CardTitle>
        </CardHeader>
        <CardContent>
          {positionen.length > 0 ? (
            <>
              {/* Desktop-Tabelle (versteckt auf Mobil) */}
              <div className="hidden lg:block rounded-md border border-gray-200 bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-gray-50">
                      <TableHead className="w-12 text-gray-900 font-semibold">Pos.</TableHead>
                      <TableHead className="text-gray-900 font-semibold">Beschreibung</TableHead>
                      <TableHead className="w-24 text-gray-900 font-semibold">Menge</TableHead>
                      <TableHead className="w-24 text-gray-900 font-semibold">Einheit</TableHead>
                      <TableHead className="w-32 text-gray-900 font-semibold">Einzelpreis</TableHead>
                      <TableHead className="w-24 text-gray-900 font-semibold">Prozent</TableHead>
                      <TableHead className="w-32 text-gray-900 font-semibold">Gesamtpreis</TableHead>
                      <TableHead className="w-32 text-gray-900 font-semibold">Verknüpfung</TableHead>
                      <TableHead className="w-24 text-gray-900 font-semibold"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positionen.map((pos, index) => (
                      <TableRow key={index} className="border-gray-200 hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">{pos.position}</TableCell>
                        <TableCell>
                          <div 
                            className="text-gray-900 rich-text-content"
                            dangerouslySetInnerHTML={{ __html: pos.beschreibung }}
                          />
                          {pos.verknuepftMitPosition && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                              <Link2 className="h-3 w-3" />
                              <span className="font-medium">→ Pos. {pos.verknuepftMitPosition}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-900">{pos.menge}</TableCell>
                        <TableCell className="text-gray-700">
                          {pos.einheit && pos.einheit.includes('%') ? 'St.' : (pos.einheit || 'St.')}
                        </TableCell>
                        <TableCell className="text-gray-900">{pos.einzelpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</TableCell>
                        <TableCell className="text-gray-900">
                          {pos.prozentsatz ? (
                            <Badge variant="outline" className="border-green-400 text-green-700 font-semibold">
                              {pos.prozentsatz}%
                            </Badge>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">{pos.gesamtpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</TableCell>
                        <TableCell>
                          {pos.verknuepfungsTyp && (
                            <Badge variant="outline" className="text-xs border-gray-400 text-gray-900">
                              {pos.verknuepfungsTyp === 'basis' ? 'Basis' : 'Abhängig'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePositionVerschieben(index, 'up')}
                              disabled={index === 0}
                              className="p-1 hover:bg-gray-100"
                              title="Nach oben"
                            >
                              <ChevronUp className="h-4 w-4 text-gray-700" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePositionVerschieben(index, 'down')}
                              disabled={index === positionen.length - 1}
                              className="p-1 hover:bg-gray-100"
                              title="Nach unten"
                            >
                              <ChevronDown className="h-4 w-4 text-gray-700" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePositionBearbeitenOeffnen(index)}
                              className="p-1 hover:bg-gray-100"
                              title="Bearbeiten"
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePositionLoeschen(index)}
                              className="p-1 hover:bg-gray-100"
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobil-Card-Layout (sichtbar auf kleinen Bildschirmen) */}
              <div className="lg:hidden space-y-3">
                {positionen.map((pos, index) => (
                  <Card key={index} className="bg-gray-50 border-gray-300">
                    <CardContent className="p-4 space-y-3">
                      {/* Header mit Position und Aktionen */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-600 text-white">Pos. {pos.position}</Badge>
                            <Badge variant="outline" className="border-gray-400 text-gray-700">
                              {pos.typ}
                            </Badge>
                            {pos.verknuepfungsTyp && (
                              <Badge variant="outline" className="text-xs border-gray-400 text-gray-900">
                                {pos.verknuepfungsTyp === 'basis' ? 'Basis' : 'Abhängig'}
                              </Badge>
                            )}
                          </div>
                          {pos.verknuepftMitPosition && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                              <Link2 className="h-3 w-3" />
                              <span className="font-medium">→ Pos. {pos.verknuepftMitPosition}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePositionVerschieben(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-100"
                          >
                            <ChevronUp className="h-4 w-4 text-gray-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePositionVerschieben(index, 'down')}
                            disabled={index === positionen.length - 1}
                            className="p-1 hover:bg-gray-100"
                          >
                            <ChevronDown className="h-4 w-4 text-gray-700" />
                          </Button>
                        </div>
                      </div>

                      {/* Beschreibung */}
                      <div 
                        className="text-gray-900 rich-text-content text-sm"
                        dangerouslySetInnerHTML={{ __html: pos.beschreibung }}
                      />

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Menge:</span>
                          <span className="ml-1 font-medium text-gray-900">{pos.menge} {pos.einheit && pos.einheit.includes('%') ? 'St.' : (pos.einheit || 'St.')}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Einzelpreis:</span>
                          <span className="ml-1 font-medium text-gray-900">{pos.einzelpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                        </div>
                        {pos.prozentsatz && (
                          <div>
                            <span className="text-gray-600">Prozentsatz:</span>
                            <Badge variant="outline" className="ml-1 border-green-400 text-green-700 font-semibold">
                              {pos.prozentsatz}%
                            </Badge>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-gray-600">Gesamtpreis:</span>
                          <span className="ml-1 font-bold text-gray-900 text-base">{pos.gesamtpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                        </div>
                      </div>

                      {/* Aktionen */}
                      <div className="flex gap-2 pt-2 border-t border-gray-300">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePositionBearbeitenOeffnen(index)}
                          className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePositionLoeschen(index)}
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Löschen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-600">Keine Positionen vorhanden. Fügen Sie unten eine Position hinzu.</p>
          )}
        </CardContent>
      </Card>

      {/* Neue Position hinzufügen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-gray-900 font-semibold">Neue Position hinzufügen</CardTitle>
            <PositionsVorlageVerwaltungDialog 
              onVorlageEinfuegen={handleVorlageEinfuegen}
              trigger={
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                  <Search className="h-4 w-4 mr-2" />
                  <span className="font-medium">Aus Vorlage wählen</span>
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Responsives Grid: 1 Spalte auf Mobil, 2 auf Tablet, mehrere auf Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label className="text-gray-900 font-medium">Typ</Label>
                <Select value={neuePosition.typ} onValueChange={(v) => handleNeuePositionChange('typ', v)}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="lohn">Lohn</SelectItem>
                    <SelectItem value="miete">Miete</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 lg:col-span-2 space-y-2">
                <Label className="text-gray-900 font-medium">Beschreibung *</Label>
                <RichTextEditor
                  value={neuePosition.beschreibung || ''}
                  onChange={(value) => handleNeuePositionChange('beschreibung', value)}
                  placeholder="z.B. Gerüstrohre 3m"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Menge *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={neuePosition.menge || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    handleNeuePositionChange('menge', isNaN(val) ? 0 : val)
                  }}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Einheit *</Label>
                <Select
                  value={neuePosition.einheit || 'St.'}
                  onValueChange={(value) => handleNeuePositionChange('einheit', value)}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="St.">St. (Stück)</SelectItem>
                    <SelectItem value="m">m (Meter)</SelectItem>
                    <SelectItem value="qm">qm (Quadratmeter)</SelectItem>
                    <SelectItem value="lfdm">lfdm (Laufende Meter)</SelectItem>
                    <SelectItem value="stgm">stgm (Ständermeter Gerüst)</SelectItem>
                    <SelectItem value="m³">m³ (Kubikmeter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Einzelpreis (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={neuePosition.einzelpreis || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    handleNeuePositionChange('einzelpreis', isNaN(val) ? 0 : val)
                  }}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label className="text-gray-900 font-medium">Prozentsatz (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={neuePosition.prozentsatz || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    handleNeuePositionChange('prozentsatz', isNaN(val) ? undefined : val)
                  }}
                  placeholder="z.B. 50"
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-600">
                  Optional: Prozentsatz der Zwischensumme (Menge × Einzelpreis)
                </p>
              </div>
            </div>

            {/* Verknüpfung */}
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Verknüpft mit Position (optional)</Label>
              <Select 
                value={neuePosition.verknuepftMitPosition?.toString() || 'KEINE'} 
                onValueChange={(v) => handleNeuePositionChange('verknuepftMitPosition', v === 'KEINE' ? undefined : parseInt(v))}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Keine Verknüpfung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEINE">Keine Verknüpfung</SelectItem>
                  {positionen.map(p => (
                    <SelectItem key={p.position} value={p.position.toString()}>
                      Pos. {p.position}: {p.beschreibung}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {neuePosition.verknuepftMitPosition && (
                <p className="text-xs text-blue-600 font-medium">
                  Diese Position wird als abhängig von Position {neuePosition.verknuepftMitPosition} markiert
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-300 pt-4">
              <div className="space-y-1">
                {neuePosition.prozentsatz && neuePosition.prozentsatz > 0 ? (
                  <>
                    <div className="text-xs text-gray-700">
                      Zwischensumme: {((neuePosition.menge || 0) * (neuePosition.einzelpreis || 0)).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € × {neuePosition.prozentsatz}%
                    </div>
                    <div className="text-sm text-gray-800">
                      Gesamtpreis: <span className="font-bold text-gray-900 text-lg">{(neuePosition.gesamtpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-800">
                    Gesamtpreis: <span className="font-bold text-gray-900 text-lg">{(neuePosition.gesamtpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                  </div>
                )}
              </div>
              <Button onClick={handlePositionHinzufuegen} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="font-medium">Position hinzufügen</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Position bearbeiten */}
      <Dialog open={bearbeitenDialogOpen} onOpenChange={setBearbeitenDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold text-xl">
              Position {zuBearbeitendePosition?.position.position} bearbeiten
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              Nehmen Sie Änderungen an dieser Position vor
            </DialogDescription>
          </DialogHeader>
          
          {zuBearbeitendePosition && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Typ</Label>
                  <Select 
                    value={zuBearbeitendePosition.position.typ} 
                    onValueChange={(v) => handlePositionBearbeitenChange('typ', v)}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="lohn">Lohn</SelectItem>
                      <SelectItem value="miete">Miete</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="sonstiges">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <Label className="text-gray-900 font-medium">Beschreibung *</Label>
                  <RichTextEditor
                    value={zuBearbeitendePosition.position.beschreibung || ''}
                    onChange={(value) => handlePositionBearbeitenChange('beschreibung', value)}
                    placeholder="z.B. Gerüstrohre 3m"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Menge *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={zuBearbeitendePosition.position.menge || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      handlePositionBearbeitenChange('menge', isNaN(val) ? 0 : val)
                    }}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Einheit *</Label>
                  <Select
                    value={zuBearbeitendePosition.position.einheit || 'St.'}
                    onValueChange={(value) => handlePositionBearbeitenChange('einheit', value)}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="St.">St. (Stück)</SelectItem>
                      <SelectItem value="m">m (Meter)</SelectItem>
                      <SelectItem value="qm">qm (Quadratmeter)</SelectItem>
                      <SelectItem value="lfdm">lfdm (Laufende Meter)</SelectItem>
                      <SelectItem value="stgm">stgm (Ständermeter Gerüst)</SelectItem>
                      <SelectItem value="m³">m³ (Kubikmeter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Einzelpreis (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={zuBearbeitendePosition.position.einzelpreis || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      handlePositionBearbeitenChange('einzelpreis', isNaN(val) ? 0 : val)
                    }}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Prozentsatz (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={zuBearbeitendePosition.position.prozentsatz || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      handlePositionBearbeitenChange('prozentsatz', isNaN(val) ? undefined : val)
                    }}
                    placeholder="z.B. 50 für 50%"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label className="text-gray-900 font-medium">Verknüpft mit Position (optional)</Label>
                <Select 
                  value={zuBearbeitendePosition.position.verknuepftMitPosition?.toString() || 'KEINE'} 
                  onValueChange={(v) => handlePositionBearbeitenChange('verknuepftMitPosition', v === 'KEINE' ? undefined : parseInt(v))}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Keine Verknüpfung" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEINE">Keine Verknüpfung</SelectItem>
                    {positionen
                      .filter((_, i) => i !== zuBearbeitendePosition.index)
                      .map(p => (
                        <SelectItem key={p.position} value={p.position.toString()}>
                          Pos. {p.position}: {p.beschreibung}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-gray-300 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    {zuBearbeitendePosition.position.prozentsatz && zuBearbeitendePosition.position.prozentsatz > 0 ? (
                      <>
                        <div className="text-xs text-gray-700">
                          Zwischensumme: {((zuBearbeitendePosition.position.menge || 0) * (zuBearbeitendePosition.position.einzelpreis || 0)).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € × {zuBearbeitendePosition.position.prozentsatz}%
                        </div>
                        <div className="text-sm text-gray-800">
                          Gesamtpreis: <span className="font-bold text-gray-900 text-lg">{(zuBearbeitendePosition.position.gesamtpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-800">
                        Gesamtpreis: <span className="font-bold text-gray-900 text-lg">{(zuBearbeitendePosition.position.gesamtpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => setBearbeitenDialogOpen(false)}
                      className="border-gray-300 text-gray-900 hover:bg-gray-50 w-full sm:w-auto"
                    >
                      Abbrechen
                    </Button>
                    <Button 
                      onClick={handlePositionBearbeitenSpeichern} 
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                    >
                      <span className="font-medium">Änderungen speichern</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

