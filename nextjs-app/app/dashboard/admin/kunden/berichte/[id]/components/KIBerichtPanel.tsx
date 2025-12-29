'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Sparkles, Download, Clock, TrendingUp, AlertCircle, CheckCircle, ArrowRight, Loader2, ClipboardList, FileText, Receipt, FileWarning, Building2, BarChart3 } from 'lucide-react'
import { KIBerichtSnapshot, KundenDetailBericht } from '@/lib/db/types'
import { exportKundenDetailBerichtToPDF } from '@/lib/services/pdfExportService'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'

interface KIBerichtPanelProps {
  kundeId: string
  kundeName: string
  zeitraumTyp: string
  vonDatum: string
  bisDatum: string
  benutzer?: string
  kundenBericht?: KundenDetailBericht
}

export default function KIBerichtPanel({
  kundeId,
  kundeName,
  zeitraumTyp,
  vonDatum,
  bisDatum,
  benutzer = 'current-user',
  kundenBericht
}: KIBerichtPanelProps) {
  const [bericht, setBericht] = useState<KIBerichtSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)

  useEffect(() => {
    loadExistingBericht()
  }, [kundeId])

  const loadExistingBericht = async () => {
    try {
      setLoadingExisting(true)
      const response = await fetch(`/api/kunden/${kundeId}/ki-bericht`)
      const data = await response.json()
      if (data.erfolg) {
        setBericht(data.bericht)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Berichts:', error)
    } finally {
      setLoadingExisting(false)
    }
  }

  const generateBericht = async () => {
    try {
      setLoading(true)
      toast.info('KI-Bericht wird generiert... Dies kann bis zu 30 Sekunden dauern.')

      const response = await fetch(`/api/kunden/${kundeId}/ki-bericht`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zeitraumTyp,
          von: vonDatum,
          bis: bisDatum,
          benutzer
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        setBericht(data.bericht)
        toast.success('KI-Bericht wurde erfolgreich generiert!')
      } else {
        toast.error(data.fehler || 'Fehler beim Generieren des Berichts')
      }
    } catch (error) {
      console.error('Fehler beim Generieren:', error)
      toast.error('Fehler beim Generieren des Berichts')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = () => {
    if (kundenBericht && bericht) {
      exportKundenDetailBerichtToPDF(kundenBericht, bericht)
      toast.success('PDF-Export erfolgreich!')
    } else {
      toast.error('Bericht nicht verfügbar')
    }
  }

  if (loadingExisting) {
    return (
      <Card className="bg-linear-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    )
  }

  if (!bericht) {
    return (
      <Card className="bg-linear-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            KI-Bericht
          </CardTitle>
          <CardDescription className="text-gray-700">
            Lassen Sie sich einen intelligenten Bericht über {kundeName} generieren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50 border-blue-200 text-blue-900 mb-4">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <AlertTitle>Powered by GPT-4 Turbo</AlertTitle>
            <AlertDescription>
              Der KI-Assistent analysiert alle Daten im ausgewählten Zeitraum und erstellt einen
              strukturierten Bericht mit Executive Summary, Finanzen, Projekten, Risiken und konkreten Handlungsempfehlungen.
            </AlertDescription>
          </Alert>
          <Button
            onClick={generateBericht}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bericht wird generiert...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                KI-Bericht jetzt generieren
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Metadaten */}
      <Card className="bg-linear-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                KI-Bericht für {kundeName}
              </CardTitle>
              <CardDescription className="text-gray-700 mt-1">
                {bericht.zeitraumBeschreibung}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={generateBericht}
                disabled={loading}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Neu generieren
              </Button>
              <Button
                onClick={downloadPDF}
                variant="outline"
                className="border-gray-600 text-gray-600 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Erstellt am {format(new Date(bericht.generiertAm), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>•</span>
              <span>Generiert von {bericht.generiertVon}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>•</span>
              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                Version {bericht.version}
              </Badge>
            </div>
            {bericht.tokenCount && (
              <div className="flex items-center gap-1">
                <span>•</span>
                <span>{bericht.tokenCount} Tokens</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aktivitäts-Timeline */}
      {kundenBericht && kundenBericht.aktivitaeten && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Aktivitäts-Timeline
            </CardTitle>
            <CardDescription className="text-gray-600">
              Letzte Aktivitäten im ausgewählten Zeitraum
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kundenBericht.aktivitaeten.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Keine Aktivitäten im ausgewählten Zeitraum
                </p>
              ) : (
                kundenBericht.aktivitaeten.map((aktivitaet) => (
                  <div
                    key={aktivitaet._id}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="mt-1">
                      {aktivitaet.typ === 'anfrage' && <ClipboardList className="h-5 w-5 text-gray-600" />}
                      {aktivitaet.typ === 'angebot' && <FileText className="h-5 w-5 text-blue-600" />}
                      {aktivitaet.typ === 'rechnung' && <Receipt className="h-5 w-5 text-green-600" />}
                      {aktivitaet.typ === 'mahnung' && <FileWarning className="h-5 w-5 text-red-600" />}
                      {aktivitaet.typ === 'projekt' && <Building2 className="h-5 w-5 text-purple-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{aktivitaet.titel}</p>
                          <p className="text-sm text-gray-600">{aktivitaet.beschreibung}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {aktivitaet.status && (
                              <Badge variant="outline" className="text-xs">
                                {aktivitaet.status}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(aktivitaet.zeitpunkt).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </div>
                        {aktivitaet.betrag && (
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {aktivitaet.betrag.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{bericht.bericht.executiveSummary}</p>
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg text-green-900 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {bericht.bericht.highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-2 text-green-900">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Aktivitäten */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{bericht.bericht.aktivitaeten}</p>
          </CardContent>
        </Card>

        {/* Finanzen */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Finanzen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{bericht.bericht.finanzen}</p>
          </CardContent>
        </Card>

        {/* Projekte */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Projekte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{bericht.bericht.projekte}</p>
          </CardContent>
        </Card>

        {/* Risiken & Empfehlungen */}
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg text-orange-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Risiken & Empfehlungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-900 leading-relaxed">{bericht.bericht.risikenUndEmpfehlungen}</p>
          </CardContent>
        </Card>
      </div>

      {/* Offene Punkte */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-lg text-yellow-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Offene Punkte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {bericht.bericht.offenePunkte.map((punkt, idx) => (
              <li key={idx} className="flex items-start gap-2 text-yellow-900">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <span>{punkt}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Nächste Schritte */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            Nächste Schritte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {bericht.bericht.naechsteSchritte.map((schritt, idx) => (
              <li key={idx} className="flex items-start gap-2 text-blue-900">
                <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <span>{schritt}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Data Snapshot */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-700">Daten-Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Anfragen</p>
              <p className="font-bold text-gray-900">{bericht.datenSnapshot.anzahlAnfragen}</p>
            </div>
            <div>
              <p className="text-gray-600">Projekte</p>
              <p className="font-bold text-gray-900">{bericht.datenSnapshot.anzahlProjekte}</p>
            </div>
            <div>
              <p className="text-gray-600">Mahnungen</p>
              <p className="font-bold text-gray-900">{bericht.datenSnapshot.anzahlMahnungen}</p>
            </div>
            <div>
              <p className="text-gray-600">Umsatz</p>
              <p className="font-bold text-gray-900">
                {bericht.datenSnapshot.gesamtumsatz.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

