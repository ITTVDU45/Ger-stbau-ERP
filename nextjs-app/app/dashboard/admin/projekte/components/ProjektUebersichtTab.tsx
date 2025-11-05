'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Projekt } from '@/lib/db/types'
import { Home, Building2, Layers, Package } from 'lucide-react'

interface ProjektUebersichtTabProps {
  projekt: Projekt
}

export default function ProjektUebersichtTab({ projekt }: ProjektUebersichtTabProps) {
  const arbeitstypenBadges = []
  
  // Defensive checks für Legacy-Daten
  const arbeitstypen = projekt.bauvorhaben?.arbeitstypen || {}
  
  if (arbeitstypen.dach) {
    arbeitstypenBadges.push(
      <Badge key="dach" variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 flex items-center gap-1">
        <Home className="h-3 w-3" />
        Dach
      </Badge>
    )
  }
  
  if (arbeitstypen.fassade) {
    arbeitstypenBadges.push(
      <Badge key="fassade" variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        Fassade
      </Badge>
    )
  }
  
  if (arbeitstypen.daemmung) {
    arbeitstypenBadges.push(
      <Badge key="daemmung" variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 flex items-center gap-1">
        <Layers className="h-3 w-3" />
        Dämmung
      </Badge>
    )
  }
  
  if (arbeitstypen.sonderaufbau) {
    arbeitstypenBadges.push(
      <Badge key="sonderaufbau" variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 flex items-center gap-1">
        <Package className="h-3 w-3" />
        Sonderaufbau
      </Badge>
    )
  }

  const abrechnungsProzent = projekt.angebotssumme && projekt.bereitsAbgerechnet
    ? (projekt.bereitsAbgerechnet / projekt.angebotssumme) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Bauvorhabeninformationen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Bauvorhabeninformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Adresse</p>
            <p className="text-base font-medium text-gray-900">
              {projekt.bauvorhaben?.adresse || 'Nicht angegeben'}<br />
              {projekt.bauvorhaben?.plz} {projekt.bauvorhaben?.ort}
            </p>
          </div>
          
          {projekt.bauvorhaben?.beschreibung && (
            <div>
              <p className="text-sm text-gray-600">Beschreibung</p>
              <p className="text-base text-gray-900">{projekt.bauvorhaben.beschreibung}</p>
            </div>
          )}
          
          {arbeitstypenBadges.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Art der Arbeiten</p>
              <div className="flex flex-wrap gap-2">
                {arbeitstypenBadges}
              </div>
              {arbeitstypen.beschreibung && (
                <p className="text-sm text-gray-700 mt-2">{arbeitstypen.beschreibung}</p>
              )}
            </div>
          )}

          {projekt.bauvorhaben?.geruestseiten && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Gerüstseiten</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${projekt.bauvorhaben.geruestseiten.vorderseite ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-900">Vorderseite</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${projekt.bauvorhaben.geruestseiten.rueckseite ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-900">Rückseite</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${projekt.bauvorhaben.geruestseiten.rechts ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-900">Rechte Seite</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${projekt.bauvorhaben.geruestseiten.links ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-900">Linke Seite</span>
                </div>
              </div>
              {projekt.bauvorhaben.geruestseiten.gesamtflaeche && projekt.bauvorhaben.geruestseiten.gesamtflaeche > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Gesamtfläche</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projekt.bauvorhaben.geruestseiten.gesamtflaeche} m²
                  </p>
                </div>
              )}
            </div>
          )}

          {projekt.bauvorhaben?.besonderheiten && (
            <div>
              <p className="text-sm text-gray-600">Besonderheiten</p>
              <p className="text-base text-gray-900">{projekt.bauvorhaben.besonderheiten}</p>
            </div>
          )}

          {projekt.bauvorhaben?.zufahrtsbeschraenkungen && (
            <div>
              <p className="text-sm text-gray-600">Zufahrtsbeschränkungen</p>
              <p className="text-base text-gray-900">{projekt.bauvorhaben.zufahrtsbeschraenkungen}</p>
            </div>
          )}

          {projekt.bauvorhaben?.sicherheitsanforderungen && (
            <div>
              <p className="text-sm text-gray-600">Sicherheitsanforderungen</p>
              <p className="text-base text-gray-900">{projekt.bauvorhaben.sicherheitsanforderungen}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finanzübersicht */}
      {projekt.angebotssumme && projekt.angebotssumme > 0 && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Finanzübersicht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Angebotssumme</p>
                <p className="text-xl font-bold text-gray-900">
                  {projekt.angebotssumme.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bereits abgerechnet</p>
                <p className="text-xl font-bold text-blue-900">
                  {(projekt.bereitsAbgerechnet || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Offener Betrag</p>
                <p className="text-xl font-bold text-orange-900">
                  {(projekt.offenerBetrag || projekt.angebotssumme).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-600">Abrechnungsfortschritt</p>
                <p className="text-sm font-medium text-gray-900">{abrechnungsProzent.toFixed(0)}%</p>
              </div>
              <Progress value={abrechnungsProzent} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projektstatus & Termine */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Projektstatus & Termine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Startdatum</p>
              <p className="text-base font-medium text-gray-900">
                {projekt.startdatum 
                  ? new Date(projekt.startdatum).toLocaleDateString('de-DE')
                  : 'Nicht festgelegt'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Enddatum</p>
              <p className="text-base font-medium text-gray-900">
                {projekt.enddatum 
                  ? new Date(projekt.enddatum).toLocaleDateString('de-DE')
                  : 'Offen'
                }
              </p>
            </div>
          </div>

          {projekt.verantwortlicher && (
            <div>
              <p className="text-sm text-gray-600">Verantwortlicher / Bauleiter</p>
              <p className="text-base font-medium text-gray-900">{projekt.bauleiter || projekt.verantwortlicher}</p>
            </div>
          )}

          {projekt.notizen && (
            <div>
              <p className="text-sm text-gray-600">Notizen</p>
              <p className="text-base text-gray-900 whitespace-pre-wrap">{projekt.notizen}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

