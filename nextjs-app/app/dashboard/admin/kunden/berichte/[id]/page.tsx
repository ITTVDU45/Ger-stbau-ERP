'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  BarChart3,
  FileText,
  Receipt,
  FileWarning,
  Building2,
  ExternalLink,
  Download
} from 'lucide-react'
import { Kunde, KundenDetailBericht, ZeitraumFilter as ZeitraumFilterType } from '@/lib/db/types'
import ZeitraumFilter from '../components/ZeitraumFilter'
import KIBerichtPanel from './components/KIBerichtPanel'
import { exportKundenDetailBerichtToPDF } from '@/lib/services/pdfExportService'
import { toast } from 'sonner'

export default function KundenDetailBerichtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [kunde, setKunde] = useState<Kunde | null>(null)
  const [bericht, setBericht] = useState<KundenDetailBericht | null>(null)
  const [loading, setLoading] = useState(true)

  // Zeitraumfilter
  const [zeitraumTyp, setZeitraumTyp] = useState<ZeitraumFilterType['typ']>('aktuelles_jahr')
  const [vonDatum, setVonDatum] = useState('')
  const [bisDatum, setBisDatum] = useState('')

  useEffect(() => {
    loadData()
  }, [id, zeitraumTyp, vonDatum, bisDatum])

  const loadData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        zeitraumTyp
      })

      if (zeitraumTyp === 'benutzerdefiniert' && vonDatum && bisDatum) {
        params.append('von', vonDatum)
        params.append('bis', bisDatum)
      }

      const response = await fetch(`/api/kunden/${id}/detail-bericht?${params}`)
      const data = await response.json()

      if (data.erfolg) {
        setBericht(data.bericht)
        setKunde(data.bericht.kunde)
      } else {
        toast.error('Fehler beim Laden des Berichts')
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error)
      toast.error('Fehler beim Laden des Berichts')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !kunde || !bericht) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const kundeName = kunde.firma || `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="hover:bg-white/50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  Kundenbericht: {kundeName}
                </CardTitle>
                <CardDescription className="text-gray-700 mt-1">
                  {kunde.kundennummer && `Kundennummer: ${kunde.kundennummer} • `}
                  {kunde.email}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/admin/kunden/${id}`)}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Kundenprofil öffnen
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (bericht) {
                    exportKundenDetailBerichtToPDF(bericht)
                    toast.success('PDF-Export erfolgreich!')
                  }
                }}
                className="border-gray-600 text-gray-600 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Zeitraumfilter */}
      <ZeitraumFilter
        zeitraumTyp={zeitraumTyp}
        vonDatum={vonDatum}
        bisDatum={bisDatum}
        onZeitraumTypChange={setZeitraumTyp}
        onVonDatumChange={setVonDatum}
        onBisDatumChange={setBisDatum}
      />

      {/* KPI-Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Angebotsvolumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {bericht.kpis.angebotsvolumen.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rechnungsvolumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {bericht.kpis.rechnungsvolumen.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offener Betrag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {bericht.kpis.offenerBetrag.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Zahlungsquote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {bericht.kpis.zahlungsquote.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ø {bericht.kpis.durchschnittlicheZahlungszeit} Tage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KI-Bericht Panel mit Aktivitäts-Timeline */}
      <KIBerichtPanel
        kundeId={id}
        kundeName={kundeName}
        zeitraumTyp={zeitraumTyp}
        vonDatum={vonDatum}
        bisDatum={bisDatum}
        kundenBericht={bericht}
      />
    </div>
  )
}

