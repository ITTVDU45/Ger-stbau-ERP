'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Eye, Trash2, Home, Layers, Building2, Wrench } from 'lucide-react'
import { Projekt, Anfrage } from '@/lib/db/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import AngebotErstellenDialog from '../../anfragen/components/AngebotErstellenDialog'

interface ProjektAnfragenTabProps {
  projekt: Projekt
  onProjektUpdated: () => void
}

export default function ProjektAnfragenTab({ projekt, onProjektUpdated }: ProjektAnfragenTabProps) {
  const [anfragen, setAnfragen] = useState<Anfrage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnfragen()
  }, [projekt])

  const loadAnfragen = async () => {
    if (!projekt.anfrageIds || projekt.anfrageIds.length === 0) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Lade alle Anfragen für dieses Projekt
      const anfragenPromises = projekt.anfrageIds.map(anfrageId =>
        fetch(`/api/anfragen/${anfrageId}`).then(res => res.json())
      )

      const results = await Promise.all(anfragenPromises)
      const geladeneAnfragen = results
        .filter(r => r.erfolg)
        .map(r => r.anfrage)

      setAnfragen(geladeneAnfragen)
    } catch (error) {
      console.error('Fehler beim Laden der Anfragen:', error)
      toast.error('Fehler beim Laden der Anfragen')
    } finally {
      setLoading(false)
    }
  }

  const handleAnfrageEntfernen = async (anfrageId: string) => {
    if (!confirm('Möchten Sie diese Anfrage wirklich vom Projekt entfernen?')) {
      return
    }

    try {
      const response = await fetch(`/api/projekte/${projekt._id}/anfrage-entfernen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anfrageId })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Anfrage entfernt')
        loadAnfragen()
        onProjektUpdated()
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Entfernen der Anfrage')
    }
  }

  const getStatusBadge = (status: Anfrage['status']) => {
    switch (status) {
      case 'offen':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Offen</Badge>
      case 'in_bearbeitung':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">In Bearbeitung</Badge>
      case 'angebot_in_bearbeitung':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Angebot in Bearbeitung</Badge>
      case 'angebot_erstellt':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Angebot versendet</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Unbekannt</Badge>
    }
  }

  const getArbeitstypenBadges = (artDerArbeiten: Anfrage['artDerArbeiten']) => {
    const badges = []
    
    if (artDerArbeiten.dachdecker) {
      badges.push(
        <Badge key="dachdecker" variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 flex items-center gap-1">
          <Home className="h-3 w-3" />
          Dachdecker
        </Badge>
      )
    }
    
    if (artDerArbeiten.fassade) {
      badges.push(
        <Badge key="fassade" variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          Fassade
        </Badge>
      )
    }
    
    if (artDerArbeiten.daemmung) {
      badges.push(
        <Badge key="daemmung" variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 flex items-center gap-1">
          <Layers className="h-3 w-3" />
          Dämmung
        </Badge>
      )
    }
    
    if (artDerArbeiten.sonstige) {
      badges.push(
        <Badge key="sonstige" variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 flex items-center gap-1">
          <Wrench className="h-3 w-3" />
          {artDerArbeiten.sonstigeText || 'Sonstige'}
        </Badge>
      )
    }
    
    return badges
  }

  const getGeruestseiten = (geruestseiten: Anfrage['geruestseiten']) => {
    const seiten = []
    if (geruestseiten.vorderseite) seiten.push('Vorderseite')
    if (geruestseiten.rueckseite) seiten.push('Rückseite')
    if (geruestseiten.rechteSeite) seiten.push('Rechts')
    if (geruestseiten.linkeSeite) seiten.push('Links')
    return seiten.join(', ') || '-'
  }

  if (loading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="py-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (anfragen.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Anfragen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Keine Anfragen zugewiesen</p>
            <p className="text-sm text-gray-500 mt-1">
              Anfragen können über die Anfragen-Übersicht diesem Projekt zugewiesen werden.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900">
          Anfragen ({anfragen.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-gray-200 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-900">Anfragenr.</TableHead>
                <TableHead className="text-gray-900">Kunde</TableHead>
                <TableHead className="text-gray-900">Bauvorhaben</TableHead>
                <TableHead className="text-gray-900">Art der Arbeiten</TableHead>
                <TableHead className="text-gray-900">Gerüstseiten</TableHead>
                <TableHead className="text-gray-900">Fläche</TableHead>
                <TableHead className="text-gray-900">Status</TableHead>
                <TableHead className="text-gray-900">Erstellt</TableHead>
                <TableHead className="text-right text-gray-900">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anfragen.map((anfrage) => (
                <TableRow key={anfrage._id} className="border-gray-200">
                  <TableCell className="font-medium text-gray-900">
                    <Link 
                      href={`/dashboard/admin/anfragen/${anfrage._id}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {anfrage.anfragenummer}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-900">{anfrage.kundeName}</TableCell>
                  <TableCell className="text-gray-700">
                    {anfrage.bauvorhaben.objektname || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getArbeitstypenBadges(anfrage.artDerArbeiten)}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700 text-sm">
                    {getGeruestseiten(anfrage.geruestseiten)}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {anfrage.geruestseiten.gesamtflaeche 
                      ? `${anfrage.geruestseiten.gesamtflaeche} m²`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(anfrage.status)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {anfrage.erstelltAm 
                      ? format(new Date(anfrage.erstelltAm), 'dd.MM.yyyy', { locale: de })
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <Link href={`/dashboard/admin/anfragen/${anfrage._id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      
                      {anfrage.status !== 'angebot_erstellt' && anfrage.status !== 'angebot_in_bearbeitung' && (
                        <AngebotErstellenDialog
                          anfrageId={anfrage._id!}
                          anfragenummer={anfrage.anfragenummer}
                          kundeName={anfrage.kundeName}
                          onSuccess={() => {
                            loadAnfragen()
                            onProjektUpdated()
                          }}
                        >
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Angebot erstellen"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </AngebotErstellenDialog>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleAnfrageEntfernen(anfrage._id!)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Vom Projekt entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

