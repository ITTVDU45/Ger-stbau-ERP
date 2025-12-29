'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileWarning, Euro, Clock, AlertTriangle, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { MahnwesenSettings } from '@/lib/db/types'

export default function MahnwesenSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<MahnwesenSettings>({
    mahngebuehrenStufe1: 5.0,
    mahngebuehrenStufe2: 15.0,
    mahngebuehrenStufe3: 25.0,
    zahlungsfristStufe1: 7,
    zahlungsfristStufe2: 7,
    zahlungsfristStufe3: 7,
    verzugszinssatz: 9.0,
    standardTextStufe1: '',
    standardTextStufe2: '',
    standardTextStufe3: '',
    aktiv: true,
    erstelltAm: new Date(),
    zuletztGeaendert: new Date(),
    geaendertVon: 'system'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/mahnwesen')
      const data = await response.json()

      if (data.erfolg && data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error)
      toast.error('Fehler beim Laden der Mahnwesen-Einstellungen')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings/mahnwesen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          geaendertVon: 'admin' // TODO: Von Session holen
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Mahnwesen-Einstellungen erfolgreich gespeichert')
        if (data.settings) {
          setSettings(data.settings)
        }
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast.error('Fehler beim Speichern der Einstellungen')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mahngebühren */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Euro className="h-5 w-5 text-orange-600" />
            Mahngebühren
          </CardTitle>
          <CardDescription className="text-gray-600">
            Legen Sie die Gebühren für jede Mahnstufe fest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Stufe 1 */}
            <div className="space-y-2">
              <Label htmlFor="gebuehr1" className="text-gray-900 font-semibold">
                Mahnung Stufe 1
              </Label>
              <div className="relative">
                <Input
                  id="gebuehr1"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.mahngebuehrenStufe1}
                  onChange={(e) => setSettings({...settings, mahngebuehrenStufe1: parseFloat(e.target.value) || 0})}
                  className="pr-8 bg-white border-gray-300 text-gray-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              </div>
              <p className="text-xs text-gray-500">Erste Zahlungserinnerung</p>
            </div>

            {/* Stufe 2 */}
            <div className="space-y-2">
              <Label htmlFor="gebuehr2" className="text-gray-900 font-semibold">
                Mahnung Stufe 2
              </Label>
              <div className="relative">
                <Input
                  id="gebuehr2"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.mahngebuehrenStufe2}
                  onChange={(e) => setSettings({...settings, mahngebuehrenStufe2: parseFloat(e.target.value) || 0})}
                  className="pr-8 bg-white border-gray-300 text-gray-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              </div>
              <p className="text-xs text-gray-500">Erste offizielle Mahnung</p>
            </div>

            {/* Stufe 3 */}
            <div className="space-y-2">
              <Label htmlFor="gebuehr3" className="text-gray-900 font-semibold">
                Mahnung Stufe 3
              </Label>
              <div className="relative">
                <Input
                  id="gebuehr3"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.mahngebuehrenStufe3}
                  onChange={(e) => setSettings({...settings, mahngebuehrenStufe3: parseFloat(e.target.value) || 0})}
                  className="pr-8 bg-white border-gray-300 text-gray-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              </div>
              <p className="text-xs text-gray-500">Letzte Mahnung</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zahlungsfristen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Clock className="h-5 w-5 text-blue-600" />
            Zahlungsfristen
          </CardTitle>
          <CardDescription className="text-gray-600">
            Definieren Sie die Zahlungsfristen für jede Mahnstufe in Tagen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Stufe 1 */}
            <div className="space-y-2">
              <Label htmlFor="frist1" className="text-gray-900 font-semibold">
                Zahlungsfrist Stufe 1
              </Label>
              <div className="relative">
                <Input
                  id="frist1"
                  type="number"
                  min="1"
                  value={settings.zahlungsfristStufe1}
                  onChange={(e) => setSettings({...settings, zahlungsfristStufe1: parseInt(e.target.value) || 1})}
                  className="pr-16 bg-white border-gray-300 text-gray-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">Tage</span>
              </div>
            </div>

            {/* Stufe 2 */}
            <div className="space-y-2">
              <Label htmlFor="frist2" className="text-gray-900 font-semibold">
                Zahlungsfrist Stufe 2
              </Label>
              <div className="relative">
                <Input
                  id="frist2"
                  type="number"
                  min="1"
                  value={settings.zahlungsfristStufe2}
                  onChange={(e) => setSettings({...settings, zahlungsfristStufe2: parseInt(e.target.value) || 1})}
                  className="pr-16 bg-white border-gray-300 text-gray-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">Tage</span>
              </div>
            </div>

            {/* Stufe 3 */}
            <div className="space-y-2">
              <Label htmlFor="frist3" className="text-gray-900 font-semibold">
                Zahlungsfrist Stufe 3
              </Label>
              <div className="relative">
                <Input
                  id="frist3"
                  type="number"
                  min="1"
                  value={settings.zahlungsfristStufe3}
                  onChange={(e) => setSettings({...settings, zahlungsfristStufe3: parseInt(e.target.value) || 1})}
                  className="pr-16 bg-white border-gray-300 text-gray-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">Tage</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verzugszinsen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Verzugszinsen
          </CardTitle>
          <CardDescription className="text-gray-600">
            Zinssatz für Zahlungsverzug (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="verzugszins" className="text-gray-900 font-semibold">
              Verzugszinssatz
            </Label>
            <div className="relative">
              <Input
                id="verzugszins"
                type="number"
                step="0.1"
                min="0"
                value={settings.verzugszinssatz || 0}
                onChange={(e) => setSettings({...settings, verzugszinssatz: parseFloat(e.target.value) || 0})}
                className="pr-8 bg-white border-gray-300 text-gray-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-500">
              Standard: 9% über Basiszinssatz (§ 288 BGB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Standard-Mahntexte */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <FileWarning className="h-5 w-5 text-red-600" />
            Standard-Mahntexte
          </CardTitle>
          <CardDescription className="text-gray-600">
            Textvorlagen für automatische Mahntexte (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Stufe 1 */}
            <div className="space-y-2">
              <Label htmlFor="text1" className="text-gray-900 font-semibold">
                Textvorlage Stufe 1
              </Label>
              <Textarea
                id="text1"
                rows={4}
                placeholder="Sehr geehrte Damen und Herren,&#10;wir möchten Sie höflich daran erinnern..."
                value={settings.standardTextStufe1 || ''}
                onChange={(e) => setSettings({...settings, standardTextStufe1: e.target.value})}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            {/* Stufe 2 */}
            <div className="space-y-2">
              <Label htmlFor="text2" className="text-gray-900 font-semibold">
                Textvorlage Stufe 2
              </Label>
              <Textarea
                id="text2"
                rows={4}
                placeholder="Sehr geehrte Damen und Herren,&#10;trotz unserer Zahlungserinnerung..."
                value={settings.standardTextStufe2 || ''}
                onChange={(e) => setSettings({...settings, standardTextStufe2: e.target.value})}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            {/* Stufe 3 */}
            <div className="space-y-2">
              <Label htmlFor="text3" className="text-gray-900 font-semibold">
                Textvorlage Stufe 3
              </Label>
              <Textarea
                id="text3"
                rows={4}
                placeholder="Sehr geehrte Damen und Herren,&#10;dies ist unsere letzte Mahnung..."
                value={settings.standardTextStufe3 || ''}
                onChange={(e) => setSettings({...settings, standardTextStufe3: e.target.value})}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hinweis */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Hinweis:</strong> Diese Einstellungen werden bei der Erstellung neuer Mahnungen automatisch angewendet. 
          Änderungen wirken sich nicht auf bereits erstellte Mahnungen aus.
        </AlertDescription>
      </Alert>

      {/* Speichern Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Einstellungen speichern
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

