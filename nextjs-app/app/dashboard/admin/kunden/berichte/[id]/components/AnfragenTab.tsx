'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Search } from 'lucide-react'
import { Anfrage } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface AnfragenTabProps {
  kundeId: string
  zeitraumParams: string
}

export default function AnfragenTab({ kundeId, zeitraumParams }: AnfragenTabProps) {
  const router = useRouter()
  const [anfragen, setAnfragen] = useState<Anfrage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')

  useEffect(() => {
    loadAnfragen()
  }, [kundeId, zeitraumParams])

  const loadAnfragen = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/anfragen?${zeitraumParams}`)
      const data = await response.json()
      if (data.erfolg) {
        setAnfragen(data.anfragen)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Anfragen:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Anfrage['status']) => {
    const config = {
      offen: { label: 'Offen', className: 'bg-yellow-100 text-yellow-800' },
      in_bearbeitung: { label: 'In Bearbeitung', className: 'bg-blue-100 text-blue-800' },
      angebot_in_bearbeitung: { label: 'Angebot in Bearb.', className: 'bg-purple-100 text-purple-800' },
      angebot_erstellt: { label: 'Angebot erstellt', className: 'bg-green-100 text-green-800' }
    }
    const c = config[status]
    return <Badge className={c.className}>{c.label}</Badge>
  }

  const filteredAnfragen = anfragen.filter(a => {
    const matchesSearch = searchTerm === '' ||
      a.anfragenummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.bauvorhaben.objektname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.bauvorhaben.ort.toLowerCase().includes(searchTerm.toLowerCase())

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
            placeholder="Anfragen suchen..."
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
            <SelectItem value="offen">Offen</SelectItem>
            <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
            <SelectItem value="angebot_in_bearbeitung">Angebot in Bearb.</SelectItem>
            <SelectItem value="angebot_erstellt">Angebot erstellt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabelle */}
      {filteredAnfragen.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Keine Anfragen im ausgewählten Zeitraum</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Anfragenummer</TableHead>
                <TableHead>Bauvorhaben</TableHead>
                <TableHead>Ort</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnfragen.map((anfrage) => (
                <TableRow key={anfrage._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {anfrage.anfragenummer}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{anfrage.bauvorhaben.objektname}</p>
                      <p className="text-sm text-gray-600">{anfrage.bauvorhaben.strasse}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {anfrage.bauvorhaben.plz} {anfrage.bauvorhaben.ort}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(anfrage.erstelltAm), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell>{getStatusBadge(anfrage.status)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin/anfragen/${anfrage._id}`)}
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
    </div>
  )
}

