"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Plus, TrendingUp } from 'lucide-react'
import { Rechnung } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface KundenRechnungenProps {
  kundeId: string
  kundeName: string
}

export default function KundenRechnungen({ kundeId, kundeName }: KundenRechnungenProps) {
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([])
  const [umsatzData, setUmsatzData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRechnungen()
    loadUmsatzStatistiken()
  }, [kundeId])

  const loadRechnungen = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/rechnungen`)
      if (response.ok) {
        const data = await response.json()
        setRechnungen(data.rechnungen || [])
      }
    } catch (error) {
      console.error('Fehler:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUmsatzStatistiken = async () => {
    try {
      const response = await fetch(`/api/kunden/${kundeId}/umsatz`)
      if (response.ok) {
        const data = await response.json()
        setUmsatzData(data)
      }
    } catch (error) {
      console.error('Fehler:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      entwurf: { variant: 'secondary', label: 'Entwurf' },
      gesendet: { variant: 'default', label: 'Gesendet', class: 'bg-blue-600' },
      bezahlt: { variant: 'default', label: 'Bezahlt', class: 'bg-green-600' },
      teilbezahlt: { variant: 'default', label: 'Teilbezahlt', class: 'bg-yellow-600' },
      ueberfaellig: { variant: 'destructive', label: 'Überfällig' },
      storniert: { variant: 'outline', label: 'Storniert' }
    }
    const config = variants[status] || { variant: 'default', label: status }
    return <Badge variant={config.variant as any} className={config.class}>{config.label}</Badge>
  }

  const offenePostenSumme = rechnungen
    .filter(r => r.status !== 'bezahlt' && r.status !== 'storniert')
    .reduce((sum, r) => sum + r.brutto, 0)

  return (
    <div className="space-y-4">
      {/* Umsatz-Chart */}
      {umsatzData && umsatzData.chartData && umsatzData.chartData.length > 0 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Umsatzentwicklung (12 Monate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={umsatzData.chartData}>
                <defs>
                  <linearGradient id="umsatzGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="monat" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="umsatz"
                  stroke="#8b5cf6"
                  fill="url(#umsatzGradient)"
                  name="Umsatz (€)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm border-t border-gray-200 pt-4">
              <div>
                <p className="text-gray-700 font-medium">Gesamtumsatz (12 Mon.)</p>
                <p className="text-lg font-bold text-gray-900">
                  {(umsatzData.statistiken?.gesamtUmsatz12Monate || 0).toLocaleString('de-DE')} €
                </p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Durchschnitt/Monat</p>
                <p className="text-lg font-bold text-gray-900">
                  {(umsatzData.statistiken?.durchschnittProMonat || 0).toLocaleString('de-DE')} €
                </p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Anzahl Rechnungen</p>
                <p className="text-lg font-bold text-gray-900">
                  {umsatzData.statistiken?.anzahlRechnungen || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rechnungen-Tabelle */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">Rechnungen</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Offene Posten: <span className="font-semibold text-red-600">{offenePostenSumme.toLocaleString('de-DE')} €</span>
              </p>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Neue Rechnung
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Lade Rechnungen...</p>
          ) : rechnungen.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Noch keine Rechnungen für diesen Kunden</p>
          ) : (
            <div className="rounded-md border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Rechnungsnr.</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Datum</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Fällig am</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Summe (Brutto)</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Mahnstufe</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rechnungen.map((r) => (
                    <TableRow key={r._id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{r.rechnungsnummer}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {r.rechnungsdatum ? format(new Date(r.rechnungsdatum), 'dd.MM.yyyy', { locale: de }) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {r.faelligAm ? format(new Date(r.faelligAm), 'dd.MM.yyyy', { locale: de }) : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {r.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {r.mahnstufe > 0 ? (
                          <Badge variant="destructive">Mahnung {r.mahnstufe}</Badge>
                        ) : <span className="text-gray-500">-</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

