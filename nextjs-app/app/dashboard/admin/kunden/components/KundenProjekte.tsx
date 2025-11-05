"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Plus, Eye } from 'lucide-react'
import { Projekt } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'

interface KundenProjekteProps {
  kundeId: string
  kundeName: string
}

export default function KundenProjekte({ kundeId, kundeName }: KundenProjekteProps) {
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjekte()
  }, [kundeId])

  const loadProjekte = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/projekte`)
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

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Projekte von {kundeName}</CardTitle>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Neues Projekt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Lade Projekte...</p>
          ) : projekte.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Noch keine Projekte für diesen Kunden</p>
          ) : (
            <div className="rounded-md border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Projektnr.</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Projektname</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Zeitraum</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Budget</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Fortschritt</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projekte.map((p) => (
                    <TableRow key={p._id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{p.projektnummer}</TableCell>
                      <TableCell className="text-gray-900">{p.projektname}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {p.beginn && p.ende ? (
                          <>{format(new Date(p.beginn), 'dd.MM.yy', { locale: de })} - {format(new Date(p.ende), 'dd.MM.yy', { locale: de })}</>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {p.budget ? `${p.budget.toLocaleString('de-DE')} €` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[60px]">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${p.fortschritt || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-700">{p.fortschritt || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100">
                          <Link href={`/dashboard/admin/projekte/${p._id}`}>
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

