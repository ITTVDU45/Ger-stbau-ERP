"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QueryProvider } from '@/providers/query-provider'
import { OverviewStats } from '@/components/statistiken/OverviewStats'
import { MitarbeiterStats } from '@/components/statistiken/MitarbeiterStats'
import { KundenStats } from '@/components/statistiken/KundenStats'
import { ProjektStats } from '@/components/statistiken/ProjektStats'
import { UrlaubsStats } from '@/components/statistiken/UrlaubsStats'
import { FinanzStats } from '@/components/statistiken/FinanzStats'
import { RechnungsStats } from '@/components/statistiken/RechnungsStats'
import { AngebotsStats } from '@/components/statistiken/AngebotsStats'
import { AnfrageStats } from '@/components/statistiken/AnfrageStats'

function StatistikenPageContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-gray-900">Statistiken & Reports</CardTitle>
          <CardDescription className="text-gray-700">
            Auswertungen und Kennzahlen für alle Bereiche des ERP-Systems
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="uebersicht" className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="mitarbeiter">Mitarbeiter</TabsTrigger>
          <TabsTrigger value="kunden">Kunden</TabsTrigger>
          <TabsTrigger value="projekte">Projekte</TabsTrigger>
          <TabsTrigger value="urlaube">Urlaube</TabsTrigger>
          <TabsTrigger value="finanzen">Finanzen</TabsTrigger>
          <TabsTrigger value="rechnungen">Rechnungen</TabsTrigger>
          <TabsTrigger value="angebote">Angebote</TabsTrigger>
          <TabsTrigger value="anfragen">Anfragen</TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht" className="space-y-4">
          <OverviewStats />
        </TabsContent>

        <TabsContent value="mitarbeiter" className="space-y-4">
          <MitarbeiterStats />
        </TabsContent>

        <TabsContent value="kunden" className="space-y-4">
          <KundenStats />
        </TabsContent>

        <TabsContent value="projekte" className="space-y-4">
          <ProjektStats />
        </TabsContent>

        <TabsContent value="urlaube" className="space-y-4">
          <UrlaubsStats />
        </TabsContent>

        <TabsContent value="finanzen" className="space-y-4">
          <FinanzStats />
        </TabsContent>

        <TabsContent value="rechnungen" className="space-y-4">
          <RechnungsStats />
        </TabsContent>

        <TabsContent value="angebote" className="space-y-4">
          <AngebotsStats />
        </TabsContent>

        <TabsContent value="anfragen" className="space-y-4">
          <AnfrageStats />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function StatistikenPage() {
  return (
    <QueryProvider>
      <StatistikenPageContent />
    </QueryProvider>
  )
}

