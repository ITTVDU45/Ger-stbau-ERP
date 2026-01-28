'use client'

/**
 * OverviewStats - Übersichts-Statistiken
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { StatistikCard } from './StatistikCard'
import { StatistikChart } from './StatistikChart'
import { StatistikFilter, ZeitraumTyp } from './StatistikFilter'
import { OverviewKIBerichtPanel } from './OverviewKIBerichtPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface OverviewStatsProps {
  zeitraumTyp?: ZeitraumTyp
  initialVon?: Date
  initialBis?: Date
}

export function OverviewStats({
  zeitraumTyp = 'monat',
  initialVon,
  initialBis
}: OverviewStatsProps) {
  const heute = new Date()
  const [von, setVon] = useState<Date>(initialVon || startOfMonth(heute))
  const [bis, setBis] = useState<Date>(initialBis || endOfMonth(heute))
  const [aktuellerZeitraumTyp, setAktuellerZeitraumTyp] = useState<ZeitraumTyp>(zeitraumTyp)
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['statistiken-overview', von.toISOString(), bis.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        von: format(von, 'yyyy-MM-dd'),
        bis: format(bis, 'yyyy-MM-dd')
      })
      
      const response = await fetch(`/api/statistiken/overview?${params}`)
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Daten')
      }
      return response.json()
    }
  })
  
  const handleZeitraumChange = (typ: ZeitraumTyp, neuesVon: Date, neuesBis: Date) => {
    setAktuellerZeitraumTyp(typ)
    setVon(neuesVon)
    setBis(neuesBis)
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatistikFilter
          zeitraumTyp={aktuellerZeitraumTyp}
          von={von}
          bis={bis}
          onZeitraumChange={handleZeitraumChange}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  if (error || !data?.erfolg) {
    return (
      <div className="space-y-6">
        <StatistikFilter
          zeitraumTyp={aktuellerZeitraumTyp}
          von={von}
          bis={bis}
          onZeitraumChange={handleZeitraumChange}
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">
              Fehler beim Laden der Daten: {error instanceof Error ? error.message : 'Unbekannter Fehler'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const { overview, charts, tables } = data.data
  
  return (
    <div className="space-y-6">
      <StatistikFilter
        zeitraumTyp={aktuellerZeitraumTyp}
        von={von}
        bis={bis}
        onZeitraumChange={handleZeitraumChange}
      />
      
      {/* KPI-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {overview.map((kpi: any) => (
          <StatistikCard
            key={kpi.id}
            titel={kpi.titel}
            wert={kpi.wert}
            format={kpi.format}
            trend={kpi.trend}
            vergleich={kpi.vergleich}
            untertitel={kpi.untertitel}
          />
        ))}
      </div>
      
      {/* Charts */}
      {charts && charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((chart: any) => {
            // Chart-spezifische Konfiguration
            let chartConfig = chart.config || {}
            
            if (chart.id === 'mitarbeiter-auslastung') {
              chartConfig = { xAxisKey: 'name' }
            } else if (chart.id === 'umsatz-pro-monat') {
              chartConfig = { xAxisKey: 'monat' }
            } else if (chart.id === 'einnahmen-ausgaben') {
              chartConfig = { xAxisKey: 'monat' }
            }
            
            return (
              <StatistikChart
                key={chart.id}
                chart={{ ...chart, config: chartConfig }}
                isLoading={isLoading}
                error={error ? String(error) : null}
              />
            )
          })}
        </div>
      )}
      
      {/* Tabellen */}
      {tables && tables.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tables.map((table: any) => (
            <Card key={table.id}>
              <CardHeader>
                <CardTitle>{table.titel}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {table.id === 'top-projekte' ? (
                        <>
                          <TableHead>Projekt</TableHead>
                          <TableHead className="text-right">Umsatz</TableHead>
                        </>
                      ) : table.id === 'top-kunden' ? (
                        <>
                          <TableHead>Kunde</TableHead>
                          <TableHead className="text-right">Umsatz</TableHead>
                        </>
                      ) : table.id === 'top-mitarbeiter' ? (
                        <>
                          <TableHead>Mitarbeiter</TableHead>
                          <TableHead className="text-right">Stunden</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Kunde</TableHead>
                          <TableHead className="text-right">Offener Betrag</TableHead>
                          <TableHead>Fällig am</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.daten.map((row: any, index: number) => (
                      <TableRow key={row.projektId || row.kundeId || row.mitarbeiterId || row.rechnungsnummer || index}>
                        {table.id === 'top-projekte' ? (
                          <>
                            <TableCell className="font-medium">{row.projektName}</TableCell>
                            <TableCell className="text-right">
                              {row.umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                          </>
                        ) : table.id === 'top-kunden' ? (
                          <>
                            <TableCell className="font-medium">{row.kundeName}</TableCell>
                            <TableCell className="text-right">
                              {row.umsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                          </>
                        ) : table.id === 'top-mitarbeiter' ? (
                          <>
                            <TableCell className="font-medium">{row.mitarbeiterName}</TableCell>
                            <TableCell className="text-right">{row.stunden.toFixed(1)}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{row.kundeName}</TableCell>
                            <TableCell className="text-right">
                              {row.offenerBetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                            <TableCell>{format(new Date(row.faelligAm), 'dd.MM.yyyy')}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* KI-Bericht-Panel */}
      <OverviewKIBerichtPanel
        zeitraumTyp={aktuellerZeitraumTyp}
        von={von}
        bis={bis}
      />
    </div>
  )
}
