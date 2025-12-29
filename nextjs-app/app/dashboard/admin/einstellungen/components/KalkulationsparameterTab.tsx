'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { KalkulationsParameter } from '@/lib/db/types'

export default function KalkulationsparameterTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [parameter, setParameter] = useState<KalkulationsParameter>({
    standardStundensatz: 72,
    verteilungsfaktor: {
      aufbau: 70,
      abbau: 30
    },
    rundungsregel: 'kaufmaennisch',
    farbschwellen: {
      gruen: { min: 95, max: 105 },
      gelb: { min: 90, max: 110 },
      rot: { min: 0, max: 200 }
    },
    aktiv: true,
    erstelltAm: new Date(),
    zuletztGeaendert: new Date()
  })

  useEffect(() => {
    loadParameter()
  }, [])

  const loadParameter = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/kalkulationsparameter')
      const data = await response.json()
      
      if (data.erfolg) {
        setParameter(data.parameter)
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error)
      toast.error('Fehler beim Laden der Kalkulationsparameter')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      // Validierung
      if (parameter.standardStundensatz <= 0) {
        toast.error('Stundensatz muss größer als 0 sein')
        return
      }

      if (parameter.verteilungsfaktor.aufbau + parameter.verteilungsfaktor.abbau !== 100) {
        toast.error('Verteilungsfaktoren müssen zusammen 100% ergeben')
        return
      }

      setSaving(true)
      const response = await fetch('/api/settings/kalkulationsparameter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parameter)
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Kalkulationsparameter erfolgreich gespeichert')
        loadParameter() // Neu laden um aktualisierte Timestamps zu bekommen
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast.error('Fehler beim Speichern der Kalkulationsparameter')
    } finally {
      setSaving(false)
    }
  }

  const handleAufbauChange = (value: number) => {
    setParameter({
      ...parameter,
      verteilungsfaktor: {
        aufbau: value,
        abbau: 100 - value
      }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Kalkulationsparameter</CardTitle>
          <CardDescription className="text-gray-600">
            Globale Einstellungen für die Vor- und Nachkalkulation in allen Projekten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Standard-Stundensatz */}
          <div className="space-y-3">
            <Label htmlFor="stundensatz" className="text-base font-semibold text-gray-900">
              Standard-Stundensatz
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="stundensatz"
                type="number"
                value={parameter.standardStundensatz}
                onChange={(e) => setParameter({ ...parameter, standardStundensatz: Number(e.target.value) })}
                className="max-w-xs"
                min="0"
                step="0.01"
              />
              <span className="text-gray-600 font-medium">€ / Stunde</span>
            </div>
            <p className="text-sm text-gray-500">
              Dieser Wert wird standardmäßig für neue Projekte verwendet und kann projektspezifisch überschrieben werden.
            </p>
          </div>

          {/* Verteilungsfaktor */}
          <div className="space-y-4">
            <Label className="text-base font-semibold text-gray-900">
              Verteilungsfaktor Aufbau / Abbau
            </Label>
            
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Aufbau</span>
                  <span className="text-lg font-bold text-blue-600">{parameter.verteilungsfaktor.aufbau}%</span>
                </div>
                <Slider
                  value={[parameter.verteilungsfaktor.aufbau]}
                  onValueChange={(values) => handleAufbauChange(values[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Abbau</span>
                  <span className="text-lg font-bold text-green-600">{parameter.verteilungsfaktor.abbau}%</span>
                </div>
                <Slider
                  value={[parameter.verteilungsfaktor.abbau]}
                  disabled
                  min={0}
                  max={100}
                  className="w-full opacity-50"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Diese Gewichtung wird bei der Berechnung von gewichteten Gesamt-Stunden und Umsätzen verwendet.
                </span>
              </div>
            </div>
          </div>

          {/* Rundungsregel */}
          <div className="space-y-3">
            <Label htmlFor="rundungsregel" className="text-base font-semibold text-gray-900">
              Rundungsregel
            </Label>
            <Select
              value={parameter.rundungsregel}
              onValueChange={(value: 'auf' | 'ab' | 'kaufmaennisch') => 
                setParameter({ ...parameter, rundungsregel: value })
              }
            >
              <SelectTrigger id="rundungsregel" className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kaufmaennisch">Kaufmännisch (Standard)</SelectItem>
                <SelectItem value="auf">Aufrunden</SelectItem>
                <SelectItem value="ab">Abrunden</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Legt fest, wie Werte bei Berechnungen gerundet werden.
            </p>
          </div>

          {/* Farbschwellen */}
          <div className="space-y-4">
            <Label className="text-base font-semibold text-gray-900">
              Farbschwellen (Ampel-System)
            </Label>
            <p className="text-sm text-gray-600">
              Definieren Sie die Abweichungsgrenzen für die visuelle Darstellung der Nachkalkulation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Grün */}
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="font-semibold text-green-900">Im Soll (Grün)</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={parameter.farbschwellen.gruen.min}
                      onChange={(e) => setParameter({
                        ...parameter,
                        farbschwellen: {
                          ...parameter.farbschwellen,
                          gruen: { ...parameter.farbschwellen.gruen, min: Number(e.target.value) }
                        }
                      })}
                      className="w-20"
                      min="0"
                      max="100"
                    />
                    <span className="text-sm">% bis</span>
                    <Input
                      type="number"
                      value={parameter.farbschwellen.gruen.max}
                      onChange={(e) => setParameter({
                        ...parameter,
                        farbschwellen: {
                          ...parameter.farbschwellen,
                          gruen: { ...parameter.farbschwellen.gruen, max: Number(e.target.value) }
                        }
                      })}
                      className="w-20"
                      min="0"
                      max="200"
                    />
                    <span className="text-sm">%</span>
                  </div>
                  <p className="text-xs text-green-700">Abweichung akzeptabel</p>
                </div>
              </div>

              {/* Gelb */}
              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="font-semibold text-yellow-900">Kritisch (Gelb)</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={parameter.farbschwellen.gelb.min}
                      onChange={(e) => setParameter({
                        ...parameter,
                        farbschwellen: {
                          ...parameter.farbschwellen,
                          gelb: { ...parameter.farbschwellen.gelb, min: Number(e.target.value) }
                        }
                      })}
                      className="w-20"
                      min="0"
                      max="100"
                    />
                    <span className="text-sm">% bis</span>
                    <Input
                      type="number"
                      value={parameter.farbschwellen.gelb.max}
                      onChange={(e) => setParameter({
                        ...parameter,
                        farbschwellen: {
                          ...parameter.farbschwellen,
                          gelb: { ...parameter.farbschwellen.gelb, max: Number(e.target.value) }
                        }
                      })}
                      className="w-20"
                      min="0"
                      max="200"
                    />
                    <span className="text-sm">%</span>
                  </div>
                  <p className="text-xs text-yellow-700">Warnung, Überwachung nötig</p>
                </div>
              </div>

              {/* Rot */}
              <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="font-semibold text-red-900">Abweichend (Rot)</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-red-700">
                    {'<'} {parameter.farbschwellen.gelb.min}% oder {'>'} {parameter.farbschwellen.gelb.max}%
                  </p>
                  <p className="text-xs text-red-700">Sofortige Maßnahmen erforderlich</p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={loadParameter}
              disabled={saving}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Zurücksetzen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Wird gespeichert...
                </>
              ) : (
                'Speichern'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info-Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">Hinweis zu Änderungen</h3>
              <p className="text-sm text-blue-800">
                Änderungen an den Kalkulationsparametern wirken sich auf alle <strong>zukünftigen Berechnungen</strong> aus. 
                Bestehende Nachkalkulationen werden bei der nächsten Zeiterfassung automatisch mit den neuen Parametern neu berechnet.
              </p>
              <p className="text-sm text-blue-800">
                Projektspezifische Stundensätze (z.B. aus Angeboten) bleiben davon unberührt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

