"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Projekt } from '@/lib/db/types'
import { Eye, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'

interface MitarbeiterProjekteProps {
  mitarbeiterId: string
  mitarbeiterName: string
}

export default function MitarbeiterProjekte({ mitarbeiterId, mitarbeiterName }: MitarbeiterProjekteProps) {
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjekte()
  }, [mitarbeiterId])

  const loadProjekte = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projekte?mitarbeiterId=${mitarbeiterId}`)
      if (response.ok) {
        const data = await response.json()
        setProjekte(data.projekte || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string, class: string }> = {
      in_planung: { variant: 'outline', label: 'In Planung', class: 'border-gray-400' },
      aktiv: { variant: 'default', label: 'Aktiv', class: 'bg-green-600' },
      in_abrechnung: { variant: 'default', label: 'In Abrechnung', class: 'bg-orange-600' },
      abgeschlossen: { variant: 'default', label: 'Abgeschlossen', class: 'bg-blue-600' },
      pausiert: { variant: 'secondary', label: 'Pausiert', class: '' }
    }
    const config = variants[status] || { variant: 'outline', label: status, class: '' }
    return <Badge variant={config.variant} className={config.class}>{config.label}</Badge>
  }

  const getMitarbeiterRolle = (projekt: Projekt) => {
    const mitarbeiter = projekt.zugewieseneMitarbeiter?.find(m => m.mitarbeiterId === mitarbeiterId)
    return mitarbeiter?.rolle || '-'
  }

  const getMitarbeiterZeitraum = (projekt: Projekt) => {
    const mitarbeiter = projekt.zugewieseneMitarbeiter?.find(m => m.mitarbeiterId === mitarbeiterId)
    if (!mitarbeiter) return '-'
    
    const von = mitarbeiter.von ? format(new Date(mitarbeiter.von), 'dd.MM.yyyy', { locale: de }) : '-'
    const bis = mitarbeiter.bis ? format(new Date(mitarbeiter.bis), 'dd.MM.yyyy', { locale: de }) : 'laufend'
    
    return `${von} - ${bis}`
  }

  if (loading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Lade Projekte...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Statistiken */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamt</CardTitle>
            <Briefcase className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{projekte.length}</div>
            <p className="text-xs text-gray-600 mt-1">Zugewiesene Projekte</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Aktiv</CardTitle>
            <Briefcase className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projekte.filter(p => p.status === 'aktiv').length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Laufende Projekte</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Abgeschlossen</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {projekte.filter(p => p.status === 'abgeschlossen').length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Abgeschlossene Projekte</p>
          </CardContent>
        </Card>
      </div>

      {/* Projekte-Tabelle */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Zugewiesene Projekte
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projekte.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Keine Projekte zugewiesen</p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Projektnr.</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Projektname</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Kunde</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Rolle</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Zeitraum</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projekte.map((projekt) => (
                    <TableRow key={projekt._id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        {projekt.projektnummer}
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {projekt.projektname}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {projekt.kundeName}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(projekt.status)}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {getMitarbeiterRolle(projekt)}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {getMitarbeiterZeitraum(projekt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100">
                          <Link href={`/dashboard/admin/projekte/${projekt._id}`}>
                            <Eye className="h-4 w-4 text-gray-700" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

