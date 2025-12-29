'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Eye } from 'lucide-react'
import { KundenKennzahlen } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface BerichtKundenTabelleProps {
  kunden: KundenKennzahlen[]
  loading: boolean
  activeFilter: string | null
}

export default function BerichtKundenTabelle({ kunden, loading, activeFilter }: BerichtKundenTabelleProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<keyof KundenKennzahlen>('umsatzImZeitraum')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: keyof KundenKennzahlen) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const getStatusBadge = (status: KundenKennzahlen['status']) => {
    const config = {
      aktiv: { label: 'Aktiv', className: 'bg-green-100 text-green-800' },
      inaktiv: { label: 'Inaktiv', className: 'bg-gray-100 text-gray-800' },
      gesperrt: { label: 'Gesperrt', className: 'bg-red-100 text-red-800' },
      mahnsperre: { label: 'Mahnsperre', className: 'bg-orange-100 text-orange-800' }
    }
    const c = config[status]
    return <Badge className={c.className}>{c.label}</Badge>
  }

  // Filtern
  let filteredKunden = kunden

  if (activeFilter) {
    switch (activeFilter) {
      case 'aktive':
        filteredKunden = kunden.filter(k => k.status === 'aktiv')
        break
      case 'offene_rechnungen':
        filteredKunden = kunden.filter(k => k.rechnungenOffen > 0)
        break
      case 'mahnung_offen':
        filteredKunden = kunden.filter(k => k.mahnungenOffen > 0)
        break
      case 'top_umsatz':
        filteredKunden = kunden.filter(k => k.umsatzImZeitraum > 0).slice(0, 10)
        break
      case 'keine_aktivitaet':
        // Kunden ohne Aktivität in den letzten 90 Tagen
        const now = new Date()
        const vor90Tagen = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        filteredKunden = kunden.filter(k => !k.letzteAktivitaet || new Date(k.letzteAktivitaet) < vor90Tagen)
        break
    }
  }

  // Sortieren
  const sortedKunden = [...filteredKunden].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]

    if (aVal === undefined || aVal === null) return 1
    if (bVal === undefined || bVal === null) return -1

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    }

    if (aVal instanceof Date && bVal instanceof Date) {
      return sortDirection === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime()
    }

    const aStr = String(aVal)
    const bStr = String(bVal)
    return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (sortedKunden.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">Keine Kunden gefunden</p>
        <p className="text-sm">Ändern Sie den Filter oder Zeitraum</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="cursor-pointer" onClick={() => handleSort('kundeName')}>
              Kunde
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('ansprechpartner')}>
              Ansprechpartner
            </TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('anzahlProjekte')}>
              Projekte
            </TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('anzahlAngebote')}>
              Angebote
            </TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('rechnungenOffen')}>
              Rechng. Offen
            </TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('rechnungenBezahlt')}>
              Rechng. Bezahlt
            </TableHead>
            <TableHead className="text-center cursor-pointer" onClick={() => handleSort('mahnungenOffen')}>
              Mahnungen
            </TableHead>
            <TableHead className="text-right cursor-pointer" onClick={() => handleSort('umsatzImZeitraum')}>
              Umsatz
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('letzteAktivitaet')}>
              Letzte Aktivität
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
              Status
            </TableHead>
            <TableHead className="text-center">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedKunden.map((kunde) => (
            <TableRow key={kunde.kundeId} className="hover:bg-gray-50">
              <TableCell>
                <div>
                  <p className="font-medium text-gray-900">{kunde.kundeName}</p>
                  {kunde.kundennummer && (
                    <p className="text-xs text-gray-500">{kunde.kundennummer}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-gray-700">
                {kunde.ansprechpartner || '-'}
              </TableCell>
              <TableCell className="text-center text-gray-900">
                {kunde.anzahlProjekte}
              </TableCell>
              <TableCell className="text-center text-gray-900">
                {kunde.anzahlAngebote}
              </TableCell>
              <TableCell className="text-center">
                {kunde.rechnungenOffen > 0 ? (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    {kunde.rechnungenOffen}
                  </Badge>
                ) : (
                  <span className="text-gray-500">0</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {kunde.rechnungenBezahlt > 0 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    {kunde.rechnungenBezahlt}
                  </Badge>
                ) : (
                  <span className="text-gray-500">0</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {kunde.mahnungenOffen > 0 ? (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    {kunde.mahnungenOffen}
                  </Badge>
                ) : (
                  <span className="text-gray-500">0</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium text-gray-900">
                {kunde.umsatzImZeitraum.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </TableCell>
              <TableCell className="text-sm text-gray-700">
                {kunde.letzteAktivitaet
                  ? format(new Date(kunde.letzteAktivitaet), 'dd.MM.yyyy', { locale: de })
                  : '-'}
              </TableCell>
              <TableCell>
                {getStatusBadge(kunde.status)}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/dashboard/admin/kunden/berichte/${kunde.kundeId}`)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Bericht öffnen
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

