'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Projekt } from '@/lib/db/types'
import { Package, CheckCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import AngebotZuweisenDialog from './AngebotZuweisenDialog'

interface ProjektAngeboteTabProps {
  projekt: Projekt
  onProjektUpdated: () => void
}

export default function ProjektAngeboteTab({ projekt, onProjektUpdated }: ProjektAngeboteTabProps) {
  const router = useRouter()
  const [angebote, setAngebote] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadAngebote()
  }, [projekt._id])

  const loadAngebote = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projekte/${projekt._id}/angebote`)
      const data = await response.json()
      
      if (data.erfolg) {
        setAngebote(data.angebote)
      } else {
        toast.error('Fehler beim Laden der Angebote')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: any = {
      entwurf: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Entwurf' },
      gesendet: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Gesendet' },
      angenommen: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Angenommen' },
      abgelehnt: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Abgelehnt' },
    }
    const c = config[status] || config.entwurf
    return <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>{c.label}</Badge>
  }

  const angenommeneAngebote = angebote.filter(a => a.status === 'angenommen' && !a.projektId)
  const zugewiesenesAngebot = angebote.find(a => a._id === projekt.angebotId)

  return (
    <div className="space-y-6">
      {/* Zugewiesenes Angebot hervorheben */}
      {zugewiesenesAngebot && (
        <Card className="bg-green-50 border-green-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Zugewiesenes Angebot
              </CardTitle>
              {getStatusBadge(zugewiesenesAngebot.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-green-700">Angebotsnummer</p>
                <p className="text-lg font-bold text-green-900">{zugewiesenesAngebot.angebotsnummer}</p>
              </div>
              <div>
                <p className="text-sm text-green-700">Datum</p>
                <p className="text-lg font-bold text-green-900">
                  {format(new Date(zugewiesenesAngebot.datum), 'dd.MM.yyyy', { locale: de })}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Positionen</p>
                <p className="text-lg font-bold text-green-900">{zugewiesenesAngebot.positionen?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-green-700">Summe (Brutto)</p>
                <p className="text-lg font-bold text-green-900">
                  {zugewiesenesAngebot.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </p>
              </div>
            </div>

            {/* Angebotspositionen */}
            {zugewiesenesAngebot.positionen && zugewiesenesAngebot.positionen.length > 0 && (
              <div className="mt-4 border-t border-green-200 pt-4">
                <h4 className="text-sm font-semibold text-green-900 mb-3">Angebotspositionen</h4>
                <div className="bg-white rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-900">Position</TableHead>
                        <TableHead className="text-gray-900">Beschreibung</TableHead>
                        <TableHead className="text-gray-900 text-right">Menge</TableHead>
                        <TableHead className="text-gray-900 text-right">Einzelpreis</TableHead>
                        <TableHead className="text-gray-900 text-right">Gesamt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zugewiesenesAngebot.positionen.map((pos: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="text-gray-900">{pos.position || index + 1}</TableCell>
                          <TableCell className="text-gray-900">{pos.beschreibung}</TableCell>
                          <TableCell className="text-gray-700 text-right">{pos.menge} {pos.einheit}</TableCell>
                          <TableCell className="text-gray-700 text-right">
                            {pos.einzelpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </TableCell>
                          <TableCell className="text-gray-900 font-semibold text-right">
                            {pos.gesamtpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Button zum Zuweisen eines Angebots */}
      {!projekt.angebotId && angenommeneAngebote.length > 0 && (
        <Card className="bg-blue-50 border-blue-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Noch kein Angebot zugewiesen</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Es gibt {angenommeneAngebote.length} angenommene{angenommeneAngebote.length === 1 ? 's' : ''} Angebot{angenommeneAngebote.length === 1 ? '' : 'e'}, das/die diesem Projekt zugewiesen werden kann/können.
                </p>
              </div>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Package className="mr-2 h-4 w-4" />
                Angebot zuweisen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alle Angebote anzeigen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Alle Angebote des Kunden</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : angebote.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Keine Angebote vorhanden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900">Angebotsnr.</TableHead>
                  <TableHead className="text-gray-900">Datum</TableHead>
                  <TableHead className="text-gray-900">Gültig bis</TableHead>
                  <TableHead className="text-gray-900 text-right">Summe (Brutto)</TableHead>
                  <TableHead className="text-gray-900">Status</TableHead>
                  <TableHead className="text-gray-900">Projekt</TableHead>
                  <TableHead className="text-gray-900 text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {angebote.map((angebot) => (
                  <TableRow 
                    key={angebot._id}
                    className={angebot._id === projekt.angebotId ? 'bg-green-50' : ''}
                  >
                    <TableCell className="font-medium text-gray-900">{angebot.angebotsnummer}</TableCell>
                    <TableCell className="text-gray-700">
                      {format(new Date(angebot.datum), 'dd.MM.yyyy', { locale: de })}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {angebot.gueltigBis 
                        ? format(new Date(angebot.gueltigBis), 'dd.MM.yyyy', { locale: de })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-gray-900 font-semibold text-right">
                      {angebot.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </TableCell>
                    <TableCell>{getStatusBadge(angebot.status)}</TableCell>
                    <TableCell className="text-gray-700">
                      {angebot.projektId 
                        ? (angebot.projektId === projekt._id ? '✓ Dieses Projekt' : 'Anderes Projekt')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/angebote/neu?id=${angebot._id}`)}
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                        title="Angebot ansehen"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog zum Zuweisen */}
      <AngebotZuweisenDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projekt={projekt}
        angebote={angenommeneAngebote}
        onAngebotZugewiesen={() => {
          setDialogOpen(false)
          onProjektUpdated()
          loadAngebote()
        }}
      />
    </div>
  )
}

