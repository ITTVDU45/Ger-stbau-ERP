"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building, Save } from 'lucide-react'
import { CompanySettings } from '@/lib/db/types'
import { toast } from 'sonner'

interface FirmendatenTabProps {
  settings: Partial<CompanySettings>
  onChange: (field: keyof CompanySettings, value: any) => void
  onSave: () => void
  saving: boolean
}

export default function FirmendatenTab({ settings, onChange, onSave, saving }: FirmendatenTabProps) {
  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Building className="h-5 w-5 text-blue-600" />
          Firmendaten
        </CardTitle>
        <CardDescription className="text-gray-700">
          Grundlegende Informationen über Ihr Unternehmen, die auf Angeboten und Rechnungen erscheinen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Firma & Adresse */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Firmeninformationen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="firmenname" className="text-gray-900 font-medium">Firmenname *</Label>
              <Input
                id="firmenname"
                value={settings.firmenname || ''}
                onChange={(e) => onChange('firmenname', e.target.value)}
                placeholder="z.B. Gerüstbau Mustermann GmbH"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="strasse" className="text-gray-900 font-medium">Straße & Hausnummer *</Label>
              <Input
                id="strasse"
                value={settings.strasse || ''}
                onChange={(e) => onChange('strasse', e.target.value)}
                placeholder="z.B. Musterstraße 123"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plz" className="text-gray-900 font-medium">Postleitzahl *</Label>
              <Input
                id="plz"
                value={settings.plz || ''}
                onChange={(e) => onChange('plz', e.target.value)}
                placeholder="12345"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ort" className="text-gray-900 font-medium">Ort *</Label>
              <Input
                id="ort"
                value={settings.ort || ''}
                onChange={(e) => onChange('ort', e.target.value)}
                placeholder="z.B. Berlin"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="land" className="text-gray-900 font-medium">Land *</Label>
              <Input
                id="land"
                value={settings.land || ''}
                onChange={(e) => onChange('land', e.target.value)}
                placeholder="z.B. Deutschland"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Kontaktdaten */}
        <div className="space-y-4 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Kontaktdaten</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefon" className="text-gray-900 font-medium">Telefon *</Label>
              <Input
                id="telefon"
                type="tel"
                value={settings.telefon || ''}
                onChange={(e) => onChange('telefon', e.target.value)}
                placeholder="+49 123 456789"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 font-medium">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ''}
                onChange={(e) => onChange('email', e.target.value)}
                placeholder="info@firma.de"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website" className="text-gray-900 font-medium">Website</Label>
              <Input
                id="website"
                type="url"
                value={settings.website || ''}
                onChange={(e) => onChange('website', e.target.value)}
                placeholder="https://www.firma.de"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Rechtliche Angaben */}
        <div className="space-y-4 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Rechtliche Angaben</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="geschaeftsfuehrer" className="text-gray-900 font-medium">Geschäftsführer *</Label>
              <Input
                id="geschaeftsfuehrer"
                value={settings.geschaeftsfuehrer || ''}
                onChange={(e) => onChange('geschaeftsfuehrer', e.target.value)}
                placeholder="Max Mustermann"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="steuernummer" className="text-gray-900 font-medium">Steuernummer *</Label>
              <Input
                id="steuernummer"
                value={settings.steuernummer || ''}
                onChange={(e) => onChange('steuernummer', e.target.value)}
                placeholder="123/456/78901"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ustId" className="text-gray-900 font-medium">USt-ID *</Label>
              <Input
                id="ustId"
                value={settings.ustId || ''}
                onChange={(e) => onChange('ustId', e.target.value)}
                placeholder="DE123456789"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="handelsregister" className="text-gray-900 font-medium">Handelsregister</Label>
              <Input
                id="handelsregister"
                value={settings.handelsregister || ''}
                onChange={(e) => onChange('handelsregister', e.target.value)}
                placeholder="HRB 123456"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amtsgericht" className="text-gray-900 font-medium">Amtsgericht</Label>
              <Input
                id="amtsgericht"
                value={settings.amtsgericht || ''}
                onChange={(e) => onChange('amtsgericht', e.target.value)}
                placeholder="z.B. Berlin-Charlottenburg"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Footer-Text */}
        <div className="space-y-4 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Dokument-Footer</h3>
          <div className="space-y-2">
            <Label htmlFor="footerText" className="text-gray-900 font-medium">Rechtliche Hinweise für Dokumente</Label>
            <Textarea
              id="footerText"
              value={settings.footerText || ''}
              onChange={(e) => onChange('footerText', e.target.value)}
              placeholder="z.B. Alle Preise verstehen sich zzgl. der gesetzlichen MwSt. Diese Angebotsunterlage ist urheberrechtlich geschützt..."
              rows={4}
              className="bg-white border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-600">
              Dieser Text erscheint im Footer aller PDF-Dokumente (Angebote, Rechnungen)
            </p>
          </div>
        </div>

        {/* Speichern-Button */}
        <div className="border-t border-gray-200 pt-6 flex justify-end">
          <Button 
            onClick={onSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            <span className="font-medium">{saving ? 'Speichere...' : 'Firmendaten speichern'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

