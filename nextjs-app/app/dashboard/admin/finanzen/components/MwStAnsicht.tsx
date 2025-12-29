'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Receipt, TrendingUp, TrendingDown } from 'lucide-react'
import { ZeitraumFilter } from '@/lib/db/types'

interface MwStAnsichtProps {
  zeitraum: ZeitraumFilter
  mandantId?: string | null
  refreshTrigger?: number
}

export default function MwStAnsicht({ zeitraum, mandantId, refreshTrigger }: MwStAnsichtProps) {
  const [loading, setLoading] = useState(true)
  const [mwstDaten, setMwstDaten] = useState<any>(null)

  useEffect(() => {
    loadMwStDaten()
  }, [zeitraum, mandantId, refreshTrigger])

  const loadMwStDaten = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        von: zeitraum.von?.toISOString() || '',
        bis: zeitraum.bis?.toISOString() || ''
      })
      if (mandantId) params.append('mandantId', mandantId)

      // Lade Transaktionen mit MwSt-Daten
      const res = await fetch(`/api/finanzen/transaktionen?${params}`)
      const data = await res.json()

      if (data.erfolg) {
        // Berechne MwSt-Summen
        const transaktionen = data.transaktionen

        const mwstNachSatz: Record<number, any> = {}

        transaktionen.forEach((t: any) => {
          if (!t.mwstSatz) return

          const satz = t.mwstSatz
          if (!mwstNachSatz[satz]) {
            mwstNachSatz[satz] = {
              satz,
              einnahmen: { netto: 0, mwst: 0, brutto: 0, anzahl: 0 },
              ausgaben: { netto: 0, mwst: 0, brutto: 0, anzahl: 0 }
            }
          }

          if (t.typ === 'einnahme') {
            mwstNachSatz[satz].einnahmen.netto += t.nettobetrag || 0
            mwstNachSatz[satz].einnahmen.mwst += t.mwstBetrag || 0
            mwstNachSatz[satz].einnahmen.brutto += t.betrag || 0
            mwstNachSatz[satz].einnahmen.anzahl++
          } else {
            mwstNachSatz[satz].ausgaben.netto += t.nettobetrag || 0
            mwstNachSatz[satz].ausgaben.mwst += t.mwstBetrag || 0
            mwstNachSatz[satz].ausgaben.brutto += t.betrag || 0
            mwstNachSatz[satz].ausgaben.anzahl++
          }
        })

        setMwstDaten(mwstNachSatz)
      }
    } catch (error) {
      console.error('Fehler beim Laden der MwSt-Daten:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value)
  }

  if (loading) {
    return (
      <Card className="p-6 bg-white border-2 border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-40 bg-gray-100 rounded"></div>
      </Card>
    )
  }

  if (!mwstDaten || Object.keys(mwstDaten).length === 0) {
    return (
      <Card className="p-6 bg-white border-2 border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-purple-600" />
          Mehrwertsteuer-Ansicht
        </h3>
        <p className="text-sm text-gray-500 text-center py-8">
          Keine MwSt-Daten für den ausgewählten Zeitraum verfügbar
        </p>
      </Card>
    )
  }

  const saetze = Object.keys(mwstDaten).map(Number).sort((a, b) => b - a)

  // Berechne Zahllast (MwSt Einnahmen - MwSt Ausgaben)
  const gesamtMwStEinnahmen = saetze.reduce((sum, satz) => sum + mwstDaten[satz].einnahmen.mwst, 0)
  const gesamtMwStAusgaben = saetze.reduce((sum, satz) => sum + mwstDaten[satz].ausgaben.mwst, 0)
  const zahllast = gesamtMwStEinnahmen - gesamtMwStAusgaben

  return (
    <Card className="p-6 bg-white border-2 border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-purple-600" />
          Mehrwertsteuer-Ansicht
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Aufschlüsselung nach Steuersätzen für den ausgewählten Zeitraum
        </p>
      </div>

      <Tabs defaultValue="uebersicht">
        <TabsList className="mb-6 bg-gray-100">
          <TabsTrigger value="uebersicht" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 font-semibold">
            Übersicht
          </TabsTrigger>
          {saetze.map(satz => (
            <TabsTrigger key={satz} value={`satz-${satz}`} className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 font-semibold">
              {satz}% MwSt
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Übersicht-Tab */}
        <TabsContent value="uebersicht" className="mt-0">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-900">MwSt Einnahmen</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(gesamtMwStEinnahmen)}
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-900">MwSt Ausgaben</span>
              </div>
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(gesamtMwStAusgaben)}
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${zahllast >= 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Receipt className={`h-4 w-4 ${zahllast >= 0 ? 'text-orange-600' : 'text-blue-600'}`} />
                <span className="text-sm font-medium text-gray-900">Zahllast / Erstattung</span>
              </div>
              <div className={`text-2xl font-bold ${zahllast >= 0 ? 'text-orange-700' : 'text-blue-700'}`}>
                {zahllast >= 0 ? '-' : ''}{formatCurrency(Math.abs(zahllast))}
              </div>
              <div className="text-xs text-gray-700 mt-1 font-medium">
                {zahllast >= 0 ? 'Erstattungsanspruch' : 'Zahllast'}
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-900 font-semibold">MwSt-Satz</TableHead>
                <TableHead className="text-right text-gray-900 font-semibold">Einnahmen Netto</TableHead>
                <TableHead className="text-right text-gray-900 font-semibold">Einnahmen MwSt</TableHead>
                <TableHead className="text-right text-gray-900 font-semibold">Ausgaben Netto</TableHead>
                <TableHead className="text-right text-gray-900 font-semibold">Ausgaben MwSt</TableHead>
                <TableHead className="text-right text-gray-900 font-semibold">MwSt Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saetze.map(satz => {
                const data = mwstDaten[satz]
                const saldo = data.einnahmen.mwst - data.ausgaben.mwst
                return (
                  <TableRow key={satz} className="hover:bg-gray-50">
                    <TableCell className="font-semibold text-gray-900">{satz}%</TableCell>
                    <TableCell className="text-right text-gray-900 font-medium">{formatCurrency(data.einnahmen.netto)}</TableCell>
                    <TableCell className="text-right text-green-700 font-semibold">
                      {formatCurrency(data.einnahmen.mwst)}
                    </TableCell>
                    <TableCell className="text-right text-gray-900 font-medium">{formatCurrency(data.ausgaben.netto)}</TableCell>
                    <TableCell className="text-right text-red-700 font-semibold">
                      {formatCurrency(data.ausgaben.mwst)}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      {formatCurrency(saldo)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Detail-Tabs für jeden Steuersatz */}
        {saetze.map(satz => {
          const data = mwstDaten[satz]
          return (
            <TabsContent key={satz} value={`satz-${satz}`} className="mt-0">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Einnahmen */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">Einnahmen ({satz}% MwSt)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Netto:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(data.einnahmen.netto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">MwSt ({satz}%):</span>
                        <span className="font-semibold text-green-700">{formatCurrency(data.einnahmen.mwst)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-green-300">
                        <span className="font-semibold text-gray-900">Brutto:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(data.einnahmen.brutto)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-700">Anzahl Transaktionen:</span>
                        <span className="text-gray-900 font-medium">{data.einnahmen.anzahl}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ausgaben */}
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-900 mb-3">Ausgaben ({satz}% MwSt)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Netto:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(data.ausgaben.netto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">MwSt ({satz}%):</span>
                        <span className="font-semibold text-red-700">{formatCurrency(data.ausgaben.mwst)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-red-300">
                        <span className="font-semibold text-gray-900">Brutto:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(data.ausgaben.brutto)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-700">Anzahl Transaktionen:</span>
                        <span className="text-gray-900 font-medium">{data.ausgaben.anzahl}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MwSt-Saldo für diesen Satz */}
                <div className={`p-4 rounded-lg border ${
                  (data.einnahmen.mwst - data.ausgaben.mwst) >= 0 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-gray-900 font-semibold">MwSt-Saldo ({satz}%):</span>
                      <div className="text-xs text-gray-700 mt-1 font-medium">
                        (Einnahmen MwSt - Ausgaben MwSt)
                      </div>
                    </div>
                    <div className={`text-3xl font-bold ${
                      (data.einnahmen.mwst - data.ausgaben.mwst) >= 0 
                        ? 'text-blue-700' 
                        : 'text-orange-700'
                    }`}>
                      {formatCurrency(data.einnahmen.mwst - data.ausgaben.mwst)}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </Card>
  )
}

