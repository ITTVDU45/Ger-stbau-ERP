"use client"

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Eye, Mail, Phone } from 'lucide-react'
import { Mitarbeiter } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface MitarbeiterTabelleProps {
  mitarbeiter: Mitarbeiter[]
  loading: boolean
  onBearbeiten: (mitarbeiter: Mitarbeiter) => void
  onLoeschen: (id: string) => void
}

export default function MitarbeiterTabelle({
  mitarbeiter,
  loading,
  onBearbeiten,
  onLoeschen
}: MitarbeiterTabelleProps) {
  
  const getBeschaeftigungsartBadge = (art: string) => {
    const variants: Record<string, any> = {
      festangestellt: { variant: 'default', label: 'Festangestellt' },
      aushilfe: { variant: 'secondary', label: 'Aushilfe' },
      subunternehmer: { variant: 'outline', label: 'Subunternehmer' }
    }
    const config = variants[art] || { variant: 'default', label: art }
    return <Badge variant={config.variant as any}>{config.label}</Badge>
  }

  const getResturlaubBadge = (resturlaub: number | undefined) => {
    if (resturlaub === undefined || resturlaub === null) {
      return <span className="text-gray-400">-</span>
    }

    let bgColor = ''
    let textColor = ''
    let borderColor = ''
    
    if (resturlaub > 10) {
      // Grün für mehr als 10 Tage
      bgColor = 'bg-green-100'
      textColor = 'text-green-800'
      borderColor = 'border-green-300'
    } else if (resturlaub >= 5) {
      // Gelb für 5-10 Tage
      bgColor = 'bg-yellow-100'
      textColor = 'text-yellow-800'
      borderColor = 'border-yellow-300'
    } else {
      // Rot für weniger als 5 Tage
      bgColor = 'bg-red-100'
      textColor = 'text-red-800'
      borderColor = 'border-red-300'
    }

    return (
      <Badge variant="outline" className={`${bgColor} ${textColor} ${borderColor}`}>
        {resturlaub} Tage
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lade Mitarbeiter...</p>
      </div>
    )
  }

  if (mitarbeiter.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Keine Mitarbeiter gefunden</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-gray-700">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700 hover:bg-gray-800/50">
            <TableHead className="text-gray-200">Personalnr.</TableHead>
            <TableHead className="text-gray-200">Name</TableHead>
            <TableHead className="text-gray-200">Kontakt</TableHead>
            <TableHead className="text-gray-200">Beschäftigungsart</TableHead>
            <TableHead className="text-gray-200">Eintrittsdatum</TableHead>
            <TableHead className="text-gray-200">Qualifikationen</TableHead>
            <TableHead className="text-gray-200">Resturlaub</TableHead>
            <TableHead className="text-gray-200">Status</TableHead>
            <TableHead className="text-right text-gray-200">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mitarbeiter.map((m) => (
            <TableRow key={m._id} className="border-gray-700 hover:bg-gray-800/50">
              <TableCell className="font-medium text-white">
                {m.personalnummer || '-'}
              </TableCell>
              <TableCell>
                <div className="font-medium text-white">{m.vorname} {m.nachname}</div>
                {m.adresse?.ort && (
                  <div className="text-sm text-gray-400">{m.adresse.ort}</div>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {m.email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-300">{m.email}</span>
                    </div>
                  )}
                  {m.telefon && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-300">{m.telefon}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {getBeschaeftigungsartBadge(m.beschaeftigungsart)}
              </TableCell>
              <TableCell className="text-gray-200">
                {m.eintrittsdatum ? format(new Date(m.eintrittsdatum), 'dd.MM.yyyy', { locale: de }) : '-'}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {m.qualifikationen.slice(0, 2).map((qual, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-gray-600 text-gray-200">
                      {qual}
                    </Badge>
                  ))}
                  {m.qualifikationen.length > 2 && (
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-200">
                      +{m.qualifikationen.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {getResturlaubBadge(m.resturlaub)}
              </TableCell>
              <TableCell>
                <Badge variant={m.aktiv ? 'default' : 'secondary'}>
                  {m.aktiv ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onBearbeiten(m)}
                    className="hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4 text-gray-300" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => m._id && onLoeschen(m._id)}
                    className="hover:bg-gray-700"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
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

