"use client"

import React, { useState, useEffect } from 'react'
import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Mail, Archive, Building2, Phone, MapPin } from 'lucide-react'
import { Kunde } from '@/lib/db/types'
import Link from 'next/link'
import KundenUebersicht from '../components/KundenUebersicht'
import KundenProjekte from '../components/KundenProjekte'
import KundenAngebote from '../components/KundenAngebote'
import KundenRechnungen from '../components/KundenRechnungen'
import KundenDokumente from '../components/KundenDokumente'
import KundenNotizen from '../components/KundenNotizen'

export default function KundenDeteilseitePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [kunde, setKunde] = useState<Kunde | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadKunde()
  }, [resolvedParams.id])

  const loadKunde = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setKunde(data.kunde)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Kunden:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Lade Kundendaten...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!kunde) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Kunde nicht gefunden</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const kundenname = kunde.firma || `${kunde.vorname} ${kunde.nachname}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button variant="outline" asChild className="mt-1 bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
                <Link href="/dashboard/admin/kunden">
                  <ArrowLeft className="h-4 w-4 mr-2 text-gray-700" />
                  <span className="font-medium">Zurück</span>
                </Link>
              </Button>
              
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-cyan-600" />
                  <div>
                    <CardTitle className="text-2xl text-gray-900 font-bold">{kundenname}</CardTitle>
                    <CardDescription className="text-gray-800 mt-1 font-medium">
                      Kundennummer: {kunde.kundennummer}
                    </CardDescription>
                  </div>
                </div>

                {/* Kontaktinformationen */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  {kunde.ansprechpartner && (kunde.ansprechpartner.vorname || kunde.ansprechpartner.nachname) && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-gray-800">Ansprechpartner:</span>
                      <div>
                        <div className="text-gray-900 font-medium">
                          {kunde.ansprechpartner.vorname} {kunde.ansprechpartner.nachname}
                        </div>
                        {kunde.ansprechpartner.position && (
                          <div className="text-gray-700">{kunde.ansprechpartner.position}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {kunde.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-900 font-medium">{kunde.email}</span>
                    </div>
                  )}
                  
                  {kunde.telefon && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-900 font-medium">{kunde.telefon}</span>
                    </div>
                  )}
                  
                  {kunde.adresse && kunde.adresse.ort && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-900 font-medium">
                        {kunde.adresse.strasse} {kunde.adresse.hausnummer}, {kunde.adresse.plz} {kunde.adresse.ort}
                      </span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="mt-4 flex gap-2">
                  <Badge variant={kunde.aktiv ? 'default' : 'secondary'} className={kunde.aktiv ? 'bg-green-600' : ''}>
                    {kunde.aktiv ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                  <Badge variant="outline" className="border-gray-400 text-gray-900 font-medium">
                    {kunde.kundentyp === 'privat' ? 'Privat' : kunde.kundentyp === 'gewerblich' ? 'Gewerblich' : 'Öffentlich'}
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
              <Button variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
                <Edit className="h-4 w-4 mr-2 text-gray-700" />
                <span className="font-medium">Bearbeiten</span>
              </Button>
              <Button variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
                <Archive className="h-4 w-4 mr-2 text-gray-700" />
                <span className="font-medium">{kunde.aktiv ? 'Archivieren' : 'Aktivieren'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="uebersicht" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="projekte">Projekte ({kunde.anzahlProjekte || 0})</TabsTrigger>
          <TabsTrigger value="angebote">Angebote ({kunde.anzahlAngebote || 0})</TabsTrigger>
          <TabsTrigger value="rechnungen">Rechnungen ({kunde.anzahlRechnungen || 0})</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
          <TabsTrigger value="notizen">Notizen</TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht">
          <KundenUebersicht kundeId={resolvedParams.id} kunde={kunde} />
        </TabsContent>

        <TabsContent value="projekte">
          <KundenProjekte kundeId={resolvedParams.id} kundeName={kundenname} />
        </TabsContent>

        <TabsContent value="angebote">
          <KundenAngebote kundeId={resolvedParams.id} kundeName={kundenname} />
        </TabsContent>

        <TabsContent value="rechnungen">
          <KundenRechnungen kundeId={resolvedParams.id} kundeName={kundenname} />
        </TabsContent>

        <TabsContent value="dokumente">
          <KundenDokumente kundeId={resolvedParams.id} kundeName={kundenname} />
        </TabsContent>

        <TabsContent value="notizen">
          <KundenNotizen kundeId={resolvedParams.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

