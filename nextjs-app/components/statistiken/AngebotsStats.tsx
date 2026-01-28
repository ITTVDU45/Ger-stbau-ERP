'use client'

/**
 * AngebotsStats - Statistik-Komponente für Angebote
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { StatistikCard } from './StatistikCard'
import { StatistikChart } from './StatistikChart'
import { StatistikFilter, ZeitraumTyp } from './StatistikFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { format, startOfYear, endOfYear } from 'date-fns'

interface AngebotsStatsProps {
  zeitraumTyp?: ZeitraumTyp
  initialVon?: Date
  initialBis?: Date
}

export function AngebotsStats({
  zeitraumTyp = 'jahr',
  initialVon,
  initialBis
}: AngebotsStatsProps) {
  const heute = new Date()
  const [von, setVon] = useState<Date>(initialVon || startOfYear(heute))
  const [bis, setBis] = useState<Date>(initialBis || endOfYear(heute))
  const [aktuellerZeitraumTyp, setAktuellerZeitraumTyp] = useState<ZeitraumTyp>(zeitraumTyp)
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['statistiken-angebote', von.toISOString(), bis.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        von: format(von, 'yyyy-MM-dd'),
        bis: format(bis, 'yyyy-MM-dd')
      })
      
      const response = await fetch(`/api/statistiken/angebote?${params}`)
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart: any) => (
          <StatistikChart
            key={chart.id}
            chart={chart}
            isLoading={isLoading}
            error={error ? String(error) : null}
          />
        ))}
      </div>
      
      {tables && tables.length > 0 && (
        <div className="space-y-6">
          {tables.map((table: any) => (
            <Card key={table.id}>
              <CardHeader>
                <CardTitle>{table.titel}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {table.id === 'erfolgsrate-kunde' ? (
                        <>
                          <TableHead>Kunde</TableHead>
                          <TableHead className="text-right">Gesamt</TableHead>
                          <TableHead className="text-right">Angenommen</TableHead>
                          <TableHead className="text-right">Erfolgsrate</TableHead>
                        </>
                      ) : table.id === 'erfolgsrate-typ' ? (
                        <>
                          <TableHead>Projekttyp</TableHead>
                          <TableHead className="text-right">Gesamt</TableHead>
                          <TableHead className="text-right">Angenommen</TableHead>
                          <TableHead className="text-right">Erfolgsrate</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Angebotsnummer</TableHead>
                          <TableHead>Kunde</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                          <TableHead>Status</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.daten.map((row: any, index: number) => (
                      <TableRow key={row.angebotsnummer || row.kundeName || index}>
                        {table.id === 'erfolgsrate-kunde' || table.id === 'erfolgsrate-typ' ? (
                          <>
                            <TableCell className="font-medium">{row.kundeName || row.typ || 'Nicht angegeben'}</TableCell>
                            <TableCell className="text-right">{row.gesamt}</TableCell>
                            <TableCell className="text-right">{row.angenommen}</TableCell>
                            <TableCell className="text-right">{row.erfolgsrate}%</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{row.angebotsnummer}</TableCell>
                            <TableCell>{row.kundeName}</TableCell>
                            <TableCell>{format(new Date(row.datum), 'dd.MM.yyyy')}</TableCell>
                            <TableCell className="text-right">
                              {row.brutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                            <TableCell>{row.status}</TableCell>
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
    </div>
  )
}
