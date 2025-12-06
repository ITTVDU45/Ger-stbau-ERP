'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Nachkalkulation, Vorkalkulation } from '@/lib/db/types'

interface MonatsResultatProps {
  vorkalkulation?: Vorkalkulation
  nachkalkulation?: Nachkalkulation
}

export default function MonatsResultat({ vorkalkulation, nachkalkulation }: MonatsResultatProps) {
  if (!vorkalkulation) {
    return (
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300">
        <CardContent className="pt-6">
          <div className="text-center text-gray-600">
            <p className="text-lg font-medium">Keine Vorkalkulation vorhanden</p>
            <p className="text-sm mt-2">Bitte erstellen Sie zunächst eine Vorkalkulation für dieses Projekt.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Verwende ungewichtete Summen (Aufbau + Abbau) statt gewichtete Werte
  const gesamtSollUmsatz = vorkalkulation.sollUmsatzAufbau + vorkalkulation.sollUmsatzAbbau
  const gesamtIstUmsatz = nachkalkulation 
    ? nachkalkulation.istUmsatzAufbau + nachkalkulation.istUmsatzAbbau 
    : 0
  const differenzUmsatz = gesamtSollUmsatz - gesamtIstUmsatz
  
  // Berechne Erfüllungsgrad basierend auf ungewichteten Werten
  const erfuellungsgrad = gesamtSollUmsatz > 0
    ? (gesamtIstUmsatz / gesamtSollUmsatz) * 100
    : 0
  
  // Berechne prozentuale Abweichung (Ist / Soll - 1) × 100
  const abweichungProzent = gesamtSollUmsatz > 0
    ? ((gesamtIstUmsatz / gesamtSollUmsatz - 1) * 100)
    : 0
  
  // Status basierend auf Differenz: Positiv = Grün, Negativ = Rot
  let status: 'gruen' | 'gelb' | 'rot' = 'gruen'
  if (differenzUmsatz > 0) {
    // Positive Differenz = unter Budget = gut
    status = 'gruen'
  } else if (differenzUmsatz < 0 && Math.abs(differenzUmsatz) <= gesamtSollUmsatz * 0.1) {
    // Leicht über Budget (bis 10%)
    status = 'gelb'
  } else if (differenzUmsatz < 0) {
    // Deutlich über Budget
    status = 'rot'
  }

  // Farb-Mapping
  const statusConfig = {
    gruen: {
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-300',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-800 border-green-300',
      label: 'Wirtschaftlich',
      icon: '✓'
    },
    gelb: {
      bg: 'from-yellow-50 to-amber-50',
      border: 'border-yellow-300',
      text: 'text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      label: 'Grenzwertig',
      icon: '⚠'
    },
    rot: {
      bg: 'from-red-50 to-rose-50',
      border: 'border-red-300',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800 border-red-300',
      label: 'Unwirtschaftlich',
      icon: '✕'
    }
  }

  const config = statusConfig[status]

  return (
    <Card className={`bg-gradient-to-r ${config.bg} border-2 ${config.border}`}>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Haupt-Kennzahl: Erfüllungsgrad */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="text-sm font-medium text-gray-600">Erfüllungsgrad</div>
            <div className={`text-5xl font-bold ${config.text}`}>
              {erfuellungsgrad.toFixed(1)}%
            </div>
            <Badge variant="outline" className={`${config.badge} border text-sm px-3 py-1`}>
              {config.icon} {config.label}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Soll-Umsatz</span>
                <span className="font-bold text-gray-900">
                  {gesamtSollUmsatz.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Ist-Umsatz</span>
                <span className="font-bold text-gray-900">
                  {gesamtIstUmsatz.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
            <Progress 
              value={gesamtSollUmsatz > 0 ? (gesamtIstUmsatz / gesamtSollUmsatz) * 100 : 0} 
              className="h-3"
            />
          </div>

          {/* Differenz */}
          <div className="flex flex-col justify-center space-y-2 bg-white/50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-600 text-center">Differenz</div>
            <div className={`text-3xl font-bold text-center ${differenzUmsatz > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {differenzUmsatz > 0 ? '+' : ''}
              {differenzUmsatz.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </div>
            <div className={`text-sm text-center font-medium ${differenzUmsatz > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {abweichungProzent < 0 
                ? `${Math.abs(abweichungProzent).toFixed(0)}% weniger ausgegeben als geplant`
                : abweichungProzent > 0
                  ? `${abweichungProzent.toFixed(0)}% mehr ausgegeben als geplant`
                  : 'Genau im Budget'}
            </div>
            <div className="text-xs text-center text-gray-500 mt-2">
              {differenzUmsatz > 0 ? '✓ Unter Budget' : '✕ Über Budget'}
            </div>
          </div>
        </div>

        {/* Info-Text */}
        {nachkalkulation && (
          <div className="mt-4 pt-4 border-t border-gray-300">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Letzte Berechnung: {new Date(nachkalkulation.letzteBerechnung).toLocaleString('de-DE')}
              </span>
              <span className="text-gray-700 font-medium">
                Positive Differenz = Gut (weniger verbraucht)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
