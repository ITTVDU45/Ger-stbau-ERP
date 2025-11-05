"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Plus, Eye } from 'lucide-react'
import { Angebot } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface KundenAngeboteProps {
  kundeId: string
  kundeName: string
}

export default function KundenAngebote({ kundeId, kundeName }: KundenAngeboteProps) {
  const [angebote, setAngebote] = useState<Angebot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAngebote()
  }, [kundeId])

  const loadAngebote = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/angebote`)
      if (response.ok) {
        const data = await response.json()
        setAngebote(data.angebote || [])
      }
    } catch (error) {
      console.error('Fehler:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const erfolgsquote = angebote.length > 0
    ? ((angebote.filter(a => a.status === 'angenommen').length / angebote.length) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">Angebote für {kundeName}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Erfolgsquote: <span className="font-semibold text-green-600">{erfolgsquote}%</span>
              </p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Neues Angebot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Lade Angebote...</p>
          ) : angebote.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Noch keine Angebote für diesen Kunden</p>
          ) : (
            <div className="rounded-md border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 hover:bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Angebotsnr.</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Datum</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Gültig bis</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Summe (Brutto)</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {angebote.map((a) => (
                    <TableRow key={a._id} className="border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{a.angebotsnummer}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {a.datum ? format(new Date(a.datum), 'dd.MM.yyyy', { locale: de }) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {a.gueltigBis ? format(new Date(a.gueltigBis), 'dd.MM.yyyy', { locale: de }) : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {a.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell>{getStatusBadge(a.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                          <Eye className="h-4 w-4 text-gray-700" />
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

