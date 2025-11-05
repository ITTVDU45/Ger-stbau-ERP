"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Check, Save } from 'lucide-react'
import { CompanySettings } from '@/lib/db/types'
import { cn } from '@/lib/utils'

interface AngebotsvorlagenTabProps {
  settings: Partial<CompanySettings>
  onChange: (field: keyof CompanySettings, value: any) => void
  onSave: () => void
  saving: boolean
}

type TemplateType = 'modern' | 'klassisch' | 'kompakt'

const templates: Array<{
  id: TemplateType
  name: string
  description: string
  features: string[]
  preview: string
}> = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Minimalistisches Design mit viel Weißraum',
    features: [
      'Klares, luftiges Layout',
      'Moderne Schriftarten',
      'Akzentfarben (Blau/Grün)',
      'Logo linksbündig',
      'Große Abstände'
    ],
    preview: 'bg-gradient-to-br from-blue-50 to-white'
  },
  {
    id: 'klassisch',
    name: 'Klassisch',
    description: 'Traditionelles Business-Layout',
    features: [
      'Formale Struktur',
      'Serifen-Schrift für Überschriften',
      'Dunklere Farben',
      'Logo zentriert oder rechts',
      'Klare Tabellenstruktur'
    ],
    preview: 'bg-gradient-to-br from-gray-100 to-white'
  },
  {
    id: 'kompakt',
    name: 'Kompakt',
    description: 'Platzsparend für mehrseitige Angebote',
    features: [
      'Maximaler Inhalt pro Seite',
      'Kleinere Schriftgrößen',
      'Minimale Kopf-/Fußzeile',
      'Logo klein, oben rechts',
      'Kompakte Tabellen'
    ],
    preview: 'bg-gradient-to-br from-green-50 to-white'
  }
]

export default function AngebotsvorlagenTab({ settings, onChange, onSave, saving }: AngebotsvorlagenTabProps) {
  const selectedTemplate = settings.offerTemplate || 'modern'

  const handleSelectTemplate = (templateId: TemplateType) => {
    onChange('offerTemplate', templateId)
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <FileText className="h-5 w-5 text-blue-600" />
            Angebotsvorlagen
          </CardTitle>
          <CardDescription className="text-gray-700">
            Wählen Sie das Design für Ihre Angebots-PDFs. Die Vorlage bestimmt Layout, Schriftarten und Farbgebung.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template-Auswahl */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className={cn(
                  "relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg",
                  selectedTemplate === template.id
                    ? "border-blue-600 shadow-lg"
                    : "border-gray-300 hover:border-blue-400"
                )}
                onClick={() => handleSelectTemplate(template.id)}
              >
                {/* Ausgewählt-Badge */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white rounded-full p-1 shadow-lg z-10">
                    <Check className="h-4 w-4" />
                  </div>
                )}

                {/* Vorschau-Bereich mit Mockup */}
                <div className={cn("h-64 p-4 overflow-hidden", template.preview)}>
                  {template.id === 'modern' && (
                    <div className="bg-white rounded shadow-sm p-3 text-xs space-y-2 h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-12 h-12 bg-blue-600 rounded"></div>
                        <div className="text-right text-[8px] text-gray-600">
                          <div>Angebot #2024-001</div>
                          <div>01.01.2024</div>
                        </div>
                      </div>
                      <div className="h-px bg-blue-200"></div>
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="text-[10px] font-bold text-blue-600 mt-2">ANGEBOT</div>
                      <div className="space-y-1 mt-2">
                        <div className="h-1.5 bg-gray-300 rounded w-full"></div>
                        <div className="h-1.5 bg-gray-300 rounded w-full"></div>
                        <div className="h-1.5 bg-gray-300 rounded w-4/5"></div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex justify-between text-[8px]">
                          <span className="text-gray-600">Gesamt</span>
                          <span className="font-bold text-blue-600">€ 10.500</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {template.id === 'klassisch' && (
                    <div className="bg-white rounded shadow-sm p-3 text-xs space-y-2 h-full border-2 border-gray-400">
                      <div className="text-center mb-2">
                        <div className="w-10 h-10 bg-gray-700 rounded mx-auto mb-1"></div>
                        <div className="text-[10px] font-serif font-bold">ANGEBOT</div>
                      </div>
                      <div className="h-px bg-gray-400"></div>
                      <div className="space-y-1 text-[8px]">
                        <div className="h-2 bg-gray-300 rounded w-2/3 mx-auto"></div>
                        <div className="h-2 bg-gray-300 rounded w-1/2 mx-auto"></div>
                      </div>
                      <div className="border border-gray-400 p-2 mt-2">
                        <div className="space-y-1">
                          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
                          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
                          <div className="h-1.5 bg-gray-400 rounded w-3/4"></div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t-2 border-gray-400">
                        <div className="flex justify-between text-[8px] font-serif">
                          <span>Summe:</span>
                          <span className="font-bold">€ 10.500,00</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {template.id === 'kompakt' && (
                    <div className="bg-white rounded shadow-sm p-2 text-xs h-full">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-[9px] font-bold text-green-700">ANGEBOT</div>
                        <div className="w-6 h-6 bg-green-600 rounded-sm"></div>
                      </div>
                      <div className="h-px bg-green-300 mb-1"></div>
                      <div className="space-y-0.5 text-[7px]">
                        <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                        <div className="h-1.5 bg-gray-200 rounded w-4/5"></div>
                        <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div className="flex gap-1">
                          <div className="h-1 bg-gray-300 rounded flex-1"></div>
                          <div className="h-1 bg-gray-300 rounded w-8"></div>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-1 bg-gray-300 rounded flex-1"></div>
                          <div className="h-1 bg-gray-300 rounded w-8"></div>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-1 bg-gray-300 rounded flex-1"></div>
                          <div className="h-1 bg-gray-300 rounded w-8"></div>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-1 bg-gray-300 rounded flex-1"></div>
                          <div className="h-1 bg-gray-300 rounded w-8"></div>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-1 bg-gray-300 rounded flex-1"></div>
                          <div className="h-1 bg-gray-300 rounded w-8"></div>
                        </div>
                      </div>
                      <div className="mt-2 pt-1 border-t border-green-300 flex justify-between text-[8px]">
                        <span className="text-gray-600">Total</span>
                        <span className="font-bold text-green-700">€10.500</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Template-Info */}
                <div className="p-4 bg-white">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-700 mb-3">{template.description}</p>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Features:</p>
                    <ul className="space-y-1">
                      {template.features.map((feature, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Auswahl-Button */}
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                  <Button
                    type="button"
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className={cn(
                      "w-full",
                      selectedTemplate === template.id
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-gray-300 text-gray-900 hover:bg-gray-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectTemplate(template.id)
                    }}
                  >
                    {selectedTemplate === template.id ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Ausgewählt
                      </>
                    ) : (
                      'Auswählen'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Aktuelle Auswahl */}
          <div className="border-t border-gray-200 pt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 rounded-full p-2">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Aktuelle Vorlage: {templates.find(t => t.id === selectedTemplate)?.name}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {templates.find(t => t.id === selectedTemplate)?.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hinweis */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">Hinweis:</strong> Die ausgewählte Vorlage wird für alle neuen Angebote verwendet. 
              Bereits erstellte Angebote behalten ihr ursprüngliches Design.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Speichern-Button */}
      <div className="flex justify-end">
        <Button 
          onClick={onSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          <span className="font-medium">{saving ? 'Speichere...' : 'Vorlage speichern'}</span>
        </Button>
      </div>
    </div>
  )
}

