"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Receipt, Check, Save } from 'lucide-react'
import { CompanySettings } from '@/lib/db/types'
import { cn } from '@/lib/utils'

interface RechnungsvorlagenTabProps {
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
    description: 'Zeitgemäßes Design mit klarer Struktur',
    features: [
      'Übersichtliches Layout',
      'Moderne Typografie',
      'Farbliche Akzente',
      'QR-Code für Zahlung',
      'Mobile-optimiert'
    ],
    preview: 'bg-gradient-to-br from-purple-50 to-white'
  },
  {
    id: 'klassisch',
    name: 'Klassisch',
    description: 'Bewährtes Rechnungslayout',
    features: [
      'Professionelle Gestaltung',
      'Traditionelle Schriftarten',
      'Vollständige Rechtssicherheit',
      'Klare Zahlungsinformationen',
      'Standard-Tabellenformat'
    ],
    preview: 'bg-gradient-to-br from-amber-50 to-white'
  },
  {
    id: 'kompakt',
    name: 'Kompakt',
    description: 'Platzsparend für umfangreiche Rechnungen',
    features: [
      'Viel Information auf wenig Raum',
      'Kleine Schriftgrößen',
      'Reduzierte Kopf-/Fußzeile',
      'Optimiert für Detailrechnungen',
      'Mehrere Positionen pro Seite'
    ],
    preview: 'bg-gradient-to-br from-teal-50 to-white'
  }
]

