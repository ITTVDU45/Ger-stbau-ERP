"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function StatistikenPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-gray-900">Statistiken & Reports</CardTitle>
          <CardDescription className="text-gray-700">
            Auswertungen und Kennzahlen
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="finanzen">
        <TabsList>
          <TabsTrigger value="finanzen">Finanzen</TabsTrigger>
          <TabsTrigger value="projekte">Projekte</TabsTrigger>
          <TabsTrigger value="mitarbeiter">Mitarbeiter</TabsTrigger>
        </TabsList>

        <TabsContent value="finanzen" className="space-y-4">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-gray-600">Finanz-Statistiken werden implementiert...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projekte" className="space-y-4">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-gray-600">Projekt-Statistiken werden implementiert...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitarbeiter" className="space-y-4">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-gray-600">Mitarbeiter-Statistiken werden implementiert...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

