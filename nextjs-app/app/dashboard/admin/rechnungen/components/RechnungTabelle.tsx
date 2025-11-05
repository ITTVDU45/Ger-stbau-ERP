"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Eye } from 'lucide-react'
import { Rechnung } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface RechnungTabelleProps {
  rechnungen: Rechnung[]
  loading: boolean
  onBearbeiten: (rechnung: Rechnung) => void
  onLoeschen: (id: string) => void
}

export default function RechnungTabelle({ rechnungen, loading, onBearbeiten, onLoeschen }: RechnungTabelleProps) {
  const router = useRouter()
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      entwurf: { variant: 'secondary', label: 'Entwurf' },
      gesendet: { variant: 'default', label: 'Gesendet', class: 'bg-blue-600' },
      bezahlt: { variant: 'default', label: 'Bezahlt', class: 'bg-green-600' },
      teilbezahlt: { variant: 'default', label: 'Teilbezahlt', class: 'bg-yellow-600' },
      ueberfaellig: { variant: 'destructive', label: 'Überfällig' },
      storniert: { variant: 'outline', label: 'Storniert' }
    }
    const config = variants[status] || { variant: 'default', label: status }
    return <Badge variant={config.variant as any} className={config.class}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-gray-500">Lade Rechnungen...</p></div>
  }

  if (rechnungen.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">Keine Rechnungen gefunden</p></div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-gray-900">Rechnungsnr.</TableHead>
            <TableHead className="text-gray-900">Kunde</TableHead>
            <TableHead className="text-gray-900">Datum</TableHead>
            <TableHead className="text-gray-900">Fällig am</TableHead>
            <TableHead className="text-gray-900">Summe (Brutto)</TableHead>
            <TableHead className="text-gray-900">Mahnstufe</TableHead>
            <TableHead className="text-gray-900">Status</TableHead>
            <TableHead className="text-right text-gray-900">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rechnungen.map((r) => (
            <TableRow key={r._id}>
              <TableCell className="font-medium text-gray-900">{r.rechnungsnummer}</TableCell>
              <TableCell className="text-gray-700">{r.kundeName}</TableCell>
              <TableCell className="text-sm text-gray-700">
                {r.rechnungsdatum ? format(new Date(r.rechnungsdatum), 'dd.MM.yyyy', { locale: de }) : '-'}
              </TableCell>
              <TableCell className="text-sm text-gray-700">
                {r.faelligAm ? format(new Date(r.faelligAm), 'dd.MM.yyyy', { locale: de }) : '-'}
              </TableCell>
              <TableCell className="font-semibold text-gray-900">{r.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</TableCell>
              <TableCell className="text-gray-700">
                {r.mahnstufe > 0 ? (
                  <Badge variant="destructive">Mahnung {r.mahnstufe}</Badge>
                ) : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(r.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => r._id && router.push(`/dashboard/admin/rechnungen/${r._id}`)}
                    className="text-gray-700 hover:text-gray-900"
                    title="Rechnung ansehen"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onBearbeiten(r)}
                    className="text-blue-600 hover:text-blue-700"
                    title="Rechnung bearbeiten"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => r._id && onLoeschen(r._id)}
                    className="text-red-600 hover:text-red-700"
                    title="Rechnung löschen"
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

