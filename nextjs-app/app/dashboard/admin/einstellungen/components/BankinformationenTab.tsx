"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CreditCard, Save } from 'lucide-react'
import { CompanySettings } from '@/lib/db/types'

interface BankinformationenTabProps {
  settings: Partial<CompanySettings>
  onChange: (field: keyof CompanySettings, value: any) => void
  onSave: () => void
  saving: boolean
}

export default function BankinformationenTab({ settings, onChange, onSave, saving }: BankinformationenTabProps) {
  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <CreditCard className="h-5 w-5 text-green-600" />
          Bankinformationen
        </CardTitle>
        <CardDescription className="text-gray-700">
          Bankverbindung für Rechnungen und Zahlungsbedingungen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bankverbindung */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Bankverbindung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bankname" className="text-gray-900 font-medium">Bankname *</Label>
              <Input
                id="bankname"
                value={settings.bankname || ''}
                onChange={(e) => onChange('bankname', e.target.value)}
                placeholder="z.B. Sparkasse Berlin"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="iban" className="text-gray-900 font-medium">IBAN *</Label>
              <Input
                id="iban"
                value={settings.iban || ''}
                onChange={(e) => onChange('iban', e.target.value.toUpperCase())}
                placeholder="DE89370400440532013000"
                className="bg-white border-gray-300 text-gray-900 font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bic" className="text-gray-900 font-medium">BIC *</Label>
              <Input
                id="bic"
                value={settings.bic || ''}
                onChange={(e) => onChange('bic', e.target.value.toUpperCase())}
                placeholder="COBADEFFXXX"
                className="bg-white border-gray-300 text-gray-900 font-mono"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="istStandardKonto"
              checked={settings.istStandardKonto || false}
              onCheckedChange={(checked) => onChange('istStandardKonto', checked)}
            />
            <Label htmlFor="istStandardKonto" className="text-gray-900 font-medium cursor-pointer">
              Als Standard-Bankkonto festlegen
            </Label>
          </div>
        </div>

        {/* Zahlungsbedingungen */}
        <div className="space-y-4 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Zahlungsbedingungen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zahlungsziel" className="text-gray-900 font-medium">Zahlungsziel (Tage) *</Label>
              <Input
                id="zahlungsziel"
                type="number"
                min="0"
                value={settings.zahlungsziel || ''}
                onChange={(e) => onChange('zahlungsziel', parseInt(e.target.value) || 0)}
                placeholder="z.B. 14"
                className="bg-white border-gray-300 text-gray-900"
              />
              <p className="text-xs text-gray-600">Standard: 14 oder 30 Tage</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="skontoTage" className="text-gray-900 font-medium">Skonto Tage</Label>
              <Input
                id="skontoTage"
                type="number"
                min="0"
                value={settings.skontoTage || ''}
                onChange={(e) => onChange('skontoTage', parseInt(e.target.value) || undefined)}
                placeholder="z.B. 7"
                className="bg-white border-gray-300 text-gray-900"
              />
              <p className="text-xs text-gray-600">Optional: Tage für Skonto</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="skontoProzent" className="text-gray-900 font-medium">Skonto %</Label>
              <Input
                id="skontoProzent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.skontoProzent || ''}
                onChange={(e) => onChange('skontoProzent', parseFloat(e.target.value) || undefined)}
                placeholder="z.B. 2"
                className="bg-white border-gray-300 text-gray-900"
              />
              <p className="text-xs text-gray-600">Optional: Skonto-Prozentsatz</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="verwendungszweck" className="text-gray-900 font-medium">Standard-Verwendungszweck</Label>
            <Input
              id="verwendungszweck"
              value={settings.verwendungszweck || ''}
              onChange={(e) => onChange('verwendungszweck', e.target.value)}
              placeholder="z.B. Rechnung Nr. {{rechnungsnummer}}"
              className="bg-white border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-600">
              Platzhalter: {`{{rechnungsnummer}}, {{kundennummer}}`}
            </p>
          </div>
        </div>

        {/* Beispiel-Vorschau */}
        {settings.iban && settings.bic && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vorschau auf Rechnung</h3>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-900"><span className="font-medium">Bank:</span> {settings.bankname}</p>
              <p className="text-sm text-gray-900 font-mono"><span className="font-medium">IBAN:</span> {settings.iban}</p>
              <p className="text-sm text-gray-900 font-mono"><span className="font-medium">BIC:</span> {settings.bic}</p>
              {settings.zahlungsziel && (
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Zahlungsziel:</span> {settings.zahlungsziel} Tage netto
                </p>
              )}
              {settings.skontoTage && settings.skontoProzent && (
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Skonto:</span> {settings.skontoProzent}% bei Zahlung innerhalb von {settings.skontoTage} Tagen
                </p>
              )}
            </div>
          </div>
        )}

        {/* Speichern-Button */}
        <div className="border-t border-gray-200 pt-6 flex justify-end">
          <Button 
            onClick={onSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            <span className="font-medium">{saving ? 'Speichere...' : 'Bankinformationen speichern'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

