'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Projekt } from '@/lib/db/types'
import { FileText, Plus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import RechnungErstellenDialog from './RechnungErstellenDialog'

interface ProjektRechnungenTabProps {
  projekt: Projekt
  onProjektUpdated: () => void
}

export default function ProjektRechnungenTab({ projekt, onProjektUpdated }: ProjektRechnungenTabProps) {
  const router = useRouter()
  const [rechnungen, setRechnungen] = useState<any[]>([])
  const [angebote, setAngebote] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadRechnungen()
    loadAngebote()
  }, [projekt._id])

  const loadRechnungen = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projekte/${projekt._id}/rechnungen`)
      const data = await response.json()
      
      if (data.erfolg) {
        setRechnungen(data.rechnungen)
      } else {
        toast.error('Fehler beim Laden der Rechnungen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const loadAngebote = async () => {
    try {
      const response = await fetch(`/api/projekte/${projekt._id}/angebote`)
      const data = await response.json()
      
      if (data.erfolg) {
        setAngebote(data.angebote)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Angebote:', error)
    }
  }

  const getStatusBadge = (rechnung: any) => {
    const status = rechnung.status
    const config: any = {
      entwurf: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Entwurf' },
      gesendet: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Gesendet' },
      offen: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Offen' },
      bezahlt: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Bezahlt' },
      teilweise_bezahlt: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'Teilweise bezahlt' },
      ueberfaellig: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Überfällig' },
      storniert: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Storniert' },
    }
    const c = config[status] || config.entwurf
    
    // Status-Badge
    const statusBadge = <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>{c.label}</Badge>
    
    // Mahnung-Badge hinzufügen, wenn offene Mahnung existiert
    if (rechnung.hatOffeneMahnung && rechnung.status !== 'bezahlt') {
      return (
        <div className="flex flex-col gap-1">
          {statusBadge}
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" />
            Mahnung offen
          </Badge>
        </div>
      )
    }
    
    return statusBadge
  }

  const getTypBadge = (typ: string) => {
    return typ === 'teilrechnung' 
      ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Teilrechnung</Badge>
      : <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Schlussrechnung</Badge>
  }

  // Prüft, ob es angenommene Angebote gibt, die diesem Projekt zugewiesen sind
  const hatAngenommenesAngebot = () => {
    if (projekt.angebotId) return true
    return angebote.some(a => a.projektId === projekt._id && a.status === 'angenommen')
  }

  return (
    <div className="space-y-6">
      {/* Header mit Button */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Rechnungen</CardTitle>
            {hatAngenommenesAngebot() ? (
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Neue Rechnung erstellen
              </Button>
            ) : (
              <div className="text-sm text-gray-600">
                <p>Erst ein Angebot zuweisen, um Rechnungen zu erstellen</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : rechnungen.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Noch keine Rechnungen erstellt</p>
              {hatAngenommenesAngebot() && (
                <p className="text-sm text-gray-500 mt-1">
                  Erstellen Sie eine Teil- oder Schlussrechnung aus dem zugewiesenen Angebot
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900">Rechnungsnr.</TableHead>
                  <TableHead className="text-gray-900">Datum</TableHead>
                  <TableHead className="text-gray-900">Fällig am</TableHead>
                  <TableHead className="text-gray-900">Typ</TableHead>
                  <TableHead className="text-gray-900 text-right">Betrag (Brutto)</TableHead>
                  <TableHead className="text-gray-900">Status</TableHead>
                  <TableHead className="text-gray-900 text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rechnungen.map((rechnung) => (
                  <TableRow key={rechnung._id}>
                    <TableCell className="font-medium text-gray-900">{rechnung.rechnungsnummer}</TableCell>
                    <TableCell className="text-gray-700">
                      {rechnung.datum ? format(new Date(rechnung.datum), 'dd.MM.yyyy', { locale: de }) : '-'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {rechnung.faelligkeitsdatum 
                        ? format(new Date(rechnung.faelligkeitsdatum), 'dd.MM.yyyy', { locale: de })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getTypBadge(rechnung.typ)}</TableCell>
                    <TableCell className="text-gray-900 font-semibold text-right">
                      {rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </TableCell>
                    <TableCell>{getStatusBadge(rechnung)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/dashboard/admin/rechnungen/${rechnung._id}`)}
                        className="text-gray-700 hover:text-gray-900"
                      >
                        Ansehen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Zusammenfassung mit Projekt-KPIs */}
      {rechnungen.length > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Anzahl Rechnungen</p>
                <p className="text-2xl font-bold text-gray-900">{rechnungen.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gesamtbetrag</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rechnungen.reduce((sum, r) => sum + r.brutto, 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Summe bezahlt</p>
                <p className="text-2xl font-bold text-green-700">
                  {rechnungen
                    .filter(r => r.status === 'bezahlt')
                    .reduce((sum, r) => sum + r.brutto, 0)
                    .toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Summe offen</p>
                <p className="text-2xl font-bold text-orange-700">
                  {rechnungen
                    .filter(r => r.status !== 'bezahlt' && r.status !== 'storniert')
                    .reduce((sum, r) => {
                      if (r.status === 'teilweise_bezahlt' && r.bezahltBetrag) {
                        return sum + (r.brutto - r.bezahltBetrag)
                      }
                      return sum + r.brutto
                    }, 0)
                    .toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <RechnungErstellenDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projekt={projekt}
        onRechnungErstellt={() => {
          setDialogOpen(false)
          onProjektUpdated()
          loadRechnungen()
        }}
      />
    </div>
  )
}

