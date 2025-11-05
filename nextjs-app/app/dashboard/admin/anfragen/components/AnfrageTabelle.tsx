'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, FileText, Home, Layers, Building2, Wrench, Briefcase } from 'lucide-react'
import { Anfrage } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import AngebotErstellenDialog from './AngebotErstellenDialog'
import AnfrageProjektZuweisenDialog from './AnfrageProjektZuweisenDialog'

interface AnfrageTabelleProps {
  anfragen: Anfrage[]
  onLoeschen: (id: string) => void
  onReload: () => void
}

export default function AnfrageTabelle({ anfragen, onLoeschen, onReload }: AnfrageTabelleProps) {
  const router = useRouter()

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
          Sonstige
        </Badge>
      )
    }
    
    return badges
  }


  if (anfragen.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Keine Anfragen gefunden</p>
        <p className="text-sm text-gray-500 mt-1">Erstellen Sie eine neue Anfrage, um zu beginnen</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-gray-200 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-gray-900 font-semibold">Anfragenr.</TableHead>
            <TableHead className="text-gray-900 font-semibold">Kunde</TableHead>
            <TableHead className="text-gray-900 font-semibold">Ansprechpartner</TableHead>
            <TableHead className="text-gray-900 font-semibold">Bauvorhaben</TableHead>
            <TableHead className="text-gray-900 font-semibold">Art der Arbeiten</TableHead>
            <TableHead className="text-gray-900 font-semibold">Status</TableHead>
            <TableHead className="text-gray-900 font-semibold">Erstelldatum</TableHead>
            <TableHead className="text-gray-900 font-semibold">Verantwortlich</TableHead>
            <TableHead className="text-right text-gray-900 font-semibold">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {anfragen.map((anfrage) => (
            <TableRow 
              key={anfrage._id} 
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/dashboard/admin/anfragen/${anfrage._id}`)}
            >
              <TableCell className="font-medium text-gray-900">
                {anfrage.anfragenummer}
              </TableCell>
              <TableCell className="text-gray-900">
                {anfrage.kundeName}
              </TableCell>
              <TableCell className="text-gray-700">
                {anfrage.ansprechpartner || '-'}
              </TableCell>
              <TableCell className="text-gray-900">
                <div className="max-w-xs truncate">
                  {anfrage.bauvorhaben.objektname || 'Kein Objektname'}
                </div>
                <div className="text-xs text-gray-600">
                  {anfrage.bauvorhaben.ort || ''}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {getArbeitstypenBadges(anfrage.artDerArbeiten)}
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(anfrage.status)}
              </TableCell>
              <TableCell className="text-sm text-gray-700">
                {anfrage.erstelltAm ? format(new Date(anfrage.erstelltAm), 'dd.MM.yyyy', { locale: de }) : '-'}
              </TableCell>
              <TableCell className="text-gray-700">
                {anfrage.zustaendig || '-'}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    asChild
                    className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Link href={`/dashboard/admin/anfragen/neu?id=${anfrage._id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  
                  {anfrage.status !== 'angebot_erstellt' && anfrage.status !== 'angebot_in_bearbeitung' && (
                    <AngebotErstellenDialog
                      anfrageId={anfrage._id!}
                      anfragenummer={anfrage.anfragenummer}
                      kundeName={anfrage.kundeName}
                      onSuccess={onReload}
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
                  
                  {!anfrage.projektId && (
                    <AnfrageProjektZuweisenDialog
                      anfrageId={anfrage._id!}
                      anfragenummer={anfrage.anfragenummer}
                      kundeName={anfrage.kundeName}
                      kundeId={anfrage.kundeId}
                      onSuccess={onReload}
                    >
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Zum Projekt zuweisen"
                      >
                        <Briefcase className="h-4 w-4" />
                      </Button>
                    </AnfrageProjektZuweisenDialog>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onLoeschen(anfrage._id!)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
  )
}

