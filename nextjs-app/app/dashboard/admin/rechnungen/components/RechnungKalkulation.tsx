"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Package, 
  Wrench, 
  Calendar, 
  FileSpreadsheet,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { Rechnung, AngebotPosition } from '@/lib/db/types'

interface RechnungKalkulationProps {
  formData: Partial<Rechnung>
  angebote: any[]
}

export default function RechnungKalkulation({
  formData,
  angebote
}: RechnungKalkulationProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const positionen = (formData.positionen || []) as AngebotPosition[]

  // Gruppierte Summen nach Typ
  const gruppierteSummen = positionen.reduce((acc, p) => {
    const typ = p.typ || 'material'
    acc[typ] = (acc[typ] || 0) + (p.gesamtpreis || 0)
    return acc
  }, {} as Record<string, number>)

  // Typ-Labels und Icons
  const typConfig: Record<string, { label: string, icon: React.ReactNode, color: string }> = {
    material: { 
      label: 'Material', 
      icon: <Package className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    arbeit: { 
      label: 'Arbeit', 
      icon: <Wrench className="h-5 w-5" />,
      color: 'bg-green-100 text-green-800 border-green-300'
    },
    miete: { 
      label: 'Miete', 
      icon: <Calendar className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-800 border-purple-300'
    },
    pauschale: { 
      label: 'Pauschale', 
      icon: <FileSpreadsheet className="h-5 w-5" />,
      color: 'bg-orange-100 text-orange-800 border-orange-300'
    }
  }

  // Verknüpftes Angebot finden
  const verknuepftesAngebot = angebote.find(a => a._id === formData.angebotId)
  const angebotBrutto = verknuepftesAngebot?.brutto || 0
  const differenz = (formData.brutto || 0) - angebotBrutto
  const differenzProzent = angebotBrutto > 0 ? (differenz / angebotBrutto) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Übersicht nach Typ */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Positionsübersicht nach Typ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(typConfig).map(([typ, config]) => {
              const summe = gruppierteSummen[typ] || 0
              const anzahl = positionen.filter(p => p.typ === typ).length
              
              return (
                <div 
                  key={typ} 
                  className={`p-4 rounded-lg border ${config.color}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <Badge variant="secondary">{anzahl}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(summe)}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Hauptkalkulation */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Gesamtkalkulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Zwischensumme */}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Zwischensumme ({positionen.length} Positionen)</span>
              <span className="font-medium">{formatCurrency(formData.zwischensumme || 0)}</span>
            </div>

            {/* Rabatt */}
            {(formData.rabatt && formData.rabatt > 0) && (
              <div className="flex justify-between items-center py-2 text-red-600">
                <span>
                  Rabatt 
                  {formData.rabattProzent && formData.rabattProzent > 0 
                    ? ` (${formData.rabattProzent}%)`
                    : ''}
                </span>
                <span className="font-medium">-{formatCurrency(formData.rabatt)}</span>
              </div>
            )}

            {/* Netto */}
            <div className="flex justify-between items-center py-2 border-t">
              <span className="font-medium text-gray-900">Nettobetrag</span>
              <span className="font-bold text-lg">{formatCurrency(formData.netto || 0)}</span>
            </div>

            {/* MwSt */}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">MwSt. ({formData.mwstSatz || 19}%)</span>
              <span className="font-medium">{formatCurrency(formData.mwstBetrag || 0)}</span>
            </div>

            {/* Brutto */}
            <div className="flex justify-between items-center py-4 border-t-2 border-gray-900 mt-2">
              <span className="font-bold text-xl text-gray-900">Gesamtbetrag (brutto)</span>
              <span className="font-bold text-2xl text-blue-600">{formatCurrency(formData.brutto || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vergleich mit Angebot (wenn vorhanden) */}
      {verknuepftesAngebot && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-600" />
              Vergleich mit Angebot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Angebotssumme */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Angebot #{verknuepftesAngebot.angebotsnummer}</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(angebotBrutto)}</p>
              </div>

              {/* Rechnungssumme */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Diese Rechnung</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(formData.brutto || 0)}</p>
              </div>

              {/* Differenz */}
              <div className={`p-4 rounded-lg ${differenz >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-sm text-gray-600 mb-1">Differenz</p>
                <div className="flex items-center gap-2">
                  {differenz >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <p className={`text-2xl font-bold ${differenz >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {differenz >= 0 ? '+' : ''}{formatCurrency(differenz)}
                  </p>
                </div>
                <p className={`text-sm mt-1 ${differenz >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {differenzProzent >= 0 ? '+' : ''}{differenzProzent.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teilrechnung-Info (wenn zutreffend) */}
      {formData.typ === 'teilrechnung' && (
        <Card className="bg-white border-yellow-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Teilrechnung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Diese Teilrechnung</p>
                  <p className="text-2xl font-bold text-yellow-700">{formatCurrency(formData.brutto || 0)}</p>
                </div>
                
                {verknuepftesAngebot && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Restbetrag aus Angebot</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(Math.max(0, angebotBrutto - (formData.brutto || 0)))}
                    </p>
                  </div>
                )}
              </div>

              {verknuepftesAngebot && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Abgerechnet</span>
                    <span>{((formData.brutto || 0) / angebotBrutto * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(100, ((formData.brutto || 0) / angebotBrutto * 100))} 
                    className="h-3"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keine Positionen Warnung */}
      {positionen.length === 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Keine Positionen vorhanden</p>
                <p className="text-sm text-yellow-700">
                  Fügen Sie Positionen im Tab "Positionen" hinzu, um die Kalkulation zu sehen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
