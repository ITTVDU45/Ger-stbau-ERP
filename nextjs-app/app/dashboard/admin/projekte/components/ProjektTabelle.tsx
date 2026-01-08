"use client"

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Eye } from 'lucide-react'
import { Projekt } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'

interface ProjektTabelleProps {
  projekte: Projekt[]
  loading: boolean
  onBearbeiten: (projekt: Projekt) => void
  onLoeschen: (id: string) => void
}

export default function ProjektTabelle({
  projekte,
  loading,
  onBearbeiten,
  onLoeschen
}: ProjektTabelleProps) {
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      in_planung: { variant: 'secondary', label: 'In Planung' },
      aktiv: { variant: 'default', label: 'Aktiv', class: 'bg-green-600' },
      pausiert: { variant: 'outline', label: 'Pausiert' },
      abgeschlossen: { variant: 'default', label: 'Abgeschlossen', class: 'bg-blue-600' },
      abgerechnet: { variant: 'default', label: 'Abgerechnet', class: 'bg-purple-600' }
    }
    const config = variants[status] || { variant: 'default', label: status }
    return <Badge variant={config.variant as any} className={config.class}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-gray-500">Lade Projekte...</p></div>
  }

  if (projekte.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">Keine Projekte gefunden</p></div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-gray-900">Projektnr.</TableHead>
            <TableHead className="text-gray-900">Projektname</TableHead>
            <TableHead className="text-gray-900">Kunde</TableHead>
            <TableHead className="text-gray-900">Standort</TableHead>
            <TableHead className="text-gray-900">Zeitraum</TableHead>
            <TableHead className="text-gray-900">Budget (Netto)</TableHead>
            <TableHead className="text-gray-900">Fortschritt</TableHead>
            <TableHead className="text-gray-900">Status</TableHead>
            <TableHead className="text-right text-gray-900">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projekte.map((p) => (
            <TableRow key={p._id}>
              <TableCell className="font-medium text-gray-900">{p.projektnummer}</TableCell>
              <TableCell>
                <div className="font-medium text-gray-900">{p.projektname}</div>
                {p.zugewieseneMitarbeiter && p.zugewieseneMitarbeiter.length > 0 && (
                  <div className="text-sm text-gray-500">{p.zugewieseneMitarbeiter.length} Mitarbeiter</div>
                )}
              </TableCell>
              <TableCell className="text-gray-900">{p.kundeName}</TableCell>
              <TableCell className="text-sm text-gray-700">{p.standort}</TableCell>
              <TableCell className="text-sm text-gray-900">
                {p.beginn && p.ende ? (
                  <>
                    {format(new Date(p.beginn), 'dd.MM.yy', { locale: de })} - {format(new Date(p.ende), 'dd.MM.yy', { locale: de })}
                  </>
                ) : (
                  <span className="text-gray-400">Nicht festgelegt</span>
                )}
              </TableCell>
              <TableCell>
                {p.budget ? (
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{p.budget.toLocaleString('de-DE')} €</div>
                    {p.istKosten !== undefined && (
                      <div className="text-xs text-gray-500">Ist: {p.istKosten.toLocaleString('de-DE')} €</div>
                    )}
                  </div>
                ) : <span className="text-gray-900">-</span>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${p.fortschritt || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-900">{p.fortschritt || 0}%</span>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(p.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/admin/projekte/${p._id}`}>
                      <Eye className="h-4 w-4 text-gray-700" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onBearbeiten(p)}>
                    <Edit className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => p._id && onLoeschen(p._id)}>
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

