"use client"

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Eye, ToggleLeft, Mail, Phone } from 'lucide-react'
import { Kunde } from '@/lib/db/types'
import Link from 'next/link'

interface KundeTabelleProps {
  kunden: Kunde[]
  loading: boolean
  onBearbeiten: (kunde: Kunde) => void
  onLoeschen: (id: string) => void
  onDeaktivieren: (id: string) => void
}

export default function KundeTabelle({
  kunden,
  loading,
  onBearbeiten,
  onLoeschen,
  onDeaktivieren
}: KundeTabelleProps) {
  
  const getKundentypBadge = (typ: string) => {
    const variants: Record<string, any> = {
      privat: { variant: 'secondary', label: 'Privat' },
      gewerblich: { variant: 'default', label: 'Gewerblich', class: 'bg-blue-600' },
      oeffentlich: { variant: 'default', label: 'Öffentlich', class: 'bg-purple-600' }
    }
    const config = variants[typ] || { variant: 'default', label: typ }
    return <Badge variant={config.variant as any} className={config.class}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-gray-500">Lade Kunden...</p></div>
  }

  if (kunden.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">Keine Kunden gefunden</p></div>
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-200 hover:bg-gray-50">
            <TableHead className="text-gray-900 font-semibold">Kundennr.</TableHead>
            <TableHead className="text-gray-900 font-semibold">Firmenname / Name</TableHead>
            <TableHead className="text-gray-900 font-semibold">Ansprechpartner</TableHead>
            <TableHead className="text-gray-900 font-semibold">Kontakt</TableHead>
            <TableHead className="text-gray-900 font-semibold">Typ</TableHead>
            <TableHead className="text-gray-900 font-semibold">Projekte</TableHead>
            <TableHead className="text-gray-900 font-semibold">Umsatz</TableHead>
            <TableHead className="text-gray-900 font-semibold">Offene Posten</TableHead>
            <TableHead className="text-gray-900 font-semibold">Status</TableHead>
            <TableHead className="text-right text-gray-900 font-semibold">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kunden.map((k) => (
            <TableRow key={k._id} className="border-gray-200 hover:bg-gray-50">
              <TableCell className="font-medium text-gray-900">{k.kundennummer || '-'}</TableCell>
              <TableCell>
                <div className="font-medium text-gray-900">
                  {k.firma || `${k.vorname} ${k.nachname}`}
                </div>
                {k.adresse?.ort && (
                  <div className="text-sm text-gray-600">{k.adresse.ort}</div>
                )}
              </TableCell>
              <TableCell>
                {k.ansprechpartner ? (
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{k.ansprechpartner.vorname} {k.ansprechpartner.nachname}</div>
                    {k.ansprechpartner.position && (
                      <div className="text-xs text-gray-600">{k.ansprechpartner.position}</div>
                    )}
                  </div>
                ) : <span className="text-gray-500">-</span>}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {k.email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-700">{k.email}</span>
                    </div>
                  )}
                  {k.telefon && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-700">{k.telefon}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{getKundentypBadge(k.kundentyp)}</TableCell>
              <TableCell className="text-center font-semibold text-gray-900">
                {k.anzahlProjekte || 0}
              </TableCell>
              <TableCell className="font-semibold text-blue-600">
                {(k.umsatzGesamt || 0).toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
              </TableCell>
              <TableCell className="font-semibold text-red-600">
                {(k.offenePosten || 0).toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
              </TableCell>
              <TableCell>
                <Badge variant={k.aktiv ? 'default' : 'secondary'} className={k.aktiv ? 'bg-green-600' : ''}>
                  {k.aktiv ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100">
                    <Link href={`/dashboard/admin/kunden/${k._id}`}>
                      <Eye className="h-4 w-4 text-gray-700" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onBearbeiten(k)} className="hover:bg-gray-100">
                    <Edit className="h-4 w-4 text-gray-700" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => k._id && onDeaktivieren(k._id)} className="hover:bg-gray-100">
                    <ToggleLeft className="h-4 w-4 text-orange-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => k._id && onLoeschen(k._id)} className="hover:bg-gray-100">
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

