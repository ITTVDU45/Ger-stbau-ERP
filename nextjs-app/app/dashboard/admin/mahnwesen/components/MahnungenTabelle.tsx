'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Eye, Edit, Trash2, MoreVertical, Search, CheckCircle, Send, XCircle, FileWarning } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import FolgemahnungErstellenDialog from './FolgemahnungErstellenDialog'

interface Mahnung {
  _id: string
  mahnungsnummer: string
  kundeName: string
  projektName: string
  projektId: string
  rechnungId: string
  rechnungsnummer?: string
  datum: Date | string
  faelligAm: Date | string
  mahnstufe: 1 | 2 | 3
  status: string
  genehmigung?: {
    status: string
  }
  gesamtforderung: number
  offenerBetrag?: number
}

interface MahnungenTabelleProps {
  mahnungen: Mahnung[]
  onDelete?: (id: string) => void
  onRefresh?: () => void
}

export default function MahnungenTabelle({
  mahnungen,
  onDelete,
  onRefresh
}: MahnungenTabelleProps) {
  const router = useRouter()
  const [suchbegriff, setSuchbegriff] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [mahnstufeFilter, setMahnstufeFilter] = useState<string>('alle')
  const [sortierung, setSortierung] = useState<'datum' | 'mahnstufe' | 'betrag'>('datum')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [folgemahnungDialogOpen, setFolgemahnungDialogOpen] = useState(false)
  const [selectedMahnungForFolge, setSelectedMahnungForFolge] = useState<Mahnung | null>(null)

  // Filterung
  const gefilterteMahnungen = mahnungen.filter((mahnung) => {
    const matchSuche =
      suchbegriff === '' ||
      mahnung.kundeName.toLowerCase().includes(suchbegriff.toLowerCase()) ||
      mahnung.mahnungsnummer.toLowerCase().includes(suchbegriff.toLowerCase()) ||
      mahnung.projektName?.toLowerCase().includes(suchbegriff.toLowerCase())

    const matchStatus =
      statusFilter === 'alle' || mahnung.status === statusFilter

    const matchMahnstufe =
      mahnstufeFilter === 'alle' ||
      mahnung.mahnstufe.toString() === mahnstufeFilter

    return matchSuche && matchStatus && matchMahnstufe
  })

  // Sortierung
  const sortierteMahnungen = [...gefilterteMahnungen].sort((a, b) => {
    switch (sortierung) {
      case 'datum':
        return new Date(b.datum).getTime() - new Date(a.datum).getTime()
      case 'mahnstufe':
        return b.mahnstufe - a.mahnstufe
      case 'betrag':
        return b.gesamtforderung - a.gesamtforderung
      default:
        return 0
    }
  })

  const handleDelete = async (id: string, mahnungsnummer: string) => {
    if (!confirm(`Mahnung ${mahnungsnummer} wirklich löschen?`)) return

    try {
      const response = await fetch(`/api/mahnwesen/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Mahnung gelöscht')
        onDelete?.(id)
        onRefresh?.()
      } else {
        toast.error(data.fehler || 'Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen der Mahnung')
    }
  }

  const handleFolgemahnung = (mahnung: Mahnung) => {
    if (mahnung.mahnstufe >= 3) {
      toast.error('Maximale Mahnstufe 3 erreicht')
      return
    }

    setSelectedMahnungForFolge(mahnung)
    setFolgemahnungDialogOpen(true)
  }

  const handleFolgemahnungSuccess = () => {
    onRefresh?.()
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      erstellt: { label: 'Erstellt', variant: 'secondary' },
      zur_genehmigung: { label: 'Zur Genehmigung', variant: 'default' },
      genehmigt: { label: 'Genehmigt', variant: 'default' },
      abgelehnt: { label: 'Abgelehnt', variant: 'destructive' },
      versendet: { label: 'Versendet', variant: 'default' },
      bezahlt: { label: 'Bezahlt', variant: 'default' },
      storniert: { label: 'Storniert', variant: 'secondary' }
    }

    const c = config[status] || { label: status, variant: 'secondary' }
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  const getGenehmigungBadge = (genehmigung?: { status: string }) => {
    if (!genehmigung) return null

    const config: Record<string, { label: string; className: string }> = {
      ausstehend: {
        label: 'Ausstehend',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-300'
      },
      genehmigt: {
        label: 'Genehmigt',
        className: 'bg-green-50 text-green-700 border-green-300'
      },
      abgelehnt: {
        label: 'Abgelehnt',
        className: 'bg-red-50 text-red-700 border-red-300'
      }
    }

    const c = config[genehmigung.status] || config.ausstehend
    return (
      <Badge variant="outline" className={c.className}>
        {c.label}
      </Badge>
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = new Set(sortierteMahnungen.map((m) => m._id))
      setSelectedIds(ids)
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleBatchAction = async (aktion: string) => {
    if (selectedIds.size === 0) {
      toast.error('Bitte wählen Sie mindestens eine Mahnung aus')
      return
    }

    const mahnungIds = Array.from(selectedIds)

    if (
      !confirm(
        `Möchten Sie wirklich ${mahnungIds.length} Mahnung(en) ${aktion === 'genehmigen' ? 'genehmigen' : aktion === 'ablehnen' ? 'ablehnen' : 'versenden'}?`
      )
    ) {
      return
    }

    try {
      setProcessing(true)

      let endpoint = ''
      let body: any = {}

      if (aktion === 'genehmigen' || aktion === 'ablehnen') {
        endpoint = '/api/mahnwesen/batch/genehmigen'
        body = { mahnungIds, aktion }
      } else if (aktion === 'versenden') {
        endpoint = '/api/mahnwesen/batch/versenden'
        body = { mahnungIds, versandart: 'pdf_download' }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success(data.nachricht)
        if (data.ergebnisse.fehler.length > 0) {
          console.error('Fehler bei Massenverarbeitung:', data.ergebnisse.fehler)
        }
        setSelectedIds(new Set())
        onRefresh?.()
      } else {
        toast.error(data.fehler || 'Fehler bei der Verarbeitung')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler bei der Verarbeitung')
    } finally {
      setProcessing(false)
    }
  }

  const getMahnstufeColor = (mahnstufe: number) => {
    switch (mahnstufe) {
      case 1:
        return 'bg-yellow-50 text-yellow-700 border-yellow-300'
      case 2:
        return 'bg-orange-50 text-orange-700 border-orange-300'
      case 3:
        return 'bg-red-50 text-red-700 border-red-300'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-300'
    }
  }

  return (
    <div className="space-y-4">
      {/* Massenaktionen-Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {selectedIds.size} Mahnung(en) ausgewählt
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction('genehmigen')}
              disabled={processing}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Alle genehmigen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction('ablehnen')}
              disabled={processing}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Alle ablehnen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction('versenden')}
              disabled={processing}
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <Send className="h-4 w-4 mr-2" />
              Alle versenden
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={processing}
            >
              Auswahl aufheben
            </Button>
          </div>
        </div>
      )}

      {/* Filter-Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Suche nach Kunde, Mahnung oder Projekt..."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            <SelectItem value="erstellt">Erstellt</SelectItem>
            <SelectItem value="zur_genehmigung">Zur Genehmigung</SelectItem>
            <SelectItem value="genehmigt">Genehmigt</SelectItem>
            <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
            <SelectItem value="versendet">Versendet</SelectItem>
            <SelectItem value="bezahlt">Bezahlt</SelectItem>
          </SelectContent>
        </Select>

        <Select value={mahnstufeFilter} onValueChange={setMahnstufeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Mahnstufe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Mahnstufen</SelectItem>
            <SelectItem value="1">Mahnstufe 1</SelectItem>
            <SelectItem value="2">Mahnstufe 2</SelectItem>
            <SelectItem value="3">Mahnstufe 3</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortierung} onValueChange={(v: any) => setSortierung(v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sortierung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="datum">Nach Datum</SelectItem>
            <SelectItem value="mahnstufe">Nach Mahnstufe</SelectItem>
            <SelectItem value="betrag">Nach Betrag</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabelle */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 border-b border-gray-300">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    sortierteMahnungen.length > 0 &&
                    selectedIds.size === sortierteMahnungen.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-bold text-gray-900">Kunde</TableHead>
              <TableHead className="font-bold text-gray-900">Projekt</TableHead>
              <TableHead className="font-bold text-gray-900">Mahnung-Nr.</TableHead>
              <TableHead className="font-bold text-gray-900">Datum</TableHead>
              <TableHead className="font-bold text-gray-900">Fällig am</TableHead>
              <TableHead className="font-bold text-gray-900">Mahnstufe</TableHead>
              <TableHead className="font-bold text-gray-900">Status</TableHead>
              <TableHead className="font-bold text-gray-900">Genehmigung</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Betrag</TableHead>
              <TableHead className="text-center font-bold text-gray-900">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortierteMahnungen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                  Keine Mahnungen gefunden
                </TableCell>
              </TableRow>
            ) : (
              sortierteMahnungen.map((mahnung) => (
                <TableRow key={mahnung._id} className="hover:bg-gray-50 border-b border-gray-200">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(mahnung._id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(mahnung._id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {mahnung.kundeName}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {mahnung.projektName || '-'}
                  </TableCell>
                  <TableCell className="text-gray-700 font-mono text-sm">
                    {mahnung.mahnungsnummer}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(mahnung.datum), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(mahnung.faelligAm), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getMahnstufeColor(mahnung.mahnstufe)}
                    >
                      Stufe {mahnung.mahnstufe}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(mahnung.status)}</TableCell>
                  <TableCell>{getGenehmigungBadge(mahnung.genehmigung)}</TableCell>
                  <TableCell className="text-right font-semibold text-gray-900">
                    {mahnung.gesamtforderung.toLocaleString('de-DE', {
                      minimumFractionDigits: 2
                    })}{' '}
                    €
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/dashboard/admin/mahnwesen/${mahnung._id}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ansehen
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/dashboard/admin/rechnungen/${mahnung.rechnungId}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Rechnung ansehen
                        </DropdownMenuItem>
                        {mahnung.status === 'versendet' && mahnung.mahnstufe < 3 && (
                          <DropdownMenuItem
                            onClick={() => handleFolgemahnung(mahnung)}
                            className="text-orange-600"
                          >
                            <FileWarning className="h-4 w-4 mr-2" />
                            Mahnung {mahnung.mahnstufe + 1} erstellen
                          </DropdownMenuItem>
                        )}
                        {mahnung.status !== 'versendet' && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/dashboard/admin/mahnwesen/${mahnung._id}`)
                              }
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleDelete(mahnung._id, mahnung.mahnungsnummer)
                              }
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Ergebnis-Anzeige */}
      <div className="text-sm text-gray-900 font-medium">
        {sortierteMahnungen.length} von {mahnungen.length} Mahnungen angezeigt
      </div>

      {/* Folgemahnung Erstellen Dialog */}
      {selectedMahnungForFolge && (
        <FolgemahnungErstellenDialog
          open={folgemahnungDialogOpen}
          onOpenChange={setFolgemahnungDialogOpen}
          parentMahnungId={selectedMahnungForFolge._id}
          aktuellerMahnstufe={selectedMahnungForFolge.mahnstufe}
          kundeName={selectedMahnungForFolge.kundeName}
          rechnungsnummer={selectedMahnungForFolge.rechnungsnummer || 'N/A'}
          offenerBetrag={selectedMahnungForFolge.offenerBetrag || selectedMahnungForFolge.gesamtforderung}
          parentMahnungDatum={selectedMahnungForFolge.datum ? new Date(selectedMahnungForFolge.datum) : undefined}
          parentMahnungFaelligAm={selectedMahnungForFolge.faelligAm ? new Date(selectedMahnungForFolge.faelligAm) : undefined}
          parentMahnungVersandtAm={selectedMahnungForFolge.versandtAm ? new Date(selectedMahnungForFolge.versandtAm) : undefined}
          onSuccess={handleFolgemahnungSuccess}
        />
      )}
    </div>
  )
}

