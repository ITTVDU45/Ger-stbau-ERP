"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Angebot } from '@/lib/db/types'

interface AngebotKalkulationProps {
  formData: Partial<Angebot>
  onRabattChange: (prozent: number) => void
}

export default function AngebotKalkulation({ formData, onRabattChange }: AngebotKalkulationProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Kalkulation & Summen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-800 font-medium">Zwischensumme:</span>
            <span className="font-semibold text-gray-900 text-lg">
              {formData.zwischensumme?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-200">
            <Label htmlFor="rabatt" className="text-gray-800 font-medium">Rabatt (%):</Label>
            <div className="flex items-center gap-3">
              <Input
                id="rabatt"
                type="number"
                step="0.1"
                value={formData.rabattProzent || 0}
                onChange={(e) => onRabattChange(parseFloat(e.target.value) || 0)}
                className="w-24 text-right"
              />
              <span className="text-gray-700 w-40 text-right font-medium">
                - {formData.rabatt?.toLocaleString('de-DE', { minimumFractionDigits: 2 }) || '0,00'} €
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-3 border-b-2 border-gray-300">
            <span className="text-gray-800 font-semibold text-lg">Netto:</span>
            <span className="text-gray-900 font-bold text-lg">
              {formData.netto?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">MwSt. ({formData.mwstSatz}%):</span>
            <span className="text-gray-700 font-medium">
              {formData.mwstBetrag?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="flex justify-between items-center py-4 border-t-2 border-gray-400 bg-green-50 px-4 rounded-lg">
            <span className="text-xl font-bold text-gray-900">Gesamtsumme (Brutto):</span>
            <span className="text-2xl font-bold text-green-600">
              {formData.brutto?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

