'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Trash2, ArrowUpDown, Search, RefreshCw, MoreVertical, FileText } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Transaktion } from '@/lib/db/types'

interface TransaktionenTabelleProps {
  transaktionen: Transaktion[]
  loading?: boolean
  activeFilter?: string | null
  onRefresh?: () => void
  onEdit?: (transaktion: Transaktion) => void
  onDelete?: (id: string) => void
}

type SortKey = 'datum' | 'betrag' | 'kategorieName'
type SortOrder = 'asc' | 'desc'

export default function TransaktionenTabelle({
  transaktionen,
  loading = false,
  activeFilter: _activeFilter,
  onRefresh,
  onEdit,
  onDelete
}: TransaktionenTabelleProps) {
  const [activeTab, setActiveTab] = useState<'alle' | 'einnahmen' | 'ausgaben'>('alle')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('datum')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transaktionToDelete, setTransaktionToDelete] = useState<Transaktion | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'dd.MM.yyyy', { locale: de })
  }

  const handleDeleteClick = (transaktion: Transaktion) => {
    setTransaktionToDelete(transaktion)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!transaktionToDelete?._id) return

    try {
      const res = await fetch(`/api/finanzen/transaktionen/${transaktionToDelete._id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Transaktion erfolgreich gelöscht')
        onRefresh?.()
        onDelete?.(transaktionToDelete._id)
      } else {
        toast.error('Fehler beim Löschen der Transaktion')
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen der Transaktion')
    } finally {
      setDeleteDialogOpen(false)
      setTransaktionToDelete(null)
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  // Filter & Sort
  const filteredTransaktionen = useMemo(() => {
    let filtered = [...transaktionen]

    // Tab-Filter
    if (activeTab === 'einnahmen') {
      filtered = filtered.filter(t => t.typ === 'einnahme')
    } else if (activeTab === 'ausgaben') {
      filtered = filtered.filter(t => t.typ === 'ausgabe')
    }

    // Search-Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.beschreibung.toLowerCase().includes(query) ||
        t.kategorieName.toLowerCase().includes(query) ||
        t.kundeName?.toLowerCase().includes(query) ||
        t.projektName?.toLowerCase().includes(query)
      )
    }

    // Sortierung
    filtered.sort((a, b) => {
      let aVal: any = a[sortKey]
      let bVal: any = b[sortKey]

      if (sortKey === 'datum') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [transaktionen, activeTab, searchQuery, sortKey, sortOrder])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'gebucht':
        return <Badge variant="default" className="bg-green-100 text-green-800">Gebucht</Badge>
      case 'offen':
        return <Badge variant="secondary">Offen</Badge>
      case 'storniert':
        return <Badge variant="destructive">Storniert</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypBadge = (typ: string) => {
    return typ === 'einnahme' ? (
      <Badge className="bg-green-100 text-green-800">Einnahme</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Ausgabe</Badge>
    )
  }

  const getQuelleBadge = (quelle: string) => {
    switch (quelle) {
      case 'rechnung_automatisch':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">🤖 Auto</Badge>
      case 'ki_automatisch':
        return <Badge variant="outline" className="bg-green-50 text-green-700">✨ KI</Badge>
      case 'wiederkehrend':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">🔁 Wiederkehrend</Badge>
      case 'manuell':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">📝 Manuell</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-600">❓ Unbekannt</Badge>
    }
  }

  const getZahlungsartLabel = (zahlungsart: string) => {
    const labels: Record<string, string> = {
      ueberweisung: 'Überweisung',
      bar: 'Bar',
      karte: 'Karte',
      paypal: 'PayPal',
      lastschrift: 'Lastschrift',
      sonstige: 'Sonstige'
    }
    return labels[zahlungsart] || zahlungsart
  }

  if (loading) {
    return (
      <Card className="p-6 bg-white border-2 border-gray-200">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 md:p-6 bg-white border-2 border-gray-200">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Transaktionsübersicht</h2>
        <div className="flex gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full md:w-64 text-gray-900"
            />
          </div>
          <Button variant="outline" onClick={onRefresh} size="icon" title="Aktualisieren">
            <RefreshCw className="h-4 w-4 text-gray-700" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="overflow-x-auto mb-4">
          <TabsList className="bg-gray-100 w-full md:w-auto inline-flex">
            <TabsTrigger value="alle" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 font-semibold text-sm md:text-base">
              Alle ({transaktionen.length})
            </TabsTrigger>
            <TabsTrigger value="einnahmen" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 font-semibold text-sm md:text-base">
              Einnahmen ({transaktionen.filter(t => t.typ === 'einnahme').length})
            </TabsTrigger>
            <TabsTrigger value="ausgaben" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900 font-semibold text-sm md:text-base">
              Ausgaben ({transaktionen.filter(t => t.typ === 'ausgabe').length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[100px] text-gray-900 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('datum')}
                      className="h-8 p-0 hover:bg-transparent text-gray-900 font-semibold"
                    >
                      Datum
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-gray-900 font-semibold">Typ</TableHead>
                  <TableHead className="text-gray-900 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('betrag')}
                      className="h-8 p-0 hover:bg-transparent text-gray-900 font-semibold"
                    >
                      Betrag
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-gray-900 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('kategorieName')}
                      className="h-8 p-0 hover:bg-transparent text-gray-900 font-semibold"
                    >
                      Kategorie
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-gray-900 font-semibold">Beschreibung</TableHead>
                  <TableHead className="text-gray-900 font-semibold">Dokumente</TableHead>
                  <TableHead className="text-gray-900 font-semibold">Verknüpfung</TableHead>
                  <TableHead className="text-gray-900 font-semibold">Zahlungsart</TableHead>
                  <TableHead className="text-gray-900 font-semibold">Quelle</TableHead>
                  <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                  <TableHead className="text-right text-gray-900 font-semibold">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransaktionen.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-700 font-medium">
                      Keine Transaktionen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransaktionen.map((transaktion) => (
                    <TableRow key={transaktion._id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        {formatDate(transaktion.datum)}
                      </TableCell>
                      <TableCell>{getTypBadge(transaktion.typ)}</TableCell>
                      <TableCell className={cn(
                        'font-semibold text-base',
                        transaktion.typ === 'einnahme' ? 'text-green-700' : 'text-red-700'
                      )}>
                        {transaktion.typ === 'einnahme' ? '+' : '-'}
                        {formatCurrency(transaktion.betrag)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-gray-900 border-gray-300">{transaktion.kategorieName}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-gray-900">
                        {transaktion.beschreibung}
                      </TableCell>
                      <TableCell>
                        {transaktion.dokumente && transaktion.dokumente.length > 0 ? (
                          <Badge variant="outline" className="gap-1 text-gray-900 border-gray-300">
                            <FileText className="h-3 w-3" />
                            {transaktion.dokumente.length}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {transaktion.kundeName && (
                            <div className="text-gray-800">👤 {transaktion.kundeName}</div>
                          )}
                          {transaktion.projektName && (
                            <div className="text-gray-800">📁 {transaktion.projektName}</div>
                          )}
                          {transaktion.rechnungsnummer && (
                            <div className="text-gray-800">📄 {transaktion.rechnungsnummer}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-800 font-medium">
                          {getZahlungsartLabel(transaktion.zahlungsart)}
                        </span>
                      </TableCell>
                      <TableCell>{getQuelleBadge(transaktion.quelle)}</TableCell>
                      <TableCell>{getStatusBadge(transaktion.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-700" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => onEdit?.(transaktion)}
                              disabled={transaktion.quelle === 'rechnung_automatisch'}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(transaktion)}
                              disabled={transaktion.quelle === 'rechnung_automatisch'}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredTransaktionen.length > 0 && (
            <div className="mt-4 text-sm text-gray-900 font-medium text-right">
              {filteredTransaktionen.length} von {transaktionen.length} Transaktionen
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lösch-Bestätigungs-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transaktion löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diese Transaktion löschen möchten?
              <br />
              <br />
              <strong>{transaktionToDelete?.beschreibung}</strong>
              <br />
              Betrag: {transaktionToDelete && formatCurrency(transaktionToDelete.betrag)}
              <br />
              Datum: {transaktionToDelete && formatDate(transaktionToDelete.datum)}
              <br />
              <br />
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setTransaktionToDelete(null)
            }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

