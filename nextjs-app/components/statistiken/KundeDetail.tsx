'use client'

/**
 * KundeDetail - Detail-Ansicht für einzelne Kunden
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

export function KundeDetail() {
  const params = useParams()
  const router = useRouter()
  const kundeId = params.id as string
  
  const heute = new Date()
  const [von, setVon] = useState<Date>(startOfYear(heute))
  const [bis, setBis] = useState<Date>(endOfYear(heute))
  const [aktuellerZeitraumTyp, setAktuellerZeitraumTyp] = useState<ZeitraumTyp>('jahr')
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['statistiken-kunde-detail', kundeId, von.toISOString(), bis.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        von: format(von, 'yyyy-MM-dd'),
        bis: format(bis, 'yyyy-MM-dd')
      })
      
      const response = await fetch(`/api/statistiken/kunden/${kundeId}?${params}`)
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Daten')
      }
      return response.json()
    },
    enabled: !!kundeId
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
  
  const { kunde, overview, charts, tables } = data.data
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{kunde.name}</h1>
          {kunde.kundennummer && (
            <p className="text-sm text-gray-600">Kundennummer: {kunde.kundennummer}</p>
          )}
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
                      {table.id === 'projekt-historie' ? (
                        <>
                          <TableHead>Projektname</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Startdatum</TableHead>
                          <TableHead>Enddatum</TableHead>
                          <TableHead className="text-right">Angebotssumme</TableHead>
                          <TableHead className="text-right">Abgerechnet</TableHead>
                        </>
                      ) : table.id === 'rechnungs-historie' ? (
                        <>
                          <TableHead>Rechnungsnummer</TableHead>
                          <TableHead>Rechnungsdatum</TableHead>
                          <TableHead>Fällig am</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                          <TableHead className="text-right">Offen</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Angebotsnummer</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                          <TableHead>Angenommen am</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.daten.map((row: any, index: number) => (
                      <TableRow key={row.id || index}>
                        {table.id === 'projekt-historie' ? (
                          <>
                            <TableCell className="font-medium">{row.projektname}</TableCell>
                            <TableCell>{row.status}</TableCell>
                            <TableCell>{row.startdatum ? format(new Date(row.startdatum), 'dd.MM.yyyy') : '-'}</TableCell>
                            <TableCell>{row.enddatum ? format(new Date(row.enddatum), 'dd.MM.yyyy') : '-'}</TableCell>
                            <TableCell className="text-right">
                              {row.angebotssumme.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.bereitsAbgerechnet.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                          </>
                        ) : table.id === 'rechnungs-historie' ? (
                          <>
                            <TableCell className="font-medium">{row.rechnungsnummer}</TableCell>
                            <TableCell>{format(new Date(row.rechnungsdatum), 'dd.MM.yyyy')}</TableCell>
                            <TableCell>{format(new Date(row.faelligAm), 'dd.MM.yyyy')}</TableCell>
                            <TableCell>{row.status}</TableCell>
                            <TableCell className="text-right">
                              {row.brutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.offenerBetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{row.angebotsnummer}</TableCell>
                            <TableCell>{format(new Date(row.datum), 'dd.MM.yyyy')}</TableCell>
                            <TableCell>{row.status}</TableCell>
                            <TableCell className="text-right">
                              {row.brutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                            <TableCell>{row.angenommenAm ? format(new Date(row.angenommenAm), 'dd.MM.yyyy') : '-'}</TableCell>
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
