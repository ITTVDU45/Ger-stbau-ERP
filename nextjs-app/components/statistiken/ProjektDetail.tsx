'use client'

/**
 * ProjektDetail - Detail-Ansicht für einzelne Projekte
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { StatistikCard } from './StatistikCard'
import { StatistikChart } from './StatistikChart'
import { StatistikFilter, ZeitraumTyp } from './StatistikFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { format, startOfYear, endOfYear } from 'date-fns'

export function ProjektDetail() {
  const params = useParams()
  const router = useRouter()
  const projektId = params.id as string
  
  const heute = new Date()
  const [von, setVon] = useState<Date>(startOfYear(heute))
  const [bis, setBis] = useState<Date>(endOfYear(heute))
  const [aktuellerZeitraumTyp, setAktuellerZeitraumTyp] = useState<ZeitraumTyp>('jahr')
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['statistiken-projekt-detail', projektId, von.toISOString(), bis.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        von: format(von, 'yyyy-MM-dd'),
        bis: format(bis, 'yyyy-MM-dd')
      })
      
      const response = await fetch(`/api/statistiken/projekte/${projektId}?${params}`)
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Daten')
      }
      return response.json()
    },
    enabled: !!projektId
  })
  
  const handleZeitraumChange = (typ: ZeitraumTyp, neuesVon: Date, neuesBis: Date) => {
    setAktuellerZeitraumTyp(typ)
    setVon(neuesVon)
    setBis(neuesBis)
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  
  if (error || !data?.erfolg) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
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
  
  const { projekt, overview, charts, tables } = data.data
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{projekt.projektname}</h1>
          <p className="text-sm text-gray-600">
            {projekt.projektnummer && `Projektnummer: ${projekt.projektnummer}`}
            {projekt.kundeName && ` • Kunde: ${projekt.kundeName}`}
          </p>
        </div>
      </div>
      
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
                      {table.id === 'mitarbeiter-zuordnungen' ? (
                        <>
                          <TableHead>Mitarbeiter</TableHead>
                          <TableHead className="text-right">Einsätze</TableHead>
                          <TableHead className="text-right">Stunden</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Kategorie</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.daten.map((row: any, index: number) => (
                      <TableRow key={row.mitarbeiterId || row.kategorie || index}>
                        {table.id === 'mitarbeiter-zuordnungen' ? (
                          <>
                            <TableCell className="font-medium">{row.mitarbeiterName}</TableCell>
                            <TableCell className="text-right">{row.anzahlEinsaetze}</TableCell>
                            <TableCell className="text-right">{row.stunden.toFixed(1)}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{row.kategorie}</TableCell>
                            <TableCell className="text-right">
                              {row.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
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
