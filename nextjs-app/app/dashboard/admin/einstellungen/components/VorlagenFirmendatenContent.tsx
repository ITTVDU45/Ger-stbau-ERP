"use client"

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { CompanySettings } from '@/lib/db/types'
import { toast } from 'sonner'
import FirmendatenTab from './FirmendatenTab'
import LogosZertifikateTab from './LogosZertifikateTab'
import BankinformationenTab from './BankinformationenTab'
import AngebotsvorlagenTab from './AngebotsvorlagenTab'
import RechnungsvorlagenTab from './RechnungsvorlagenTab'

export default function VorlagenFirmendatenContent() {
  const [activeTab, setActiveTab] = useState('firmendaten')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Partial<CompanySettings>>({
    offerTemplate: 'modern',
    invoiceTemplate: 'modern',
    aktiv: true
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/company')
      const data = await response.json()
      
      if (data.erfolg && data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error)
      toast.error('Fehler', {
        description: 'Einstellungen konnten nicht geladen werden'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof CompanySettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          geaendertVon: 'admin' // TODO: Aus Session holen
        })
      })
      
      const data = await response.json()
      
      if (!data.erfolg) {
        console.error('API-Fehlerdetails:', data.details)
        
        // Zeige spezifische Fehler in Toast
        if (data.details) {
          const errors = Object.entries(data.details)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('\n')
          
          toast.error('Validierungsfehler', {
            description: errors
          })
          return
        }
        
        throw new Error(data.fehler || 'Speichern fehlgeschlagen')
      }
      
      setSettings(data.settings)
      
      toast.success('Gespeichert', {
        description: 'Einstellungen wurden erfolgreich gespeichert'
      })
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error)
      toast.error('Fehler', {
        description: error.message || 'Einstellungen konnten nicht gespeichert werden'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-700">Lade Einstellungen...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-6 bg-gray-100">
        <TabsTrigger value="firmendaten" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
          Firmendaten
        </TabsTrigger>
        <TabsTrigger value="logos" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
          Logos & Zertifikate
        </TabsTrigger>
        <TabsTrigger value="bank" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
          Bank
        </TabsTrigger>
        <TabsTrigger value="angebote" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
          Angebots-Vorlagen
        </TabsTrigger>
        <TabsTrigger value="rechnungen" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
          Rechnungs-Vorlagen
        </TabsTrigger>
        <TabsTrigger value="vorschau" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
          Vorschau
        </TabsTrigger>
      </TabsList>

      <TabsContent value="firmendaten">
        <FirmendatenTab 
          settings={settings}
          onChange={handleChange}
          onSave={handleSave}
          saving={saving}
        />
      </TabsContent>

      <TabsContent value="logos">
        <LogosZertifikateTab
          settings={settings}
          onChange={handleChange}
          onSave={handleSave}
          saving={saving}
        />
      </TabsContent>

      <TabsContent value="bank">
        <BankinformationenTab
          settings={settings}
          onChange={handleChange}
          onSave={handleSave}
          saving={saving}
        />
      </TabsContent>

      <TabsContent value="angebote">
        <AngebotsvorlagenTab
          settings={settings}
          onChange={handleChange}
          onSave={handleSave}
          saving={saving}
        />
      </TabsContent>

      <TabsContent value="rechnungen">
        <RechnungsvorlagenTab
          settings={settings}
          onChange={handleChange}
          onSave={handleSave}
          saving={saving}
        />
      </TabsContent>

      <TabsContent value="vorschau">
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <p className="text-gray-700">Live-Vorschau wird hier implementiert</p>
              <p className="text-sm text-gray-600">Angebot/Rechnung mit aktuellen Einstellungen</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

