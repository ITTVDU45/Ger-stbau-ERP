"use client"

import React, { useState, useEffect } from 'react'
import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Mail, User, Phone, MapPin, Calendar } from 'lucide-react'
import { Mitarbeiter } from '@/lib/db/types'
import Link from 'next/link'
import MitarbeiterUebersicht from '../components/MitarbeiterUebersicht'
import MitarbeiterProjekte from '../components/MitarbeiterProjekte'
import MitarbeiterZeiterfassung from '../components/MitarbeiterZeiterfassung'
import MitarbeiterUrlaub from '../components/MitarbeiterUrlaub'
import MitarbeiterDokumente from '../components/MitarbeiterDokumente'
import MitarbeiterDialog from '../components/MitarbeiterDialog'

export default function MitarbeiterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadMitarbeiter()
  }, [resolvedParams.id])

  const loadMitarbeiter = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mitarbeiter/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setMitarbeiter(data.mitarbeiter)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Mitarbeiters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBearbeiten = () => {
    setDialogOpen(true)
  }

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false)
    if (updated) {
      loadMitarbeiter()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Lade Mitarbeiterdaten...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!mitarbeiter) {
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Mitarbeiter nicht gefunden</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const mitarbeitername = `${mitarbeiter.vorname} ${mitarbeiter.nachname}`
  const beschaeftigungsartLabels = {
    festangestellt: 'Festangestellt',
    aushilfe: 'Aushilfe',
    subunternehmer: 'Subunternehmer'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button variant="outline" asChild className="mt-1 bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
                <Link href="/dashboard/admin/mitarbeiter">
                  <ArrowLeft className="h-4 w-4 mr-2 text-gray-700" />
                  <span className="font-medium">Zurück</span>
                </Link>
              </Button>
              
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-blue-600" />
                  <div>
                    <CardTitle className="text-2xl text-gray-900 font-bold">{mitarbeitername}</CardTitle>
                    <CardDescription className="text-gray-800 mt-1 font-medium">
                      Personalnummer: {mitarbeiter.personalnummer || '-'}
                    </CardDescription>
                  </div>
                </div>

                {/* Kontaktinformationen */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  {mitarbeiter.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-900 font-medium">{mitarbeiter.email}</span>
                    </div>
                  )}
                  
                  {mitarbeiter.telefon && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-900 font-medium">{mitarbeiter.telefon}</span>
                    </div>
                  )}
                  
                  {mitarbeiter.adresse && mitarbeiter.adresse.ort && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-900 font-medium">
                        {mitarbeiter.adresse.strasse} {mitarbeiter.adresse.hausnummer}, {mitarbeiter.adresse.plz} {mitarbeiter.adresse.ort}
                      </span>
                    </div>
                  )}

                  {mitarbeiter.eintrittsdatum && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-900 font-medium">
                        Eintritt: {new Date(mitarbeiter.eintrittsdatum).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="mt-4 flex gap-2">
                  <Badge variant={mitarbeiter.aktiv ? 'default' : 'secondary'} className={mitarbeiter.aktiv ? 'bg-green-600' : ''}>
                    {mitarbeiter.aktiv ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                  <Badge variant="outline" className="border-gray-400 text-gray-900 font-medium">
                    {beschaeftigungsartLabels[mitarbeiter.beschaeftigungsart]}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Aktionen */}
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
                <Mail className="h-4 w-4 mr-2 text-gray-700" />
                <span className="font-medium">E-Mail senden</span>
              </Button>
              <Button variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50" onClick={handleBearbeiten}>
                <Edit className="h-4 w-4 mr-2 text-gray-700" />
                <span className="font-medium">Bearbeiten</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="uebersicht" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="projekte">Projekte/Einsätze</TabsTrigger>
          <TabsTrigger value="zeiterfassung">Zeiterfassung</TabsTrigger>
          <TabsTrigger value="urlaub">Urlaub</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht">
          <MitarbeiterUebersicht mitarbeiterId={resolvedParams.id} mitarbeiter={mitarbeiter} />
        </TabsContent>

        <TabsContent value="projekte">
          <MitarbeiterProjekte mitarbeiterId={resolvedParams.id} mitarbeiterName={mitarbeitername} />
        </TabsContent>

        <TabsContent value="zeiterfassung">
          <MitarbeiterZeiterfassung mitarbeiterId={resolvedParams.id} mitarbeiterName={mitarbeitername} />
        </TabsContent>

        <TabsContent value="urlaub">
          <MitarbeiterUrlaub mitarbeiterId={resolvedParams.id} mitarbeiterName={mitarbeitername} />
        </TabsContent>

        <TabsContent value="dokumente">
          <MitarbeiterDokumente mitarbeiterId={resolvedParams.id} mitarbeiter={mitarbeiter} onUploadSuccess={loadMitarbeiter} />
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <MitarbeiterDialog
        open={dialogOpen}
        mitarbeiter={mitarbeiter}
        onClose={handleDialogClose}
      />
    </div>
  )
}

