"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Kunde } from '@/lib/db/types'
import { Briefcase, FileText, DollarSign, AlertCircle, Brain, Building, List, Mail, Phone, User } from 'lucide-react'

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

      {/* KI-Website-Analyse (nur bei AI-Import) */}
      {kunde.source === 'ai_import' && kunde.websiteAnalyse && (
        <>
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-gray-900">KI-Website-Analyse</CardTitle>
                <Badge className="bg-purple-600 text-white ml-auto">Automatisch extrahiert</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Unternehmensbeschreibung */}
              {kunde.websiteAnalyse.beschreibung && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-4 w-4 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-900">Unternehmensbeschreibung</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-lg border border-purple-100">
                    {kunde.websiteAnalyse.beschreibung}
                  </p>
                </div>
              )}

              {/* Dienstleistungen */}
              {kunde.websiteAnalyse.dienstleistungen && kunde.websiteAnalyse.dienstleistungen.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <List className="h-4 w-4 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-900">Dienstleistungen</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {kunde.websiteAnalyse.dienstleistungen.map((service, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white border-purple-300 text-purple-700">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ansprechpartner aus Website-Analyse */}
          {kunde.websiteAnalyse.ansprechpartner && kunde.websiteAnalyse.ansprechpartner.length > 0 && (
            <Card className="bg-white border-purple-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-gray-900">Ansprechpartner (von Website extrahiert)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {kunde.websiteAnalyse.ansprechpartner.map((person, idx) => (
                    <Card key={idx} className="bg-purple-50/50 border-purple-200">
                      <CardContent className="pt-4 space-y-2">
                        <p className="font-semibold text-gray-900">
                          {person.vorname} {person.nachname}
                        </p>
                        {person.position && (
                          <p className="text-xs text-gray-600">{person.position}</p>
                        )}
                        <Separator className="my-2" />
                        {person.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-purple-600" />
                            <a 
                              href={`mailto:${person.email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {person.email}
                            </a>
                          </div>
                        )}
                        {person.telefon && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-purple-600" />
                            <span className="text-gray-900 font-mono">{person.telefon}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weitere extrahierte Kontaktdaten */}
          {((kunde.websiteAnalyse.extractedEmails && kunde.websiteAnalyse.extractedEmails.length > 0) ||
            (kunde.websiteAnalyse.extractedPhones && kunde.websiteAnalyse.extractedPhones.length > 0)) && (
            <Card className="bg-white border-purple-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-gray-900">Weitere Kontaktdaten (von Website)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {kunde.websiteAnalyse.extractedEmails && kunde.websiteAnalyse.extractedEmails.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">E-Mail-Adressen</p>
                    <div className="space-y-1">
                      {kunde.websiteAnalyse.extractedEmails.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-purple-600 flex-shrink-0" />
                          <a 
                            href={`mailto:${email}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {kunde.websiteAnalyse.extractedPhones && kunde.websiteAnalyse.extractedPhones.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Telefonnummern</p>
                    <div className="space-y-1">
                      {kunde.websiteAnalyse.extractedPhones.map((phone, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-purple-600 flex-shrink-0" />
                          <span className="text-sm text-gray-900 font-mono">{phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

