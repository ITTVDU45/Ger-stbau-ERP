"use client"

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Urlaub } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface UrlaubTabelleProps {
  urlaube: Urlaub[]
  loading: boolean
  onBearbeiten: (urlaub: Urlaub) => void
  onGenehmigen: (id: string) => void
  onAblehnen: (id: string) => void
  onLoeschen: (id: string) => void
}

export default function UrlaubTabelle({
  urlaube,
  loading,
  onBearbeiten,
  onGenehmigen,
  onAblehnen,
  onLoeschen
}: UrlaubTabelleProps) {
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      beantragt: { variant: 'secondary', label: 'Beantragt' },
      genehmigt: { variant: 'default', label: 'Genehmigt', class: 'bg-green-600' },
      abgelehnt: { variant: 'destructive', label: 'Abgelehnt' }
    }
    const config = variants[status] || { variant: 'default', label: status }
    return <Badge variant={config.variant as any} className={config.class}>{config.label}</Badge>
  }

  const getTypBadge = (typ: string) => {
    const labels: Record<string, string> = {
      urlaub: 'Urlaub',
      krankheit: 'Krankheit',
      sonderurlaub: 'Sonderurlaub',
      unbezahlt: 'Unbezahlt',
      sonstiges: 'Sonstiges'
    }
    return <Badge variant="outline">{labels[typ] || typ}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-gray-500">Lade Urlaubsanträge...</p></div>
  }

  if (urlaube.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">Keine Urlaubsanträge gefunden</p></div>
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-200 hover:bg-gray-50">
            <TableHead className="text-gray-900 font-semibold">Mitarbeiter</TableHead>
            <TableHead className="text-gray-900 font-semibold">Zeitraum</TableHead>
            <TableHead className="text-gray-900 font-semibold">Tage</TableHead>
            <TableHead className="text-gray-900 font-semibold">Typ</TableHead>
            <TableHead className="text-gray-900 font-semibold">Vertretung</TableHead>
            <TableHead className="text-gray-900 font-semibold">Status</TableHead>
            <TableHead className="text-right text-gray-900 font-semibold">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {urlaube.map((u) => (
            <TableRow key={u._id} className="border-gray-200 hover:bg-gray-50">
              <TableCell className="font-medium text-gray-900">{u.mitarbeiterName}</TableCell>
              <TableCell>
                <div className="text-sm text-gray-700">
                  {u.von && u.bis ? (
                    <>{format(new Date(u.von), 'dd.MM.yyyy', { locale: de })} - {format(new Date(u.bis), 'dd.MM.yyyy', { locale: de })}</>
                  ) : (
                    '-'
                  )}
                </div>
              </TableCell>
              <TableCell className="font-semibold text-gray-900">{u.anzahlTage}</TableCell>
              <TableCell>{getTypBadge(u.typ)}</TableCell>
              <TableCell className="text-sm text-gray-700">{u.vertretungName || '-'}</TableCell>
              <TableCell>{getStatusBadge(u.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {/* Genehmigen-Button: Immer verfügbar außer bei "genehmigt" */}
                  {u.status !== 'genehmigt' && (
                    <Button variant="ghost" size="sm" onClick={() => u._id && onGenehmigen(u._id)} className="hover:bg-gray-100" title="Genehmigen">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  
                  {/* Ablehnen-Button: Immer verfügbar außer bei "abgelehnt" */}
                  {u.status !== 'abgelehnt' && (
                    <Button variant="ghost" size="sm" onClick={() => u._id && onAblehnen(u._id)} className="hover:bg-gray-100" title="Ablehnen">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                  
                  {/* Bearbeiten: Immer verfügbar */}
                  <Button variant="ghost" size="sm" onClick={() => onBearbeiten(u)} className="hover:bg-gray-100" title="Bearbeiten">
                    <Edit className="h-4 w-4 text-gray-700" />
                  </Button>
                  
                  {/* Löschen: Immer verfügbar */}
                  <Button variant="ghost" size="sm" onClick={() => u._id && onLoeschen(u._id)} className="hover:bg-gray-100" title="Löschen">
                    <Trash2 className="h-4 w-4 text-red-600" />
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

