'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Trash2, Search, RefreshCw, MoreVertical, FileText } from 'lucide-react'
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
import { format, isToday, isYesterday } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Transaktion } from '@/lib/db/types'
import TransaktionsFilter, { TransaktionsFilters } from './filters/TransaktionsFilter'

interface TransaktionenTabelleProps {
  transaktionen: Transaktion[]
  loading?: boolean
  activeFilter?: string | null
  onRefresh?: () => void
  onEdit?: (transaktion: Transaktion) => void
  onDelete?: (id: string) => void
}

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transaktionToDelete, setTransaktionToDelete] = useState<Transaktion | null>(null)
  const [filters, setFilters] = useState<TransaktionsFilters>({
    kategorie: null,
    typ: null,
    zahlungsart: null,
    quelle: null,
    zeitraum: { von: null, bis: null }
  })

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

  // Filter & Sort
  const filteredTransaktionen = useMemo(() => {
    let filtered = [...transaktionen]

    // Tab-Filter (nur wenn nicht durch Filter-Select überschrieben)
    if (!filters.typ) {
      if (activeTab === 'einnahmen') {
        filtered = filtered.filter(t => t.typ === 'einnahme')
      } else if (activeTab === 'ausgaben') {
        filtered = filtered.filter(t => t.typ === 'ausgabe')
      }
    }

    // Filter: Typ (wenn explizit gesetzt)
    if (filters.typ && filters.typ !== 'alle') {
      filtered = filtered.filter(t => t.typ === filters.typ)
    }

    // Filter: Kategorie
    if (filters.kategorie) {
      filtered = filtered.filter(t => t.kategorieId === filters.kategorie)
    }

    // Filter: Zahlungsart
    if (filters.zahlungsart) {
      filtered = filtered.filter(t => t.zahlungsart === filters.zahlungsart)
    }

    // Filter: Quelle (Manuell/KI)
    if (filters.quelle && filters.quelle !== 'alle') {
      if (filters.quelle === 'ki') {
        filtered = filtered.filter(t => t.quelle === 'ki_automatisch')
      } else if (filters.quelle === 'manuell') {
        filtered = filtered.filter(t => t.quelle === 'manuell')
      }
    }

    // Filter: Zeitraum
    if (filters.zeitraum.von && filters.zeitraum.bis) {
      filtered = filtered.filter(t => {
        const datum = new Date(t.datum).getTime()
        const von = filters.zeitraum.von!.getTime()
        const bis = filters.zeitraum.bis!.getTime()
        return datum >= von && datum <= bis
      })
    }

    // Search-Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.beschreibung.toLowerCase().includes(query) ||
        (t.kategorieName && t.kategorieName.toLowerCase().includes(query)) ||
        (t.kundeName && t.kundeName.toLowerCase().includes(query)) ||
        (t.projektName && t.projektName.toLowerCase().includes(query))
      )
    }

    // Sortierung: Neueste zuerst
    filtered.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

    return filtered
  }, [transaktionen, activeTab, searchQuery, filters])

  const groupedTransaktionen = useMemo(() => {
    const groups: Array<{
      dateKey: string
      label: string
      items: Transaktion[]
    }> = []
    const groupMap = new Map<string, number>()

    filteredTransaktionen.forEach((transaktion) => {
      const dateObj = new Date(transaktion.datum)
      const dateKey = format(dateObj, 'yyyy-MM-dd')
      const existingIndex = groupMap.get(dateKey)

      if (existingIndex !== undefined) {
        groups[existingIndex].items.push(transaktion)
        return
      }

      let label = format(dateObj, 'dd.MM.yyyy', { locale: de })
      if (isToday(dateObj)) label = 'Heute'
      if (isYesterday(dateObj)) label = 'Gestern'

      groups.push({
        dateKey,
        label,
        items: [transaktion]
      })
      groupMap.set(dateKey, groups.length - 1)
    })

    return groups
  }, [filteredTransaktionen])

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
    <Card className="p-4 md:p-6 bg-white border-2 border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 200px)', maxHeight: '900px' }}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 flex-shrink-0">
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

      {/* Filter-Komponente */}
      <div className="flex-shrink-0">
        <TransaktionsFilter
          filters={filters}
          onFiltersChange={setFilters}
          activeTab={activeTab}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto mb-4 flex-shrink-0">
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

        <TabsContent value={activeTab} className="mt-0 flex-1 min-h-0 overflow-hidden">
          <div className="rounded-xl border bg-gray-50 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {groupedTransaktionen.length === 0 ? (
                <div className="py-8 text-center text-gray-700 font-medium">
                  Keine Transaktionen gefunden
                </div>
              ) : (
                <div className="space-y-6 p-4">
                  {groupedTransaktionen.map((group) => (
                    <div key={group.dateKey} className="rounded-xl border bg-white overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b text-sm font-semibold text-gray-800">
                        {group.label}
                      </div>
                      <div className="divide-y">
                        {group.items.map((transaktion) => (
                          <div key={transaktion._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                            <div className="h-10 w-10 rounded-full border bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                              {transaktion.typ === 'einnahme' ? 'E' : 'A'}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 truncate">
                                  {transaktion.beschreibung}
                                </span>
                                {getTypBadge(transaktion.typ)}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                {transaktion.kategorieName && (
                                  <Badge variant="outline" className="text-gray-700 border-gray-300">
                                    {transaktion.kategorieName}
                                  </Badge>
                                )}
                                {transaktion.kundeName && <span>👤 {transaktion.kundeName}</span>}
                                {transaktion.projektName && <span>📁 {transaktion.projektName}</span>}
                                {transaktion.rechnungsnummer && <span>📄 {transaktion.rechnungsnummer}</span>}
                                {transaktion.dokumente && transaktion.dokumente.length > 0 && (
                                  <Badge variant="outline" className="gap-1 text-gray-700 border-gray-300">
                                    <FileText className="h-3 w-3" />
                                    {transaktion.dokumente.length}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className={cn(
                                'font-semibold text-base',
                                transaktion.typ === 'einnahme' ? 'text-green-700' : 'text-red-700'
                              )}>
                                {transaktion.typ === 'einnahme' ? '+' : '-'}
                                {formatCurrency(transaktion.betrag)}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {getZahlungsartLabel(transaktion.zahlungsart)}
                              </div>
                              <div className="mt-1 flex items-center gap-2 justify-end">
                                {transaktion.status && getStatusBadge(transaktion.status)}
                                {getQuelleBadge(transaktion.quelle || 'unbekannt')}
                              </div>
                            </div>

                            <div className="pl-2">
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
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Footer mit Anzahl */}
            {filteredTransaktionen.length > 0 && (
              <div className="flex-shrink-0 px-4 py-2 border-t bg-gray-100 text-sm text-gray-900 font-medium text-right">
                {filteredTransaktionen.length} von {transaktionen.length} Transaktionen
              </div>
            )}
          </div>
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

