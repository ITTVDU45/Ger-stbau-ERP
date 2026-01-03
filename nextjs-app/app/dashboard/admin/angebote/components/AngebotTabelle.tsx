"use client"

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Eye, Send, CheckCircle } from 'lucide-react'
import { Angebot } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import StatusAenderungDialog from './StatusAenderungDialog'

interface AngebotTabelleProps {
  angebote: Angebot[]
  loading: boolean
  onLoeschen: (angebot: Angebot) => void
  onUpdate?: () => void
}

export default function AngebotTabelle({
  angebote,
  loading,
  onLoeschen,
  onUpdate
}: AngebotTabelleProps) {
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      entwurf: { variant: 'secondary', label: 'Entwurf' },
      gesendet: { variant: 'default', label: 'Gesendet', class: 'bg-blue-600' },
      angenommen: { variant: 'default', label: 'Angenommen', class: 'bg-green-600' },
      abgelehnt: { variant: 'destructive', label: 'Abgelehnt' },
      abgelaufen: { variant: 'outline', label: 'Abgelaufen' }
    }
    const config = variants[status] || { variant: 'default', label: status }
    return <Badge variant={config.variant as any} className={config.class}>{config.label}</Badge>
  }

  const getTypBadge = (typ?: 'dachdecker' | 'maler' | 'bauunternehmen') => {
    if (!typ) return <span className="text-xs text-gray-500">-</span>
    
    const variants: Record<string, any> = {
      dachdecker: { label: 'Dachdecker', class: 'bg-orange-100 text-orange-800 border-orange-300' },
      maler: { label: 'Maler', class: 'bg-purple-100 text-purple-800 border-purple-300' },
      bauunternehmen: { label: 'Bauunternehmen', class: 'bg-teal-100 text-teal-800 border-teal-300' }
    }
    const config = variants[typ] || { label: typ, class: '' }
    return <Badge variant="outline" className={config.class}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-gray-500">Lade Angebote...</p></div>
  }

  if (angebote.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">Keine Angebote gefunden</p></div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-gray-900">Angebotsnr.</TableHead>
            <TableHead className="text-gray-900">Kunde</TableHead>
            <TableHead className="text-gray-900">Typ</TableHead>
            <TableHead className="text-gray-900">Datum</TableHead>
            <TableHead className="text-gray-900">Gültig bis</TableHead>
            <TableHead className="text-gray-900">Positionen</TableHead>
            <TableHead className="text-gray-900">Summe (Brutto)</TableHead>
            <TableHead className="text-gray-900">Status</TableHead>
            <TableHead className="text-right text-gray-900">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {angebote.map((a) => (
            <TableRow key={a._id}>
              <TableCell className="font-medium text-gray-900">{a.angebotsnummer}</TableCell>
              <TableCell className="text-gray-900">{a.kundeName}</TableCell>
              <TableCell>{getTypBadge(a.angebotTyp)}</TableCell>
              <TableCell className="text-sm text-gray-700">
                {a.datum ? format(new Date(a.datum), 'dd.MM.yyyy', { locale: de }) : '-'}
              </TableCell>
              <TableCell className="text-sm text-gray-700">
                {a.gueltigBis ? format(new Date(a.gueltigBis), 'dd.MM.yyyy', { locale: de }) : '-'}
              </TableCell>
              <TableCell className="text-sm text-gray-700">{a.positionen.length}</TableCell>
              <TableCell className="font-semibold text-gray-900">{a.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</TableCell>
              <TableCell>{getStatusBadge(a.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {/* Status ändern - Nur für gesendete Angebote */}
                  {(a.status === 'gesendet' || a.status === 'angenommen') && onUpdate && (
                    <StatusAenderungDialog angebot={a} onUpdate={onUpdate}>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </StatusAenderungDialog>
                  )}
                  
                  {/* Bearbeiten */}
                  <Button variant="ghost" size="sm" asChild className="text-gray-700 hover:text-gray-900">
                    <Link href={`/dashboard/admin/angebote/neu?id=${a._id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  
                  {/* Löschen */}
                  <Button variant="ghost" size="sm" onClick={() => onLoeschen(a)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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