export default function RechnungsvorlagenTab({ settings, onChange, onSave, saving }: RechnungsvorlagenTabProps) {
  const selectedTemplate = settings.invoiceTemplate || 'modern'

  const handleSelectTemplate = (templateId: TemplateType) => {
    onChange('invoiceTemplate', templateId)
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Receipt className="h-5 w-5 text-purple-600" />
            Rechnungsvorlagen
          </CardTitle>
          <CardDescription className="text-gray-700">
            Wählen Sie das Design für Ihre Rechnungs-PDFs. Die Vorlage bestimmt Layout, Zahlungsinformationen und Struktur.
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
                    ? "border-purple-600 shadow-lg"
                    : "border-gray-300 hover:border-purple-400"
                )}
                onClick={() => handleSelectTemplate(template.id)}
              >
                {/* Ausgewählt-Badge */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-3 right-3 bg-purple-600 text-white rounded-full p-1 shadow-lg z-10">
                    <Check className="h-4 w-4" />
                  </div>
                )}

                {/* Vorschau-Bereich mit Mockup */}
                <div className={cn("h-64 p-4 overflow-hidden", template.preview)}>
                  {template.id === 'modern' && (
                    <div className="bg-white rounded shadow-sm p-3 text-xs space-y-2 h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-12 h-12 bg-purple-600 rounded"></div>
                        <div className="text-right text-[8px] text-gray-600">
                          <div>Rechnung #RE-2024-001</div>
                          <div>01.01.2024</div>
                        </div>
                      </div>
                      <div className="h-px bg-purple-200"></div>
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="text-[10px] font-bold text-purple-600 mt-2">RECHNUNG</div>
                      <div className="space-y-1 mt-2 bg-gray-50 p-2 rounded">
                        <div className="flex justify-between text-[8px]">
                          <span>Position 1</span>
                          <span>€ 5.000</span>
                        </div>
                        <div className="flex justify-between text-[8px]">
                          <span>Position 2</span>
                          <span>€ 3.000</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-300 space-y-1">
                        <div className="flex justify-between text-[8px]">
                          <span>Netto</span>
                          <span>€ 8.000</span>
                        </div>
                        <div className="flex justify-between text-[8px]">
                          <span>MwSt. 19%</span>
                          <span>€ 1.520</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold pt-1 border-t">
                          <span>Brutto</span>
                          <span className="text-purple-600">€ 9.520</span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-center">
                        <div className="w-16 h-16 border-2 border-gray-300 rounded flex items-center justify-center">
                          <div className="text-[6px] text-gray-400">QR</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {template.id === 'klassisch' && (
                    <div className="bg-white rounded shadow-sm p-3 text-xs space-y-2 h-full border-2 border-amber-600">
                      <div className="text-center mb-2">
                        <div className="w-10 h-10 bg-amber-700 rounded mx-auto mb-1"></div>
                        <div className="text-[10px] font-serif font-bold">RECHNUNG</div>
                        <div className="text-[8px] text-gray-600">Nr. RE-2024-001</div>
                      </div>
                      <div className="h-px bg-amber-600"></div>
                      <div className="space-y-1 text-[8px]">
                        <div className="h-2 bg-gray-300 rounded w-2/3 mx-auto"></div>
                        <div className="h-2 bg-gray-300 rounded w-1/2 mx-auto"></div>
                      </div>
                      <div className="border-2 border-amber-600 mt-2">
                        <div className="bg-amber-50 p-1 border-b-2 border-amber-600 flex justify-between text-[7px] font-bold">
                          <span>Position</span>
                          <span>Betrag</span>
                        </div>
                        <div className="p-1 space-y-1">
                          <div className="flex justify-between text-[7px]">
                            <span className="h-1.5 bg-gray-300 rounded w-20"></span>
                            <span className="h-1.5 bg-gray-300 rounded w-12"></span>
                          </div>
                          <div className="flex justify-between text-[7px]">
                            <span className="h-1.5 bg-gray-300 rounded w-16"></span>
                            <span className="h-1.5 bg-gray-300 rounded w-12"></span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t-2 border-amber-600 bg-amber-50 p-1">
                        <div className="flex justify-between text-[8px] font-serif font-bold">
                          <span>Rechnungsbetrag:</span>
                          <span>€ 9.520,00</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {template.id === 'kompakt' && (
                    <div className="bg-white rounded shadow-sm p-2 text-xs h-full">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-[9px] font-bold text-teal-700">RECHNUNG RE-2024-001</div>
                        <div className="w-6 h-6 bg-teal-600 rounded-sm"></div>
                      </div>
                      <div className="h-px bg-teal-300 mb-1"></div>
                      <div className="space-y-0.5 text-[7px]">
                        <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                        <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div className="grid grid-cols-4 gap-0.5 text-[6px] bg-teal-50 p-0.5">
                          <div className="col-span-2 font-bold">Pos.</div>
                          <div className="font-bold">Menge</div>
                          <div className="font-bold text-right">€</div>
                        </div>
                        {[1,2,3,4,5,6].map((i) => (
                          <div key={i} className="grid grid-cols-4 gap-0.5">
                            <div className="col-span-2 h-1 bg-gray-300 rounded"></div>
                            <div className="h-1 bg-gray-300 rounded"></div>
                            <div className="h-1 bg-gray-300 rounded"></div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-1 border-t border-teal-400 space-y-0.5">
                        <div className="flex justify-between text-[7px]">
                          <span>Netto</span>
                          <span>€8.000</span>
                        </div>
                        <div className="flex justify-between text-[7px]">
                          <span>+19%</span>
                          <span>€1.520</span>
                        </div>
                        <div className="flex justify-between text-[8px] font-bold pt-0.5 border-t border-teal-300">
                          <span>Gesamt</span>
                          <span className="text-teal-700">€9.520</span>
                        </div>
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
                          <span className="text-purple-600 mt-0.5">•</span>
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
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
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
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-600 rounded-full p-2">
                  <Receipt className="h-5 w-5 text-white" />
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

          {/* Zusatzinformationen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2 text-sm">Rechtssicherheit</h5>
              <p className="text-xs text-gray-700">
                Alle Vorlagen erfüllen die gesetzlichen Anforderungen für ordnungsgemäße Rechnungen nach §14 UStG.
              </p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2 text-sm">DATEV-Kompatibilität</h5>
              <p className="text-xs text-gray-700">
                Alle Rechnungsvorlagen sind für den Export zu DATEV und anderen Buchhaltungssystemen optimiert.
              </p>
            </div>
          </div>

          {/* Hinweis */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">Hinweis:</strong> Die ausgewählte Vorlage wird für alle neuen Rechnungen verwendet. 
              Bereits erstellte Rechnungen behalten ihr ursprüngliches Design.
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

