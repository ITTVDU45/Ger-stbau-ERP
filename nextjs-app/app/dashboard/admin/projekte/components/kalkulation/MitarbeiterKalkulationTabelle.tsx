'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MitarbeiterKalkulation } from '@/lib/db/types'
import { Users } from 'lucide-react'

interface MitarbeiterKalkulationTabelleProps {
  mitarbeiterKalkulation: MitarbeiterKalkulation[]
}

export default function MitarbeiterKalkulationTabelle({ mitarbeiterKalkulation }: MitarbeiterKalkulationTabelleProps) {
  const getBadgeClass = (prozent: number) => {
    // Negative Prozente = gut (weniger verbraucht)
    // Positive Prozente = schlecht (mehr verbraucht)
    const abs = Math.abs(prozent)
    if (abs <= 5) {
      // Sehr nah am Soll
      return 'bg-green-100 text-green-700 border-green-300'
    } else if (prozent < 0) {
      // Negativ = unter Budget = gut
      return 'bg-green-100 text-green-700 border-green-300'
    } else if (prozent <= 10) {
      // Leicht über Budget
      return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    } else {
      // Deutlich über Budget
      return 'bg-red-100 text-red-700 border-red-300'
    }
  }

  const getDifferenzClass = (differenz: number) => {
    // Positive Differenz = gut (weniger verbraucht als geplant)
    // Negative Differenz = schlecht (mehr verbraucht als geplant)
    return differenz > 0 ? 'text-green-600' : 'text-red-600'
  }

  if (!mitarbeiterKalkulation || mitarbeiterKalkulation.length === 0) {
    return (
      <Card className="border-gray-200 bg-white">
        <CardHeader className="bg-white">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Users className="h-5 w-5" />
            Mitarbeiter-Abgleich
          </CardTitle>
          <CardDescription className="text-gray-600">
            Detaillierte Aufschlüsselung der Soll-Ist-Werte pro Mitarbeiter
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white">
          <div className="text-center text-gray-600 py-8">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Noch keine Mitarbeiter-Daten verfügbar</p>
            <p className="text-sm mt-2">Erfassen Sie Zeiteinträge, um die Mitarbeiter-Kalkulation zu sehen.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader className="bg-white">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Users className="h-5 w-5" />
          Mitarbeiter-Abgleich
        </CardTitle>
        <CardDescription className="text-gray-600">
          Detaillierte Aufschlüsselung der Soll-Ist-Werte pro Mitarbeiter mit Aufbau/Abbau-Details ({mitarbeiterKalkulation.length} Mitarbeiter)
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-white">
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                <TableHead className="font-bold text-gray-900 text-sm" rowSpan={2}>Mitarbeiter</TableHead>
                <TableHead colSpan={3} className="text-center font-bold text-gray-900 text-sm border-b border-gray-300 bg-blue-50">
                  Aufbau
                </TableHead>
                <TableHead colSpan={3} className="text-center font-bold text-gray-900 text-sm border-b border-gray-300 bg-green-50">
                  Abbau
                </TableHead>
                <TableHead colSpan={3} className="text-center font-bold text-gray-900 text-sm border-b border-gray-300 bg-gray-50">
                  Gesamt
                </TableHead>
                <TableHead rowSpan={2} className="text-center font-bold text-gray-900 text-sm">%</TableHead>
              </TableRow>
              <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                {/* Aufbau */}
                <TableHead className="text-right font-semibold text-gray-700 text-xs bg-blue-50/50">SOLL</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 text-xs bg-blue-50/50">IST</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 text-xs bg-blue-50/50">Diff</TableHead>
                {/* Abbau */}
                <TableHead className="text-right font-semibold text-gray-700 text-xs bg-green-50/50">SOLL</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 text-xs bg-green-50/50">IST</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 text-xs bg-green-50/50">Diff</TableHead>
                {/* Gesamt */}
                <TableHead className="text-right font-semibold text-gray-700 text-xs">SOLL Zeit/€</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 text-xs">IST Zeit/€</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 text-xs">Diff €</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mitarbeiterKalkulation.map((ma, index) => {
                const diffAufbau = (ma.zeitSollAufbau || 0) - (ma.zeitIstAufbau || 0)
                const diffAbbau = (ma.zeitSollAbbau || 0) - (ma.zeitIstAbbau || 0)
                
                return (
                  <TableRow key={ma.mitarbeiterId} className="bg-white hover:bg-gray-50">
                    <TableCell className="font-bold text-gray-900 text-base">{ma.mitarbeiterName}</TableCell>
                    
                    {/* Aufbau */}
                    <TableCell className="text-right text-gray-900 font-semibold text-sm bg-blue-50/30">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        {(ma.zeitSollAufbau || 0).toFixed(1)}h
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 text-sm bg-blue-50/30">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        {(ma.zeitIstAufbau || 0).toFixed(1)}h
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-semibold text-sm bg-blue-50/30 ${getDifferenzClass(diffAufbau)}`}>
                      {diffAufbau > 0 ? '+' : ''}{diffAufbau.toFixed(1)}h
                    </TableCell>
                    
                    {/* Abbau */}
                    <TableCell className="text-right text-gray-900 font-semibold text-sm bg-green-50/30">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {(ma.zeitSollAbbau || 0).toFixed(1)}h
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 text-sm bg-green-50/30">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {(ma.zeitIstAbbau || 0).toFixed(1)}h
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-semibold text-sm bg-green-50/30 ${getDifferenzClass(diffAbbau)}`}>
                      {diffAbbau > 0 ? '+' : ''}{diffAbbau.toFixed(1)}h
                    </TableCell>
                    
                    {/* Gesamt */}
                    <TableCell className="text-right text-gray-900 font-semibold text-sm">
                      <div>{ma.zeitSoll.toFixed(1)}h</div>
                      <div className="text-xs text-gray-600">{ma.summeSoll.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€</div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 text-sm">
                      <div>{ma.zeitIst.toFixed(1)}h</div>
                      <div className="text-xs text-gray-600">{ma.summeIst.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€</div>
                    </TableCell>
                    <TableCell className={`text-right font-bold text-sm ${getDifferenzClass(ma.differenzSumme)}`}>
                      {ma.differenzSumme > 0 ? '+' : ''}{ma.differenzSumme.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge variant="outline" className={getBadgeClass(ma.abweichungProzent)}>
                        {ma.abweichungProzent < 0 ? '+' : ma.abweichungProzent > 0 ? '-' : ''}{Math.abs(ma.abweichungProzent).toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Legende */}
        <div className="mt-4 flex flex-col gap-2 text-sm text-gray-900 bg-white p-3 rounded border border-gray-300">
          <div className="flex items-center gap-6">
            <span className="font-bold">Legende:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="font-medium">±5% = Gut</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="font-medium">±10% = Akzeptabel</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="font-medium">{'>'}±10% = Abweichend</span>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            <strong>Differenz:</strong> Positive Werte (grün) = weniger verbraucht als geplant (gut), Negative Werte (rot) = mehr verbraucht als geplant (schlecht)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

