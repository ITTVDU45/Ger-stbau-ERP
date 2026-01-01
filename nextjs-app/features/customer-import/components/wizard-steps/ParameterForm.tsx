'use client'

// Step 1: Parameter-Eingabeformular
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Info } from 'lucide-react'
import type { AiImportParams } from '../../types'

interface ParameterFormProps {
  onSubmit: (params: AiImportParams) => void
  onCancel: () => void
}

export function ParameterForm({ onSubmit, onCancel }: ParameterFormProps) {
  const [formData, setFormData] = useState<AiImportParams>({
    branche: '',
    standort: '',
    anzahlErgebnisse: 25,
    websiteAnalysieren: true,
    kontaktdatenHinzufuegen: true
  })

  const [errors, setErrors] = useState<{ branche?: string; standort?: string }>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validierung
    const newErrors: { branche?: string; standort?: string } = {}
    
    if (!formData.branche.trim()) {
      newErrors.branche = 'Branche ist erforderlich'
    }
    
    if (!formData.standort.trim()) {
      newErrors.standort = 'Standort ist erforderlich'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors({})
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Infobox */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-900">
          <p className="font-semibold mb-1">🤖 KI-gestützter Kunden-Import</p>
          <p className="text-purple-700">
            Die Ergebnisse werden erst nach Ihrer Bestätigung als Kunden angelegt und 
            standardmäßig als <strong>inaktiv</strong> markiert.
          </p>
        </div>
      </div>

      {/* Basis-Parameter Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">📍</span>
          Basis-Parameter
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Branche */}
          <div className="space-y-2">
            <Label htmlFor="branche" className="text-sm font-medium text-gray-700">
              Branche <span className="text-red-500">*</span>
            </Label>
            <Input
              id="branche"
              placeholder="z.B. Bauunternehmen, Gerüstbau..."
              value={formData.branche}
              onChange={(e) => setFormData({ ...formData, branche: e.target.value })}
              className={`transition-all ${errors.branche ? 'border-red-500 focus:ring-red-500' : 'focus:ring-purple-500'}`}
            />
            {errors.branche && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <span>⚠️</span> {errors.branche}
              </p>
            )}
          </div>

          {/* Standort */}
          <div className="space-y-2">
            <Label htmlFor="standort" className="text-sm font-medium text-gray-700">
              Standort <span className="text-red-500">*</span>
            </Label>
            <Input
              id="standort"
              placeholder="z.B. Berlin, 10115, München..."
              value={formData.standort}
              onChange={(e) => setFormData({ ...formData, standort: e.target.value })}
              className={`transition-all ${errors.standort ? 'border-red-500 focus:ring-red-500' : 'focus:ring-purple-500'}`}
            />
            {errors.standort && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <span>⚠️</span> {errors.standort}
              </p>
            )}
          </div>
        </div>

        {/* Anzahl Ergebnisse */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="anzahl" className="text-sm font-medium text-gray-700">
            Anzahl Ergebnisse
          </Label>
          <Select
            value={formData.anzahlErgebnisse.toString()}
            onValueChange={(value) => 
              setFormData({ ...formData, anzahlErgebnisse: parseInt(value) as any })
            }
          >
            <SelectTrigger id="anzahl" className="focus:ring-purple-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 Ergebnisse</SelectItem>
              <SelectItem value="25">25 Ergebnisse (empfohlen)</SelectItem>
              <SelectItem value="50">50 Ergebnisse</SelectItem>
              <SelectItem value="100">100 Ergebnisse</SelectItem>
              <SelectItem value="250">250 Ergebnisse</SelectItem>
              <SelectItem value="1000">1000 Ergebnisse (max)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            💡 Höhere Anzahl = längere Analyse-Dauer
          </p>
        </div>
      </div>

      {/* Erweiterte Optionen Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          Erweiterte Optionen
        </h3>
        
        <div className="space-y-4">
          {/* Website analysieren */}
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
            <Checkbox
              id="website"
              checked={formData.websiteAnalysieren}
              onCheckedChange={(checked) => 
                setFormData({ 
                  ...formData, 
                  websiteAnalysieren: checked as boolean,
                  kontaktdatenHinzufuegen: checked as boolean // Automatisch aktivieren
                })
              }
              className="mt-1"
            />
            <div className="space-y-1 leading-none flex-1">
              <Label
                htmlFor="website"
                className="font-semibold cursor-pointer text-sm flex items-center gap-2 text-purple-900"
              >
                🌐 Website analysieren & E-Mails extrahieren
              </Label>
              <p className="text-xs text-purple-700 leading-relaxed">
                <strong>Empfohlen!</strong> Durchsucht die Websites nach E-Mail-Adressen, Ansprechpartnern, 
                Unternehmensbeschreibung und Dienstleistungen. <span className="text-purple-900 font-semibold">+30-60 Sek. pro Firma</span>
              </p>
            </div>
          </div>

          {/* Kontaktdaten hinzufügen - DEPRECATED, wird durch websiteAnalysieren abgedeckt */}
          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors opacity-50">
            <Checkbox
              id="kontakt"
              checked={formData.kontaktdatenHinzufuegen}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, kontaktdatenHinzufuegen: checked as boolean })
              }
              className="mt-1"
              disabled
            />
            <div className="space-y-1 leading-none flex-1">
              <Label
                htmlFor="kontakt"
                className="font-medium cursor-not-allowed text-sm flex items-center gap-2 text-gray-500"
              >
                📧 Kontaktdaten hinzufügen (automatisch bei Website-Analyse)
              </Label>
              <p className="text-xs text-gray-500">
                Extrahiert E-Mail und Telefonnummern aus verfügbaren Quellen
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="hover:bg-gray-50"
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-md"
        >
          <Search className="h-4 w-4 mr-2" />
          Analyse starten
        </Button>
      </div>
    </form>
  )
}

