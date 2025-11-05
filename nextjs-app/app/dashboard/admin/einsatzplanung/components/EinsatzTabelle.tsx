"use client"

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Einsatz } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface EinsatzTabelleProps {
  einsaetze: Einsatz[]
  loading: boolean
  onBearbeiten: (einsatz: Einsatz) => void
  onLoeschen: (id: string) => void
}

export default function EinsatzTabelle({
  einsaetze,
  loading,
  onBearbeiten,
  onLoeschen
}: EinsatzTabelleProps) {

  if (loading) {
    return <div className="text-center py-12"><p className="text-gray-500">Lade Einsätze...</p></div>
  }

  if (einsaetze.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">Keine Einsätze gefunden</p></div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mitarbeiter</TableHead>
            <TableHead>Projekt</TableHead>
            <TableHead>Zeitraum</TableHead>
            <TableHead>Rolle</TableHead>
            <TableHead>Geplant</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {einsaetze.map((e) => (
            <TableRow key={e._id}>
              <TableCell className="font-medium">{e.mitarbeiterName}</TableCell>
              <TableCell>{e.projektName}</TableCell>
              <TableCell>
                <div className="text-sm">
                  {e.von && e.bis ? (
                    <>{format(new Date(e.von), 'dd.MM.yyyy', { locale: de })} - {format(new Date(e.bis), 'dd.MM.yyyy', { locale: de })}</>
                  ) : (
                    '-'
                  )}
                </div>
              </TableCell>
              <TableCell>{e.rolle || '-'}</TableCell>
              <TableCell>{e.geplantStunden ? `${e.geplantStunden}h` : '-'}</TableCell>
              <TableCell>
                <Badge variant={e.bestaetigt ? 'default' : 'secondary'} className={e.bestaetigt ? 'bg-green-600' : ''}>
                  {e.bestaetigt ? 'Bestätigt' : 'Geplant'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onBearbeiten(e)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => e._id && onLoeschen(e._id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
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

