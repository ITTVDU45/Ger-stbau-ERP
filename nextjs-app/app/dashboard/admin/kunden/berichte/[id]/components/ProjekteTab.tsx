'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Search } from 'lucide-react'
import { Projekt } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface ProjekteTabProps {
  kundeId: string
  zeitraumParams: string
}

export default function ProjekteTab({ kundeId, zeitraumParams }: ProjekteTabProps) {
  const router = useRouter()
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')

  useEffect(() => {
    loadProjekte()
  }, [kundeId, zeitraumParams])

  const loadProjekte = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/projekte?${zeitraumParams}`)
      const data = await response.json()
      if (data.erfolg) {
        setProjekte(data.projekte)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Projekt['status']) => {
    const config = {
      in_planung: { label: 'In Planung', className: 'bg-blue-100 text-blue-800' },
      aktiv: { label: 'Aktiv', className: 'bg-green-100 text-green-800' },
      pausiert: { label: 'Pausiert', className: 'bg-orange-100 text-orange-800' },
      abgeschlossen: { label: 'Abgeschlossen', className: 'bg-gray-100 text-gray-800' },
      abgebrochen: { label: 'Abgebrochen', className: 'bg-red-100 text-red-800' }
    }
    const c = config[status]
    return <Badge className={c.className}>{c.label}</Badge>
  }

  const filteredProjekte = projekte.filter(p => {
    const matchesSearch = searchTerm === '' ||
      p.projektnummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projektname.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'alle' || p.status === statusFilter

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
            placeholder="Projekte suchen..."
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
            <SelectItem value="in_planung">In Planung</SelectItem>
            <SelectItem value="aktiv">Aktiv</SelectItem>
            <SelectItem value="pausiert">Pausiert</SelectItem>
            <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
            <SelectItem value="abgebrochen">Abgebrochen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabelle */}
      {filteredProjekte.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Keine Projekte im ausgewählten Zeitraum</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Projektnummer</TableHead>
                <TableHead>Projektname</TableHead>
                <TableHead>Startdatum</TableHead>
                <TableHead>Enddatum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjekte.map((projekt) => (
                <TableRow key={projekt._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {projekt.projektnummer}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{projekt.projektname}</p>
                      <p className="text-sm text-gray-600">{projekt.standort}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {projekt.startdatum ? format(new Date(projekt.startdatum), 'dd.MM.yyyy', { locale: de }) : '-'}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {projekt.enddatum ? format(new Date(projekt.enddatum), 'dd.MM.yyyy', { locale: de }) : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(projekt.status)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin/projekte/${projekt._id}`)}
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
      {filteredProjekte.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Anzahl Projekte</p>
            <p className="text-2xl font-bold text-gray-900">{filteredProjekte.length}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Aktiv</p>
            <p className="text-2xl font-bold text-green-900">
              {filteredProjekte.filter(p => p.status === 'aktiv').length}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">In Planung</p>
            <p className="text-2xl font-bold text-blue-900">
              {filteredProjekte.filter(p => p.status === 'in_planung').length}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Abgeschlossen</p>
            <p className="text-2xl font-bold text-gray-900">
              {filteredProjekte.filter(p => p.status === 'abgeschlossen').length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

