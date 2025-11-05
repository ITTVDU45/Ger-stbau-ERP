"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Kunde } from '@/lib/db/types'
import { Briefcase, FileText, DollarSign, AlertCircle } from 'lucide-react'

interface KundenUebersichtProps {
  kundeId: string
  kunde: Kunde
}

export default function KundenUebersicht({ kundeId, kunde }: KundenUebersichtProps) {
  return (
    <div className="space-y-6">
      {/* KPI-Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Projekte</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kunde.anzahlProjekte || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Gesamt</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Angebote</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kunde.anzahlAngebote || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Erstellt</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Gesamtumsatz</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(kunde.umsatzGesamt || 0).toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
            </div>
            <p className="text-xs text-gray-600 mt-1">Bezahlte Rechnungen</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Offene Posten</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(kunde.offenePosten || 0).toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
            </div>
            <p className="text-xs text-gray-600 mt-1">Noch offen</p>
          </CardContent>
        </Card>
      </div>

      {/* Kundendaten */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Kundendaten</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Firmenname</p>
            <p className="text-base font-semibold text-gray-900">{kunde.firma || '-'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-600">Kundentyp</p>
            <p className="text-base font-semibold text-gray-900">
              {kunde.kundentyp === 'privat' ? 'Privat' : 
               kunde.kundentyp === 'gewerblich' ? 'Gewerblich' : 'Öffentlich'}
            </p>
          </div>

          {kunde.ansprechpartner && (kunde.ansprechpartner.vorname || kunde.ansprechpartner.nachname) && (
            <>
              <div>
                <p className="text-sm font-medium text-gray-600">Ansprechpartner</p>
                <p className="text-base font-semibold text-gray-900">
                  {kunde.ansprechpartner.vorname} {kunde.ansprechpartner.nachname}
                </p>
                {kunde.ansprechpartner.position && (
                  <p className="text-sm text-gray-700">{kunde.ansprechpartner.position}</p>
                )}
              </div>

              {kunde.ansprechpartner.telefon && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Telefon Ansprechpartner</p>
                  <p className="text-base font-semibold text-gray-900">{kunde.ansprechpartner.telefon}</p>
                </div>
              )}
            </>
          )}

          {kunde.adresse && (kunde.adresse.strasse || kunde.adresse.ort) && (
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-600">Adresse</p>
              <p className="text-base font-semibold text-gray-900">
                {kunde.adresse.strasse} {kunde.adresse.hausnummer}
                {kunde.adresse.plz || kunde.adresse.ort ? <br /> : ''}
                {kunde.adresse.plz} {kunde.adresse.ort}
              </p>
            </div>
          )}

          {kunde.notizen && (
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-600">Notizen</p>
              <p className="text-base text-gray-800 whitespace-pre-wrap">{kunde.notizen}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

