'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileWarning, Plus, ExternalLink, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import { Mahnung } from '@/lib/db/types'

interface MahnungenBereichProps {
  rechnungId: string
  rechnungStatus: string
  rechnungBrutto: number
}

export default function MahnungenBereich({ 
  rechnungId, 
  rechnungStatus, 
  rechnungBrutto 
}: MahnungenBereichProps) {
  const router = useRouter()
  const [mahnungen, setMahnungen] = useState<Mahnung[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadMahnungen()
  }, [rechnungId])

  const loadMahnungen = async () => {
    try {
      const response = await fetch(`/api/mahnwesen?rechnungId=${rechnungId}`)
      if (response.ok) {
        const data = await response.json()
        setMahnungen(data.mahnungen || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mahnungen:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNeueMahnung = async () => {
    if (rechnungStatus === 'bezahlt') {
      toast.error('Rechnung ist bereits bezahlt. Keine Mahnung möglich.')
      return
    }

    setCreating(true)
    try {
      // Öffne Dialog zum Erstellen einer neuen Mahnung
      router.push(`/dashboard/admin/mahnwesen?createForRechnung=${rechnungId}`)
    } catch (error) {
      toast.error('Fehler beim Erstellen der Mahnung')
    } finally {
      setCreating(false)
    }
  }

  const handleFolgemahnung = async () => {
    if (rechnungStatus === 'bezahlt') {
      toast.error('Rechnung ist bereits bezahlt. Keine Mahnung möglich.')
      return
    }

    // Finde die letzte versendete Mahnung
    const letzteVersendete = mahnungen
      .filter(m => m.status === 'versendet')
      .sort((a, b) => b.mahnstufe - a.mahnstufe)[0]

    if (!letzteVersendete) {
      toast.error('Keine versendete Mahnung gefunden')
      return
    }

    if (letzteVersendete.mahnstufe >= 3) {
      toast.error('Maximale Mahnstufe 3 erreicht')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/mahnwesen/folgemahnung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentMahnungId: letzteVersendete._id })
      })

      const data = await response.json()
      if (data.erfolg) {
        toast.success(`Mahnung ${letzteVersendete.mahnstufe + 1} erfolgreich erstellt`)
        router.push(`/dashboard/admin/mahnwesen/${data.mahnung._id}`)
      } else {
        toast.error(data.fehler || 'Fehler beim Erstellen der Folgemahnung')
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen der Folgemahnung')
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: any = {
      erstellt: { label: 'Erstellt', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
      zur_genehmigung: { label: 'Zur Genehmigung', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
      genehmigt: { label: 'Genehmigt', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
      abgelehnt: { label: 'Abgelehnt', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
      versendet: { label: 'Versendet', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
      settled: { label: 'Erledigt', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
      storniert: { label: 'Storniert', bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-300' }
    }
    const c = config[status] || config.erstellt
    return <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>{c.label}</Badge>
  }

  const getMahnstufeBadge = (mahnstufe: number) => {
    const colors = {
      1: 'bg-yellow-50 text-yellow-700 border-yellow-300',
      2: 'bg-orange-50 text-orange-700 border-orange-300',
      3: 'bg-red-50 text-red-700 border-red-300'
    }
    return (
      <Badge variant="outline" className={colors[mahnstufe as keyof typeof colors]}>
        Mahnung {mahnstufe}
      </Badge>
    )
  }

  const getGenehmigungBadge = (genehmigung: any) => {
    if (!genehmigung) return null
    
    const config: any = {
      ausstehend: { label: 'Ausstehend', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
      genehmigt: { label: 'Genehmigt', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
      abgelehnt: { label: 'Abgelehnt', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' }
    }
    const c = config[genehmigung.status] || config.ausstehend
    return <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>{c.label}</Badge>
  }

  // Prüfe ob Folgemahnung möglich ist
  const letzteVersendete = mahnungen
    .filter(m => m.status === 'versendet')
    .sort((a, b) => b.mahnstufe - a.mahnstufe)[0]
  
  const kannFolgemahnung = letzteVersendete && 
    letzteVersendete.mahnstufe < 3 && 
    rechnungStatus !== 'bezahlt'

  const kannNeueMahnung = (mahnungen.length === 0 || 
    mahnungen.every(m => ['settled', 'storniert'].includes(m.status))) &&
    rechnungStatus !== 'bezahlt'

  if (loading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 font-semibold flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-red-600" />
            Mahnungen zu dieser Rechnung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Lade Mahnungen...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-900 font-semibold flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-red-600" />
            Mahnungen zu dieser Rechnung
          </CardTitle>
          <div className="flex gap-2">
            {kannNeueMahnung && (
              <Button
                onClick={handleNeueMahnung}
                disabled={creating}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neue Mahnung erstellen
              </Button>
            )}
            {kannFolgemahnung && (
              <Button
                onClick={handleFolgemahnung}
                disabled={creating}
                variant="outline"
                size="sm"
                className="border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                <FileWarning className="h-4 w-4 mr-2" />
                Mahnung {letzteVersendete.mahnstufe + 1} erstellen
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mahnungen.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Keine Mahnungen vorhanden</p>
            {kannNeueMahnung && (
              <Button
                onClick={handleNeueMahnung}
                disabled={creating}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Erste Mahnung erstellen
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900">Mahnungsnummer</TableHead>
                  <TableHead className="text-gray-900">Mahnstufe</TableHead>
                  <TableHead className="text-gray-900">Status</TableHead>
                  <TableHead className="text-gray-900">Genehmigung</TableHead>
                  <TableHead className="text-gray-900">Datum</TableHead>
                  <TableHead className="text-gray-900">Fälligkeit</TableHead>
                  <TableHead className="text-gray-900">Betrag</TableHead>
                  <TableHead className="text-gray-900">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mahnungen.map((mahnung) => (
                  <TableRow key={mahnung._id}>
                    <TableCell className="font-medium text-gray-900">
                      {mahnung.mahnungsnummer}
                    </TableCell>
                    <TableCell>
                      {getMahnstufeBadge(mahnung.mahnstufe)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(mahnung.status)}
                    </TableCell>
                    <TableCell>
                      {getGenehmigungBadge(mahnung.genehmigung)}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {format(new Date(mahnung.datum), 'dd.MM.yyyy', { locale: de })}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {format(new Date(mahnung.faelligAm), 'dd.MM.yyyy', { locale: de })}
                    </TableCell>
                    <TableCell className="text-gray-900 font-semibold">
                      {mahnung.gesamtforderung.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/mahnwesen/${mahnung._id}`)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ansehen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

