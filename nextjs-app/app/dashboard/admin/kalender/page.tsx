"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function KalenderPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Kalender & Einsatzplanung</CardTitle>
          <CardDescription>
            Planen Sie Einsätze und Termine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Kalender-Modul wird geladen... (FullCalendar-Integration folgt)</p>
        </CardContent>
      </Card>
    </div>
  )
}

