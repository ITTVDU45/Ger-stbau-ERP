'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Search } from 'lucide-react'
import { Angebot } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface AngeboteTabProps {
  kundeId: string
  zeitraumParams: string
}

export default function AngeboteTab({ kundeId, zeitraumParams }: AngeboteTabProps) {
  const router = useRouter()
  const [angebote, setAngebote] = useState<Angebot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')

  useEffect(() => {
    loadAngebote()
  }, [kundeId, zeitraumParams])

  const loadAngebote = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/angebote?${zeitraumParams}`)
      const data = await response.json()
      if (data.erfolg) {
        setAngebote(data.angebote)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Angebote:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Angebot['status']) => {
    const config = {
      entwurf: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      versendet: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      akzeptiert: { label: 'Akzeptiert', className: 'bg-green-100 text-green-800' },
      abgelehnt: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      archiviert: { label: 'Archiviert', className: 'bg-gray-100 text-gray-600' }
    }
    const c = config[status]
    return <Badge className={c.className}>{c.label}</Badge>
  }

  const filteredAngebote = angebote.filter(a => {
    const matchesSearch = searchTerm === '' ||
      a.angebotsnummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.betreff && a.betreff.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'alle' || a.status === statusFilter

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
            placeholder="Angebote suchen..."
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
            <SelectItem value="versendet">Versendet</SelectItem>
            <SelectItem value="akzeptiert">Akzeptiert</SelectItem>
            <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
            <SelectItem value="archiviert">Archiviert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabelle */}
      {filteredAngebote.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Keine Angebote im ausgewählten Zeitraum</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Angebotsnummer</TableHead>
                <TableHead>Betreff</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Betrag (Brutto)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAngebote.map((angebot) => (
                <TableRow key={angebot._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {angebot.angebotsnummer}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {angebot.betreff || '-'}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(angebot.datum), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    {angebot.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </TableCell>
                  <TableCell>{getStatusBadge(angebot.status)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin/angebote/${angebot._id}`)}
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
      {filteredAngebote.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Anzahl Angebote</p>
            <p className="text-2xl font-bold text-gray-900">{filteredAngebote.length}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Gesamtvolumen</p>
            <p className="text-2xl font-bold text-blue-900">
              {filteredAngebote.reduce((sum, a) => sum + a.brutto, 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Akzeptiert</p>
            <p className="text-2xl font-bold text-green-900">
              {filteredAngebote.filter(a => a.status === 'akzeptiert').length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

