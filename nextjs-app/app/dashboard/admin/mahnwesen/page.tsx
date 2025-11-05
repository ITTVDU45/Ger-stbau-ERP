"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MahnwesenPage() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-900">Mahnwesen</CardTitle>
          <CardDescription className="text-gray-700">
            Verwalten Sie Mahnungen und überfällige Rechnungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Mahnwesen-Modul wird implementiert...</p>
        </CardContent>
      </Card>
    </div>
  )
}

