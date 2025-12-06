'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calculator, Save, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface Position {
  position: string
  beschreibung: string
  menge: number
  einheit: string
  einzelpreis: number
  gesamtpreis: number
  preisTyp?: 'fest' | 'einheitspreis'
  finalerEinzelpreis?: number
  finalerGesamtpreis?: number
  verknuepftMitPosition?: string
  prozentsatz?: number
}

interface EinheitspreisPositionenProps {
  projektId: string
  angebotId?: string
  onUpdate?: () => void
}

export default function EinheitspreisPositionen({ 
  projektId, 
  angebotId, 
  onUpdate 
}: EinheitspreisPositionenProps) {
  const [positionen, setPositionen] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editedPositionen, setEditedPositionen] = useState<{ [key: string]: number }>({})
  const [editedProzentsaetze, setEditedProzentsaetze] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    if (angebotId) {
      loadEinheitspreisPositionen()
    }
  }, [angebotId])

  const loadEinheitspreisPositionen = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/angebote/${angebotId}`)
      const data = await response.json()
      
      if (data.erfolg && data.angebot) {
        // Filtere nur Positionen mit preisTyp='einheitspreis'
        const epPositionen = data.angebot.positionen.filter(
          (pos: Position) => pos.preisTyp === 'einheitspreis'
        )
        setPositionen(epPositionen)
        
        // Initialisiere editedPositionen mit vorhandenen Werten
        const initial: { [key: string]: number } = {}
        const initialProzent: { [key: string]: number } = {}
        epPositionen.forEach((pos: Position) => {
          if (pos.finalerEinzelpreis !== undefined && pos.finalerEinzelpreis > 0) {
            initial[pos.position] = pos.finalerEinzelpreis
          }
          if (pos.prozentsatz !== undefined && pos.prozentsatz > 0) {
            initialProzent[pos.position] = pos.prozentsatz
          }
        })
        setEditedPositionen(initial)
        setEditedProzentsaetze(initialProzent)
      }
    } catch (error) {
      console.error('Fehler beim Laden der E.P. Positionen:', error)
      toast.error('Fehler beim Laden der Einheitspreise')
    } finally {
      setLoading(false)
    }
  }

  const handlePreisChange = (position: string, wert: number) => {
    setEditedPositionen(prev => ({
      ...prev,
      [position]: wert
    }))
  }

  const handleProzentsatzChange = (position: string, wert: number) => {
    setEditedProzentsaetze(prev => ({
      ...prev,
      [position]: wert
    }))
  }

  const berechneGesamtpreis = (pos: Position): number => {
    const einzelpreis = editedPositionen[pos.position] || pos.finalerEinzelpreis || 0
    const prozentsatz = editedProzentsaetze[pos.position] || pos.prozentsatz || 0
    
    // Wenn ein Prozentsatz gesetzt ist, berechne Prozentsatz vom Einzelpreis
    if (prozentsatz > 0) {
      return (einzelpreis * prozentsatz / 100) * pos.menge
    }
    
    // Ansonsten normale Berechnung
    return einzelpreis * pos.menge
  }

  const handleSpeichern = async () => {
    try {
      setSaving(true)
      
      // Update Angebot mit finalen Preisen
      const updatedPositionen = positionen.map(pos => ({
        ...pos,
        finalerEinzelpreis: editedPositionen[pos.position] || pos.finalerEinzelpreis || 0,
        finalerGesamtpreis: berechneGesamtpreis(pos),
        prozentsatz: editedProzentsaetze[pos.position] || pos.prozentsatz || 0
      }))
      
      const response = await fetch(`/api/angebote/${angebotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionen: updatedPositionen
        })
      })
      
      const data = await response.json()
      
      if (data.erfolg) {
        toast.success('Einheitspreise erfolgreich gespeichert')
        await loadEinheitspreisPositionen()
        if (onUpdate) {
          onUpdate()
        }
      } else {
        toast.error('Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  if (!angebotId) {
    return (
      <Alert className="bg-orange-50 border-orange-300">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-900">
          <strong>Kein Angebot zugewiesen:</strong> Um Einheitspreise zu bearbeiten, muss ein Angebot dem Projekt zugewiesen sein.
        </AlertDescription>
      </Alert>
    )
  }

  if (positionen.length === 0) {
    return (
      <Alert className="bg-blue-50 border-blue-300">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Keine E.P. Positionen:</strong> Das zugewiesene Angebot enthält keine Positionen mit Einheitspreisen (E.P.).
        </AlertDescription>
      </Alert>
    )
  }

  const gesamtsummeEP = positionen.reduce((sum, pos) => sum + berechneGesamtpreis(pos), 0)
  const alleGesetzt = positionen.every(pos => 
    editedPositionen[pos.position] !== undefined || 
    (pos.finalerEinzelpreis !== undefined && pos.finalerEinzelpreis > 0)
  )

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-gray-900">Einheitspreise (E.P.) bearbeiten</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Setzen Sie die finalen Preise für Positionen mit Einheitspreis
              </p>
            </div>
          </div>
          <Button
            onClick={handleSpeichern}
            disabled={saving || !alleGesetzt}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Speichere...' : 'Preise speichern'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!alleGesetzt && (
          <Alert className="mb-4 bg-yellow-50 border-yellow-300">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>Nicht alle Preise gesetzt:</strong> Bitte setzen Sie alle Einheitspreise bevor Sie speichern.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-900">Pos.</TableHead>
                <TableHead className="text-gray-900">Beschreibung</TableHead>
                <TableHead className="text-gray-900 text-right">Menge</TableHead>
                <TableHead className="text-gray-900 text-right">Prozentsatz (%)</TableHead>
                <TableHead className="text-gray-900 text-right">Einzelpreis (€)</TableHead>
                <TableHead className="text-gray-900 text-right">Gesamt (€)</TableHead>
                <TableHead className="text-gray-900 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positionen.map((pos) => {
                const einzelpreis = editedPositionen[pos.position] !== undefined 
                  ? editedPositionen[pos.position]
                  : (pos.finalerEinzelpreis || 0)
                const prozentsatz = editedProzentsaetze[pos.position] !== undefined
                  ? editedProzentsaetze[pos.position]
                  : (pos.prozentsatz || 0)
                const gesamtpreis = berechneGesamtpreis(pos)
                const isGesetzt = einzelpreis > 0

                return (
                  <TableRow key={pos.position}>
                    <TableCell className="font-medium text-gray-900">{pos.position}</TableCell>
                    <TableCell className="text-gray-900">
                      <div
                        className="font-medium rich-text-content prose prose-sm max-w-none [&_p]:my-1 [&_strong]:font-bold [&_u]:underline [&_em]:italic"
                        dangerouslySetInnerHTML={{ __html: pos.beschreibung || '' }}
                      />
                      {pos.verknuepftMitPosition && (
                        <span className="block text-xs text-gray-500 mt-1">
                          Bezieht sich auf Pos. {pos.verknuepftMitPosition}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700 text-right">
                      {pos.menge} {pos.einheit}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={prozentsatz || ''}
                        onChange={(e) => handleProzentsatzChange(pos.position, parseFloat(e.target.value) || 0)}
                        className="w-24 text-right text-gray-900 border-gray-300"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={einzelpreis || ''}
                        onChange={(e) => handlePreisChange(pos.position, parseFloat(e.target.value) || 0)}
                        className="w-32 text-right text-gray-900 border-gray-300"
                        placeholder="0,00"
                      />
                    </TableCell>
                    <TableCell className="text-gray-900 font-semibold text-right">
                      {gesamtpreis > 0 ? (
                        <>
                          {gesamtpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          {prozentsatz > 0 && (
                            <div className="text-xs text-gray-500 font-normal mt-0.5">
                              ({einzelpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € × {prozentsatz}% × {pos.menge})
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isGesetzt ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          Gesetzt
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                          Offen
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              
              {/* Summenzeile */}
              <TableRow className="bg-blue-50 font-bold">
                <TableCell colSpan={5} className="text-right text-gray-900">
                  Gesamtsumme E.P. Positionen:
                </TableCell>
                <TableCell className="text-gray-900 text-right">
                  {gesamtsummeEP > 0 ? (
                    <>{gesamtsummeEP.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Hinweis:</strong> Die hier gesetzten Preise werden automatisch in die Projektkalkulation übernommen. 
            Änderungen an den Einheitspreisen werden sofort in der Gesamtkalkulation berücksichtigt.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

