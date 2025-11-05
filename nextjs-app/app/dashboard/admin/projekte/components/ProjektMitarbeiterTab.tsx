"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Users } from 'lucide-react'
import { Projekt } from '@/lib/db/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import MitarbeiterZuweisenDialog from './MitarbeiterZuweisenDialog'

interface ProjektMitarbeiterTabProps {
  projekt: Projekt
  onProjektUpdated: () => void
}

export default function ProjektMitarbeiterTab({ projekt, onProjektUpdated }: ProjektMitarbeiterTabProps) {
  const [loading, setLoading] = useState(false)

  const handleMitarbeiterEntfernen = async (mitarbeiterId: string) => {
    if (!confirm('Möchten Sie diesen Mitarbeiter wirklich vom Projekt entfernen?')) return

    try {
      setLoading(true)
      const updatedMitarbeiter = (projekt.zugewieseneMitarbeiter || []).filter(m => m.mitarbeiterId !== mitarbeiterId)
      
      const response = await fetch(`/api/projekte/${projekt._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projekt,
          zugewieseneMitarbeiter: updatedMitarbeiter
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Entfernen des Mitarbeiters')
      }

      toast.success('Mitarbeiter erfolgreich entfernt')
      onProjektUpdated()
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Entfernen des Mitarbeiters')
    } finally {
      setLoading(false)
    }
  }

  const getRolleBadge = (rolle: string) => {
    const rolleConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
      kolonnenfuehrer: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Kolonnenführer' },
      vorarbeiter: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'Vorarbeiter' },
      monteur: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Monteur' },
      helfer: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Helfer' },
      // Legacy-Unterstützung
      bauleiter: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Bauleiter' },
    }
    const config = rolleConfig[rolle] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: rolle }
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </Badge>
    )
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-900">Zugewiesene Mitarbeiter</CardTitle>
            <CardDescription className="text-gray-600">
              Verwalten Sie die Mitarbeiter-Zuteilung für dieses Projekt
            </CardDescription>
          </div>
          <MitarbeiterZuweisenDialog projekt={projekt} onSuccess={onProjektUpdated}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Mitarbeiter zuweisen
            </Button>
          </MitarbeiterZuweisenDialog>
        </div>
      </CardHeader>
      <CardContent>
        {!projekt.zugewieseneMitarbeiter || projekt.zugewieseneMitarbeiter.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Noch keine Mitarbeiter zugewiesen</p>
            <MitarbeiterZuweisenDialog projekt={projekt} onSuccess={onProjektUpdated}>
              <Button variant="outline" className="border-gray-300 text-gray-700">
                <Plus className="h-4 w-4 mr-2" />
                Ersten Mitarbeiter zuweisen
              </Button>
            </MitarbeiterZuweisenDialog>
          </div>
        ) : (
          <div className="rounded-md border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900">Name</TableHead>
                  <TableHead className="text-gray-900">Rolle</TableHead>
                  <TableHead className="text-gray-900">Von</TableHead>
                  <TableHead className="text-gray-900">Bis</TableHead>
                  <TableHead className="text-gray-900">Stunden/Tag</TableHead>
                  <TableHead className="text-right text-gray-900">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projekt.zugewieseneMitarbeiter.map((mitarbeiter, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-gray-900">
                      {mitarbeiter.mitarbeiterName}
                    </TableCell>
                    <TableCell>
                      {getRolleBadge(mitarbeiter.rolle)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {mitarbeiter.von && mitarbeiter.von !== 'Invalid Date'
                        ? format(new Date(mitarbeiter.von), 'dd.MM.yyyy', { locale: de })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {mitarbeiter.bis && mitarbeiter.bis !== 'Invalid Date'
                        ? format(new Date(mitarbeiter.bis), 'dd.MM.yyyy', { locale: de })
                        : 'Offen'
                      }
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {mitarbeiter.stundenProTag || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMitarbeiterEntfernen(mitarbeiter.mitarbeiterId)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Zusammenfassung */}
        {projekt.zugewieseneMitarbeiter && projekt.zugewieseneMitarbeiter.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm text-blue-700 mb-1">Gesamt</div>
                <div className="text-2xl font-bold text-blue-900">
                  {projekt.zugewieseneMitarbeiter.length}
                </div>
                <div className="text-xs text-blue-600 mt-1">Mitarbeiter</div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="text-sm text-purple-700 mb-1">Kolonnenführer</div>
                <div className="text-2xl font-bold text-purple-900">
                  {projekt.zugewieseneMitarbeiter.filter(m => m.rolle === 'kolonnenfuehrer').length}
                </div>
                <div className="text-xs text-purple-600 mt-1">Zugewiesen</div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="text-sm text-green-700 mb-1">Vorarbeiter & Monteure</div>
                <div className="text-2xl font-bold text-green-900">
                  {projekt.zugewieseneMitarbeiter.filter(m => m.rolle === 'vorarbeiter' || m.rolle === 'monteur').length}
                </div>
                <div className="text-xs text-green-600 mt-1">Zugewiesen</div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

