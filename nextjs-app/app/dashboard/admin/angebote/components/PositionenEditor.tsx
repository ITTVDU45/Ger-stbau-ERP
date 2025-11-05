"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AngebotPosition, PositionsVorlage } from '@/lib/db/types'
import { Plus, Trash2, Search, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import PositionsVorlageVerwaltungDialog from './PositionsVorlageVerwaltungDialog'
import { toast } from 'sonner'

interface PositionenEditorProps {
  positionen: AngebotPosition[]
  onChange: (positionen: AngebotPosition[]) => void
}

export default function PositionenEditor({ positionen, onChange }: PositionenEditorProps) {
  const [neuePosition, setNeuePosition] = useState<Partial<AngebotPosition>>({
    position: positionen.length + 1,
    typ: 'material',
    beschreibung: '',
    menge: 1,
    einheit: 'Stk',
    einzelpreis: 0,
    gesamtpreis: 0,
    prozentsatz: undefined
  })
  
  const [bearbeitenDialogOpen, setBearbeitenDialogOpen] = useState(false)
  const [zuBearbeitendePosition, setZuBearbeitendePosition] = useState<{ index: number, position: AngebotPosition } | null>(null)

  const handleNeuePositionChange = (field: string, value: any) => {
    const updated = { ...neuePosition, [field]: value }
    
    // Gesamtpreis automatisch berechnen
    if (field === 'menge' || field === 'einzelpreis' || field === 'prozentsatz') {
      const zwischensumme = (updated.menge || 0) * (updated.einzelpreis || 0)
      
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
      alert('Bitte alle Felder ausfüllen')
      return
    }

    const zwischensumme = (neuePosition.menge || 0) * (neuePosition.einzelpreis || 0)
    let gesamtpreis = zwischensumme
    
    if (neuePosition.prozentsatz && neuePosition.prozentsatz > 0) {
      gesamtpreis = zwischensumme * (neuePosition.prozentsatz / 100)
    }

    const position: AngebotPosition = {
      position: positionen.length + 1,
      typ: neuePosition.typ || 'material',
      beschreibung: neuePosition.beschreibung,
      menge: neuePosition.menge || 0,
      einheit: neuePosition.einheit || 'Stk',
      einzelpreis: neuePosition.einzelpreis || 0,
      gesamtpreis: gesamtpreis,
      prozentsatz: neuePosition.prozentsatz
    }

    onChange([...positionen, position])

    // Reset
    setNeuePosition({
      position: positionen.length + 2,
      typ: 'material',
      beschreibung: '',
      menge: 1,
      einheit: 'Stk',
      einzelpreis: 0,
      gesamtpreis: 0,
      prozentsatz: undefined
    })
  }

  const handlePositionLoeschen = (index: number) => {
    const updated = positionen.filter((_, i) => i !== index)
    // Positionen neu nummerieren
    const renumbered = updated.map((p, i) => ({ ...p, position: i + 1 }))
    onChange(renumbered)
  }

  const handlePositionBearbeiten = (index: number, field: string, value: any) => {
    const updated = [...positionen]
    updated[index] = { ...updated[index], [field]: value }
    
    // Gesamtpreis neu berechnen
    if (field === 'menge' || field === 'einzelpreis' || field === 'prozentsatz') {
      const zwischensumme = updated[index].menge * updated[index].einzelpreis
      
      if (updated[index].prozentsatz && updated[index].prozentsatz > 0) {
        updated[index].gesamtpreis = zwischensumme * (updated[index].prozentsatz / 100)
      } else {
        updated[index].gesamtpreis = zwischensumme
      }
    }
    
    onChange(updated)
  }

  const handleVorlageEinfuegen = (vorlage: PositionsVorlage) => {
    const zwischensumme = (vorlage.standardMenge || 1) * (vorlage.standardPreis || 0)
    let gesamtpreis = zwischensumme
    
    if (vorlage.standardProzentsatz && vorlage.standardProzentsatz > 0) {
      gesamtpreis = zwischensumme * (vorlage.standardProzentsatz / 100)
    }

    const position: AngebotPosition = {
      position: positionen.length + 1,
      typ: vorlage.typ,
      beschreibung: vorlage.beschreibung,
      menge: vorlage.standardMenge || 1,
      einheit: vorlage.einheit,
      einzelpreis: vorlage.standardPreis || 0,
      gesamtpreis: gesamtpreis,
      prozentsatz: vorlage.standardProzentsatz
    }

    onChange([...positionen, position])
    
    toast.success('Vorlage eingefügt', {
      description: `${vorlage.shortcode}: ${vorlage.name}`
    })
  }

  const handlePositionBearbeitenOeffnen = (index: number) => {
    setZuBearbeitendePosition({ index, position: { ...positionen[index] } })
    setBearbeitenDialogOpen(true)
  }

  const handlePositionBearbeitenChange = (field: string, value: any) => {
    if (!zuBearbeitendePosition) return
    
    const updated = { ...zuBearbeitendePosition.position, [field]: value }
    
    if (field === 'menge' || field === 'einzelpreis' || field === 'prozentsatz') {
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
    
    toast.success('Position aktualisiert')
    
    setBearbeitenDialogOpen(false)
    setZuBearbeitendePosition(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Angebotspositionen</CardTitle>
        </CardHeader>
        <CardContent>
          {positionen.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Pos.</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="w-24">Menge</TableHead>
                    <TableHead className="w-24">Einheit</TableHead>
                    <TableHead className="w-32">Einzelpreis</TableHead>
                    <TableHead className="w-24">Prozent</TableHead>
                    <TableHead className="w-32">Gesamtpreis</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positionen.map((pos, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-gray-900">{pos.position}</TableCell>
                      <TableCell>
                        <Select 
                          value={pos.typ} 
                          onValueChange={(v) => handlePositionBearbeiten(index, 'typ', v)}
                        >
                          <SelectTrigger className="w-32">
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
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pos.beschreibung}
                          onChange={(e) => handlePositionBearbeiten(index, 'beschreibung', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={pos.menge}
                          onChange={(e) => handlePositionBearbeiten(index, 'menge', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pos.einheit}
                          onChange={(e) => handlePositionBearbeiten(index, 'einheit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={pos.einzelpreis}
                          onChange={(e) => handlePositionBearbeiten(index, 'einzelpreis', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={pos.prozentsatz || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            handlePositionBearbeiten(index, 'prozentsatz', isNaN(val) ? undefined : val)
                          }}
                          placeholder="%"
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {pos.gesamtpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePositionBearbeitenOeffnen(index)}
                            title="Bearbeiten"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePositionLoeschen(index)}
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">Keine Positionen vorhanden. Fügen Sie unten eine Position hinzu.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Neue Position hinzufügen</CardTitle>
            <PositionsVorlageVerwaltungDialog 
              onVorlageEinfuegen={handleVorlageEinfuegen}
              trigger={
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Search className="h-4 w-4 mr-2" />
                  <span className="font-medium">Aus Vorlage wählen</span>
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-7 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neu-typ">Typ</Label>
                <Select 
                  value={neuePosition.typ} 
                  onValueChange={(v) => handleNeuePositionChange('typ', v)}
                >
                  <SelectTrigger>
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

              <div className="col-span-2 space-y-2">
                <Label htmlFor="neu-beschreibung">Beschreibung *</Label>
                <Input
                  id="neu-beschreibung"
                  value={neuePosition.beschreibung}
                  onChange={(e) => handleNeuePositionChange('beschreibung', e.target.value)}
                  placeholder="z.B. Gerüstrohre 3m"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neu-menge">Menge *</Label>
                <Input
                  id="neu-menge"
                  type="number"
                  step="0.01"
                  value={neuePosition.menge || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    handleNeuePositionChange('menge', isNaN(val) ? 0 : val)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neu-einheit">Einheit *</Label>
                <Input
                  id="neu-einheit"
                  value={neuePosition.einheit}
                  onChange={(e) => handleNeuePositionChange('einheit', e.target.value)}
                  placeholder="Stk, m, kg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neu-einzelpreis">Einzelpreis (€) *</Label>
                <Input
                  id="neu-einzelpreis"
                  type="number"
                  step="0.01"
                  value={neuePosition.einzelpreis || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    handleNeuePositionChange('einzelpreis', isNaN(val) ? 0 : val)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neu-prozentsatz">Prozent (%)</Label>
                <Input
                  id="neu-prozentsatz"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={neuePosition.prozentsatz || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    handleNeuePositionChange('prozentsatz', isNaN(val) ? undefined : val)
                  }}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {neuePosition.prozentsatz && neuePosition.prozentsatz > 0 ? (
                  <>
                    <div className="text-xs text-gray-600">
                      Zwischensumme: {((neuePosition.menge || 0) * (neuePosition.einzelpreis || 0)).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € × {neuePosition.prozentsatz}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Gesamtpreis: <span className="font-semibold text-gray-900">{(neuePosition.gesamtpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-600">
                    Gesamtpreis: <span className="font-semibold text-gray-900">{(neuePosition.gesamtpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                  </div>
                )}
              </div>
              <Button onClick={handlePositionHinzufuegen} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Position hinzufügen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Position bearbeiten */}
      <Dialog open={bearbeitenDialogOpen} onOpenChange={setBearbeitenDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
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
                  <Input
                    value={zuBearbeitendePosition.position.beschreibung}
                    onChange={(e) => handlePositionBearbeitenChange('beschreibung', e.target.value)}
                    placeholder="z.B. Gerüstrohre 3m"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
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
                  <Input
                    value={zuBearbeitendePosition.position.einheit}
                    onChange={(e) => handlePositionBearbeitenChange('einheit', e.target.value)}
                    placeholder="Stk, m, kg"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
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
                    placeholder="z.B. 50"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4">
                <div className="flex items-center justify-between">
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
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setBearbeitenDialogOpen(false)}
                      className="border-gray-300 text-gray-900 hover:bg-gray-50"
                    >
                      Abbrechen
                    </Button>
                    <Button 
                      onClick={handlePositionBearbeitenSpeichern} 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
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

