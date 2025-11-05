"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function BuchhaltungPage() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Buchhaltung</CardTitle>
              <CardDescription className="text-gray-700">
                DATEV-Export, Archivierung und Audit-Logs
              </CardDescription>
            </div>
            <Button className="bg-gray-600 hover:bg-gray-700">
              <Download className="h-4 w-4 mr-2" />
              DATEV-Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Buchhaltungs-Modul wird implementiert...</p>
        </CardContent>
      </Card>
    </div>
  )
}

