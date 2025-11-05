"use client"

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, CheckCircle, XCircle } from 'lucide-react'
import { Zeiterfassung } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface ZeiterfassungTabelleProps {
  zeiteintraege: Zeiterfassung[]
  loading: boolean
  onBearbeiten: (eintrag: Zeiterfassung) => void
  onFreigeben: (id: string) => void
  onAblehnen: (id: string) => void
}

export default function ZeiterfassungTabelle({
  zeiteintraege,
  loading,
  onBearbeiten,
  onFreigeben,
  onAblehnen
}: ZeiterfassungTabelleProps) {
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      offen: { variant: 'secondary', label: 'Offen' },
      freigegeben: { variant: 'default', label: 'Freigegeben', class: 'bg-green-600' },
      abgelehnt: { variant: 'destructive', label: 'Abgelehnt' }
    }
    const config = variants[status] || { variant: 'default', label: status }
    return <Badge variant={config.variant as any} className={config.class}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-gray-500">Lade Zeiteinträge...</p></div>
  }

  if (zeiteintraege.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">Keine Zeiteinträge gefunden</p></div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Mitarbeiter</TableHead>
            <TableHead>Projekt</TableHead>
            <TableHead>Zeiten</TableHead>
            <TableHead>Stunden</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zeiteintraege.map((z) => (
            <TableRow key={z._id}>
              <TableCell className="font-medium">
                {z.datum ? format(new Date(z.datum), 'dd.MM.yyyy', { locale: de }) : '-'}
              </TableCell>
              <TableCell>{z.mitarbeiterName}</TableCell>
              <TableCell>{z.projektName || '-'}</TableCell>
              <TableCell className="text-sm text-gray-600">
                {z.von && z.bis ? `${z.von} - ${z.bis}` : '-'}
              </TableCell>
              <TableCell className="font-semibold">{z.stunden}h</TableCell>
              <TableCell>{getStatusBadge(z.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {z.status === 'offen' && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => z._id && onFreigeben(z._id)}>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => z._id && onAblehnen(z._id)}>
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onBearbeiten(z)}>
                    <Edit className="h-4 w-4" />
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

