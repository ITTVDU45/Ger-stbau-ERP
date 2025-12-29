'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Search } from 'lucide-react'
import { Mahnung } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface MahnungenTabProps {
  kundeId: string
  zeitraumParams: string
}

export default function MahnungenTab({ kundeId, zeitraumParams }: MahnungenTabProps) {
  const router = useRouter()
  const [mahnungen, setMahnungen] = useState<Mahnung[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stufeFilter, setStufeFilter] = useState<string>('alle')

  useEffect(() => {
    loadMahnungen()
  }, [kundeId, zeitraumParams])

  const loadMahnungen = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/mahnungen?${zeitraumParams}`)
      const data = await response.json()
      if (data.erfolg) {
        setMahnungen(data.mahnungen)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mahnungen:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMahnstufeBadge = (stufe: number) => {
    const colors = {
      1: 'bg-yellow-100 text-yellow-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-red-100 text-red-800'
    }
    return (
      <Badge className={colors[stufe as keyof typeof colors] || colors[1]}>
        Mahnung {stufe}
      </Badge>
    )
  }

  const getStatusBadge = (status: Mahnung['status']) => {
    const config = {
      erstellt: { label: 'Erstellt', className: 'bg-gray-100 text-gray-800' },
      zur_genehmigung: { label: 'Zur Genehmigung', className: 'bg-yellow-100 text-yellow-800' },
      genehmigt: { label: 'Genehmigt', className: 'bg-blue-100 text-blue-800' },
      abgelehnt: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      versendet: { label: 'Versendet', className: 'bg-purple-100 text-purple-800' },
      settled: { label: 'Erledigt', className: 'bg-green-100 text-green-800' },
      storniert: { label: 'Storniert', className: 'bg-gray-100 text-gray-600' }
    }
    const c = config[status]
    return <Badge className={c.className}>{c.label}</Badge>
  }

  const filteredMahnungen = mahnungen.filter(m => {
    const matchesSearch = searchTerm === '' ||
      m.mahnungsnummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.rechnungsnummer.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStufe = stufeFilter === 'alle' || m.mahnstufe.toString() === stufeFilter

    return matchesSearch && matchesStufe
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Mahnungen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stufeFilter} onValueChange={setStufeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Mahnstufe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Stufen</SelectItem>
            <SelectItem value="1">Mahnung 1</SelectItem>
            <SelectItem value="2">Mahnung 2</SelectItem>
            <SelectItem value="3">Mahnung 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabelle */}
      {filteredMahnungen.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Keine Mahnungen im ausgewählten Zeitraum</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Mahnungsnummer</TableHead>
                <TableHead>Rechnungsnummer</TableHead>
                <TableHead>Stufe</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Fällig am</TableHead>
                <TableHead className="text-right">Gesamtforderung</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMahnungen.map((mahnung) => (
                <TableRow key={mahnung._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {mahnung.mahnungsnummer}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {mahnung.rechnungsnummer}
                  </TableCell>
                  <TableCell>{getMahnstufeBadge(mahnung.mahnstufe)}</TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(mahnung.datum), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(mahnung.faelligAm), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    {mahnung.gesamtforderung.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </TableCell>
                  <TableCell>{getStatusBadge(mahnung.status)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin/mahnwesen/${mahnung._id}`)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ansehen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Zusammenfassung */}
      {filteredMahnungen.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Anzahl Mahnungen</p>
            <p className="text-2xl font-bold text-gray-900">{filteredMahnungen.length}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">Gesamtforderung</p>
            <p className="text-2xl font-bold text-red-900">
              {filteredMahnungen.reduce((sum, m) => sum + m.gesamtforderung, 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600">Versendet</p>
            <p className="text-2xl font-bold text-purple-900">
              {filteredMahnungen.filter(m => m.status === 'versendet').length}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Erledigt</p>
            <p className="text-2xl font-bold text-green-900">
              {filteredMahnungen.filter(m => m.status === 'settled').length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

