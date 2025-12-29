'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Search, FileWarning } from 'lucide-react'
import { Rechnung } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface RechnungenTabProps {
  kundeId: string
  zeitraumParams: string
}

export default function RechnungenTab({ kundeId, zeitraumParams }: RechnungenTabProps) {
  const router = useRouter()
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')

  useEffect(() => {
    loadRechnungen()
  }, [kundeId, zeitraumParams])

  const loadRechnungen = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/rechnungen?${zeitraumParams}`)
      const data = await response.json()
      if (data.erfolg) {
        setRechnungen(data.rechnungen)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (rechnung: Rechnung) => {
    const config: any = {
      entwurf: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      gesendet: { label: 'Gesendet', className: 'bg-blue-100 text-blue-800' },
      offen: { label: 'Offen', className: 'bg-yellow-100 text-yellow-800' },
      bezahlt: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
      teilweise_bezahlt: { label: 'Teilw. bezahlt', className: 'bg-orange-100 text-orange-800' },
      ueberfaellig: { label: 'Überfällig', className: 'bg-red-100 text-red-800' },
      storniert: { label: 'Storniert', className: 'bg-gray-100 text-gray-600' }
    }
    const c = config[rechnung.status] || config.entwurf

    return (
      <div className="flex items-center gap-2">
        <Badge className={c.className}>{c.label}</Badge>
        {rechnung.hatOffeneMahnung && rechnung.status !== 'bezahlt' && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <FileWarning className="h-3 w-3 mr-1" />
            Mahnung
          </Badge>
        )}
      </div>
    )
  }

  const filteredRechnungen = rechnungen.filter(r => {
    const matchesSearch = searchTerm === '' ||
      r.rechnungsnummer.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'alle' || r.status === statusFilter

    return matchesSearch && matchesStatus
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
            placeholder="Rechnungen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            <SelectItem value="entwurf">Entwurf</SelectItem>
            <SelectItem value="gesendet">Gesendet</SelectItem>
            <SelectItem value="offen">Offen</SelectItem>
            <SelectItem value="bezahlt">Bezahlt</SelectItem>
            <SelectItem value="teilweise_bezahlt">Teilweise bezahlt</SelectItem>
            <SelectItem value="ueberfaellig">Überfällig</SelectItem>
            <SelectItem value="storniert">Storniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabelle */}
      {filteredRechnungen.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Keine Rechnungen im ausgewählten Zeitraum</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Rechnungsnummer</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Fällig am</TableHead>
                <TableHead className="text-right">Betrag (Brutto)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRechnungen.map((rechnung) => (
                <TableRow key={rechnung._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {rechnung.rechnungsnummer}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {rechnung.typ}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(rechnung.rechnungsdatum), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(rechnung.faelligkeitsdatum), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    {rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </TableCell>
                  <TableCell>{getStatusBadge(rechnung)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin/rechnungen/${rechnung._id}`)}
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
      {filteredRechnungen.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Anzahl Rechnungen</p>
            <p className="text-2xl font-bold text-gray-900">{filteredRechnungen.length}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Gesamtvolumen</p>
            <p className="text-2xl font-bold text-blue-900">
              {filteredRechnungen.reduce((sum, r) => sum + r.brutto, 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Bezahlt</p>
            <p className="text-2xl font-bold text-green-900">
              {filteredRechnungen.filter(r => r.status === 'bezahlt').reduce((sum, r) => sum + r.brutto, 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">Offen</p>
            <p className="text-2xl font-bold text-red-900">
              {filteredRechnungen.filter(r => r.status === 'offen' || r.status === 'ueberfaellig' || r.status === 'teilweise_bezahlt').reduce((sum, r) => sum + r.brutto, 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

