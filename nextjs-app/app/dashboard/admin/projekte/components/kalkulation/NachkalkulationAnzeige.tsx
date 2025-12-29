'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Nachkalkulation, Vorkalkulation } from '@/lib/db/types'
import { RefreshCw, Info } from 'lucide-react'
import KalkulationExportButton from './KalkulationExportButton'

interface NachkalkulationAnzeigeProps {
  projektId: string
  vorkalkulation?: Vorkalkulation
  nachkalkulation?: Nachkalkulation
  zugewieseneMitarbeiter?: any[]
  onUpdate: () => void
}

export default function NachkalkulationAnzeige({ 
  projektId, 
  vorkalkulation, 
  nachkalkulation,
  zugewieseneMitarbeiter,
  onUpdate 
}: NachkalkulationAnzeigeProps) {
  const [neuBerechnen, setNeuBerechnen] = useState(false)
  
  // Anzahl Mitarbeiter für Pro-MA-Berechnung SEPARAT für Aufbau und Abbau
  const anzahlMitarbeiterAufbau = zugewieseneMitarbeiter?.filter(m => 
    (m.stundenAufbau !== undefined && m.stundenAufbau !== null && m.stundenAufbau > 0)
  ).length || 1
  
  const anzahlMitarbeiterAbbau = zugewieseneMitarbeiter?.filter(m => 
    (m.stundenAbbau !== undefined && m.stundenAbbau !== null && m.stundenAbbau > 0)
  ).length || 1

  if (!vorkalkulation) {
    return (
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <Alert className="bg-yellow-50 border-yellow-200">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Erstellen Sie zunächst eine Vorkalkulation, um die Nachkalkulation zu aktivieren.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const handleNeuBerechnen = async () => {
    setNeuBerechnen(true)
    try {
      const response = await fetch(`/api/kalkulation/${projektId}/berechnen`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Nachkalkulation erfolgreich neu berechnet')
        onUpdate()
      } else {
        toast.error(data.fehler || 'Fehler bei der Neuberechnung')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler bei der Neuberechnung')
    } finally {
      setNeuBerechnen(false)
    }
  }

  const getBadgeClass = (prozent: number) => {
    // <100% = gut (weniger verbraucht), >100% = schlecht (mehr verbraucht)
    if (prozent < 90) {
      // Sehr gut: Deutlich weniger verbraucht (z.B. 44%)
      return 'bg-green-100 text-green-700 border-green-300'
    } else if (prozent >= 90 && prozent <= 110) {
      // Im Soll-Bereich (90-110%)
      return 'bg-green-100 text-green-700 border-green-300'
    } else if (prozent > 110 && prozent <= 120) {
      // Leicht über Soll
      return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    } else {
      // Deutlich über Soll (z.B. 251%)
      return 'bg-red-100 text-red-700 border-red-300'
    }
  }

  const getDifferenzClass = (differenz: number) => {
    // Positive Differenz = gut (weniger verbraucht als geplant)
    // Negative Differenz = schlecht (mehr verbraucht als geplant)
    return differenz > 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader className="bg-white">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Nachkalkulation</CardTitle>
            <CardDescription className="text-gray-600">
              Automatisch berechnet aus freigegebenen Zeiterfassungen
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <KalkulationExportButton projektId={projektId} />
            <Button
              variant="outline"
              onClick={handleNeuBerechnen}
              disabled={neuBerechnen}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${neuBerechnen ? 'animate-spin' : ''}`} />
              Neu berechnen
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 bg-white">
        {!nachkalkulation ? (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Noch keine Zeiterfassungen für dieses Projekt erfasst. 
              Die Nachkalkulation wird automatisch berechnet, sobald Zeiten erfasst und freigegeben wurden.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Haupt-Tabelle: Soll-Ist-Vergleich */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                    <TableHead className="font-bold text-gray-900 text-sm">Kategorie</TableHead>
                    <TableHead className="text-right font-bold text-gray-900 text-sm">Soll-Stunden<br />(PRO MA)</TableHead>
                    <TableHead className="text-right font-bold text-gray-900 text-sm">Ist-Stunden<br />(PRO MA)</TableHead>
                    <TableHead className="text-right font-bold text-gray-900 text-sm">Differenz<br />(PRO MA)</TableHead>
                    <TableHead className="text-right font-bold text-gray-900 text-sm">Soll-Umsatz<br />(PRO MA)</TableHead>
                    <TableHead className="text-right font-bold text-gray-900 text-sm">Ist-Umsatz<br />(PRO MA)</TableHead>
                    <TableHead className="text-right font-bold text-gray-900 text-sm">Differenz<br />(PRO MA)</TableHead>
                    <TableHead className="text-center font-bold text-gray-900 text-sm">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Aufbau */}
                  <TableRow className="bg-white hover:bg-gray-50">
                    <TableCell className="font-bold text-gray-900 text-base">Aufbau</TableCell>
                    <TableCell className="text-right text-gray-900 font-semibold text-base">
                      {(vorkalkulation.sollStundenAufbau / anzahlMitarbeiterAufbau).toFixed(2)} h
                      <div className="text-xs text-gray-500 font-normal">
                        {vorkalkulation.sollStundenAufbau.toFixed(2)} h gesamt
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 text-base">
                      {(nachkalkulation.istStundenAufbau / anzahlMitarbeiterAufbau).toFixed(2)} h
                      <div className="text-xs text-gray-500 font-normal">
                        {nachkalkulation.istStundenAufbau.toFixed(2)} h gesamt
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold text-base ${getDifferenzClass((vorkalkulation.sollStundenAufbau - nachkalkulation.istStundenAufbau) / anzahlMitarbeiterAufbau)}`}>
                      {((vorkalkulation.sollStundenAufbau - nachkalkulation.istStundenAufbau) / anzahlMitarbeiterAufbau) > 0 ? '+' : ''}
                      {((vorkalkulation.sollStundenAufbau - nachkalkulation.istStundenAufbau) / anzahlMitarbeiterAufbau).toFixed(1)} h
                    </TableCell>
                    <TableCell className="text-right text-gray-900 font-semibold text-base">
                      {(vorkalkulation.sollUmsatzAufbau / anzahlMitarbeiterAufbau).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      <div className="text-xs text-gray-500 font-normal">
                        {vorkalkulation.sollUmsatzAufbau.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € gesamt
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 text-base">
                      {(nachkalkulation.istUmsatzAufbau / anzahlMitarbeiterAufbau).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      <div className="text-xs text-gray-500 font-normal">
                        {nachkalkulation.istUmsatzAufbau.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € gesamt
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold text-base ${getDifferenzClass((vorkalkulation.sollUmsatzAufbau - nachkalkulation.istUmsatzAufbau) / anzahlMitarbeiterAufbau)}`}>
                      {((vorkalkulation.sollUmsatzAufbau - nachkalkulation.istUmsatzAufbau) / anzahlMitarbeiterAufbau) > 0 ? '+' : ''}
                      {((vorkalkulation.sollUmsatzAufbau - nachkalkulation.istUmsatzAufbau) / anzahlMitarbeiterAufbau).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={getBadgeClass(
                        vorkalkulation.sollStundenAufbau > 0 
                          ? (nachkalkulation.istStundenAufbau / vorkalkulation.sollStundenAufbau) * 100 
                          : 100
                      )}>
                        {vorkalkulation.sollStundenAufbau > 0 
                          ? ((nachkalkulation.istStundenAufbau / vorkalkulation.sollStundenAufbau) * 100).toFixed(1) 
                          : '100.0'}%
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Abbau */}
                  <TableRow className="bg-white hover:bg-gray-50">
                    <TableCell className="font-bold text-gray-900 text-base">Abbau</TableCell>
                    <TableCell className="text-right text-gray-900 font-semibold text-base">
                      {(vorkalkulation.sollStundenAbbau / anzahlMitarbeiterAbbau).toFixed(2)} h
                      <div className="text-xs text-gray-500 font-normal">
                        {vorkalkulation.sollStundenAbbau.toFixed(2)} h gesamt
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 text-base">
                      {(nachkalkulation.istStundenAbbau / anzahlMitarbeiterAbbau).toFixed(2)} h
                      <div className="text-xs text-gray-500 font-normal">
                        {nachkalkulation.istStundenAbbau.toFixed(2)} h gesamt
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold text-base ${getDifferenzClass((vorkalkulation.sollStundenAbbau - nachkalkulation.istStundenAbbau) / anzahlMitarbeiterAbbau)}`}>
                      {((vorkalkulation.sollStundenAbbau - nachkalkulation.istStundenAbbau) / anzahlMitarbeiterAbbau) > 0 ? '+' : ''}
                      {((vorkalkulation.sollStundenAbbau - nachkalkulation.istStundenAbbau) / anzahlMitarbeiterAbbau).toFixed(1)} h
                    </TableCell>
                    <TableCell className="text-right text-gray-900 font-semibold text-base">
                      {(vorkalkulation.sollUmsatzAbbau / anzahlMitarbeiterAbbau).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      <div className="text-xs text-gray-500 font-normal">
                        {vorkalkulation.sollUmsatzAbbau.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € gesamt
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 text-base">
                      {(nachkalkulation.istUmsatzAbbau / anzahlMitarbeiterAbbau).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      <div className="text-xs text-gray-500 font-normal">
                        {nachkalkulation.istUmsatzAbbau.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € gesamt
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold text-base ${getDifferenzClass((vorkalkulation.sollUmsatzAbbau - nachkalkulation.istUmsatzAbbau) / anzahlMitarbeiterAbbau)}`}>
                      {((vorkalkulation.sollUmsatzAbbau - nachkalkulation.istUmsatzAbbau) / anzahlMitarbeiterAbbau) > 0 ? '+' : ''}
                      {((vorkalkulation.sollUmsatzAbbau - nachkalkulation.istUmsatzAbbau) / anzahlMitarbeiterAbbau).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={getBadgeClass(
                        vorkalkulation.sollStundenAbbau > 0 
                          ? (nachkalkulation.istStundenAbbau / vorkalkulation.sollStundenAbbau) * 100 
                          : 100
                      )}>
                        {vorkalkulation.sollStundenAbbau > 0 
                          ? ((nachkalkulation.istStundenAbbau / vorkalkulation.sollStundenAbbau) * 100).toFixed(1) 
                          : '100.0'}%
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Gesamt (Summe) */}
                  <TableRow className="bg-gray-100 font-bold border-t-2 border-gray-300">
                    <TableCell className="text-gray-900 font-bold text-base">Gesamt</TableCell>
                    <TableCell className="text-right text-gray-900 font-bold text-base">
                      {((vorkalkulation.sollStundenAufbau / anzahlMitarbeiterAufbau) + (vorkalkulation.sollStundenAbbau / anzahlMitarbeiterAbbau)).toFixed(1)} h
                      <div className="text-xs text-gray-500 font-normal">
                        {(vorkalkulation.sollStundenAufbau + vorkalkulation.sollStundenAbbau).toFixed(1)} h gesamt
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-gray-900 font-bold text-base">
                      {((nachkalkulation.istStundenAufbau / anzahlMitarbeiterAufbau) + (nachkalkulation.istStundenAbbau / anzahlMitarbeiterAbbau)).toFixed(1)} h
                      <div className="text-xs text-gray-500 font-normal">
                        {(nachkalkulation.istStundenAufbau + nachkalkulation.istStundenAbbau).toFixed(1)} h gesamt
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold text-base ${getDifferenzClass(
                      ((vorkalkulation.sollStundenAufbau / anzahlMitarbeiterAufbau) + (vorkalkulation.sollStundenAbbau / anzahlMitarbeiterAbbau)) - 
                      ((nachkalkulation.istStundenAufbau / anzahlMitarbeiterAufbau) + (nachkalkulation.istStundenAbbau / anzahlMitarbeiterAbbau))
                    )}`}>
                      {((((vorkalkulation.sollStundenAufbau / anzahlMitarbeiterAufbau) + (vorkalkulation.sollStundenAbbau / anzahlMitarbeiterAbbau)) - 
                        ((nachkalkulation.istStundenAufbau / anzahlMitarbeiterAufbau) + (nachkalkulation.istStundenAbbau / anzahlMitarbeiterAbbau)))) > 0 ? '+' : ''}
                      {((((vorkalkulation.sollStundenAufbau / anzahlMitarbeiterAufbau) + (vorkalkulation.sollStundenAbbau / anzahlMitarbeiterAbbau)) - 
                        ((nachkalkulation.istStundenAufbau / anzahlMitarbeiterAufbau) + (nachkalkulation.istStundenAbbau / anzahlMitarbeiterAbbau)))).toFixed(1)} h
                    </TableCell>
                    <TableCell className="text-right text-gray-900 font-bold text-base">
                      {((vorkalkulation.sollUmsatzAufbau / anzahlMitarbeiterAufbau) + (vorkalkulation.sollUmsatzAbbau / anzahlMitarbeiterAbbau)).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      <div className="text-xs text-gray-500 font-normal">
                        {(vorkalkulation.sollUmsatzAufbau + vorkalkulation.sollUmsatzAbbau).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € gesamt
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-gray-900 font-bold text-base">
                      {((nachkalkulation.istUmsatzAufbau / anzahlMitarbeiterAufbau) + (nachkalkulation.istUmsatzAbbau / anzahlMitarbeiterAbbau)).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      <div className="text-xs text-gray-500 font-normal">
                        {(nachkalkulation.istUmsatzAufbau + nachkalkulation.istUmsatzAbbau).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € gesamt
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold text-base ${getDifferenzClass(
                      ((vorkalkulation.sollUmsatzAufbau / anzahlMitarbeiterAufbau) + (vorkalkulation.sollUmsatzAbbau / anzahlMitarbeiterAbbau)) - 
                      ((nachkalkulation.istUmsatzAufbau / anzahlMitarbeiterAufbau) + (nachkalkulation.istUmsatzAbbau / anzahlMitarbeiterAbbau))
                    )}`}>
                      {((((vorkalkulation.sollUmsatzAufbau / anzahlMitarbeiterAufbau) + (vorkalkulation.sollUmsatzAbbau / anzahlMitarbeiterAbbau)) - 
                        ((nachkalkulation.istUmsatzAufbau / anzahlMitarbeiterAufbau) + (nachkalkulation.istUmsatzAbbau / anzahlMitarbeiterAbbau)))) > 0 ? '+' : ''}
                      {((((vorkalkulation.sollUmsatzAufbau / anzahlMitarbeiterAufbau) + (vorkalkulation.sollUmsatzAbbau / anzahlMitarbeiterAbbau)) - 
                        ((nachkalkulation.istUmsatzAufbau / anzahlMitarbeiterAufbau) + (nachkalkulation.istUmsatzAbbau / anzahlMitarbeiterAbbau)))).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`${getBadgeClass(
                        (vorkalkulation.sollStundenAufbau + vorkalkulation.sollStundenAbbau) > 0
                          ? ((nachkalkulation.istStundenAufbau + nachkalkulation.istStundenAbbau) / 
                             (vorkalkulation.sollStundenAufbau + vorkalkulation.sollStundenAbbau) * 100)
                          : 100
                      )} text-base px-3 py-1`}>
                        {(vorkalkulation.sollStundenAufbau + vorkalkulation.sollStundenAbbau) > 0
                          ? (((nachkalkulation.istStundenAufbau + nachkalkulation.istStundenAbbau) / 
                              (vorkalkulation.sollStundenAufbau + vorkalkulation.sollStundenAbbau) * 100)).toFixed(1)
                          : '100.0'}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Info-Box */}
            <Alert className="bg-white border-gray-300">
              <Info className="h-4 w-4 text-gray-700" />
              <AlertDescription className="text-gray-900 text-sm font-medium">
                <strong className="text-gray-900">Legende Prozent (%):</strong> Grün = Gut ({'<'}110%), Gelb = Kritisch (110-120%), Rot = Über Budget ({'>'}120%).
                <br />
                <strong>Differenz:</strong> Positive Werte (grün) = weniger verbraucht als geplant (gut), Negative Werte (rot) = mehr verbraucht als geplant (schlecht).
              </AlertDescription>
            </Alert>

            {/* Datenquelle-Hinweis */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong className="text-blue-900">Datenquelle für Ist-Stunden:</strong> Die Ist-Stunden können aus zwei Quellen stammen:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Priorität 1: Mitarbeiter-Korrekturen</strong> - Falls im Mitarbeiter-Tab Korrekturwerte für Aufbau/Abbau-Stunden gesetzt wurden, werden diese verwendet</li>
                  <li><strong>Priorität 2: Zeiterfassungen</strong> - Ansonsten werden freigegebene Zeiterfassungen nach Tätigkeitstyp (Aufbau/Abbau) summiert</li>
                  <li>Zeiterfassungen ohne Tätigkeitstyp werden automatisch als <strong>"Aufbau"</strong> behandelt</li>
                  <li>Die Nachkalkulation wird automatisch neu berechnet, wenn Werte geändert werden</li>
                </ul>
                {nachkalkulation.istStundenAufbau === 0 && nachkalkulation.istStundenAbbau === 0 && (
                  <div className="mt-2 space-y-1">
                    <p>
                      <strong>Hinweis:</strong> Aktuell sind keine Ist-Stunden vorhanden. 
                      Sie können entweder:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Im Tab <strong>"Mitarbeiter"</strong> Korrekturwerte für Aufbau/Abbau-Stunden setzen (empfohlen für Admin-Korrekturen)</li>
                      <li>Zeiterfassungen erfassen und freigeben (automatische Berechnung aus tatsächlichen Stunden)</li>
                    </ul>
                    <p>
                      <strong>Tipp:</strong> Nach Änderungen klicken Sie auf <strong>"Neu berechnen"</strong> um die Nachkalkulation zu aktualisieren.
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  )
}

