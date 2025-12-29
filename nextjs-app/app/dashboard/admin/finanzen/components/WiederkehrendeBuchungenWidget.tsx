'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'

interface WiederkehrendeBuchungenWidgetProps {
  mandantId?: string | null
  onBuchungErstellt?: () => void
}

export default function WiederkehrendeBuchungenWidget({
  mandantId,
  onBuchungErstellt
}: WiederkehrendeBuchungenWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [faelligeBuchungen, setFaelligeBuchungen] = useState<any[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadFaelligeBuchungen()
  }, [mandantId])

  const loadFaelligeBuchungen = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (mandantId) params.append('mandantId', mandantId)

      const res = await fetch(`/api/finanzen/wiederkehrend/faellig?${params}`)
      const data = await res.json()

      if (data.erfolg) {
        setFaelligeBuchungen(data.buchungen)
      }
    } catch (error) {
      console.error('Fehler beim Laden fälliger Buchungen:', error)
    } finally {
      setLoading(false)
    }
  }

  const buchungErstellen = async (id: string) => {
    try {
      setProcessing(id)
      
      const res = await fetch(`/api/finanzen/wiederkehrend/${id}/buchen`, {
        method: 'POST'
      })

      const data = await res.json()

      if (data.erfolg) {
        toast.success('Buchung erfolgreich erstellt')
        await loadFaelligeBuchungen()
        onBuchungErstellt?.()
      } else {
        toast.error(data.fehler || 'Fehler beim Erstellen der Buchung')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Erstellen der Buchung')
    } finally {
      setProcessing(null)
    }
  }

  const buchungIgnorieren = async (id: string) => {
    try {
      // Aktualisiere erinnerungAngezeigt Flag
      const res = await fetch(`/api/finanzen/wiederkehrend/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erinnerungAngezeigt: true,
          letzteErinnerungAm: new Date()
        })
      })

      if (res.ok) {
        toast.info('Buchung für heute ignoriert')
        await loadFaelligeBuchungen()
      }
    } catch (error) {
      console.error('Fehler:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'dd.MM.yyyy', { locale: de })
  }

  const getIntervallLabel = (intervall: string) => {
    const labels: Record<string, string> = {
      taeglich: 'Täglich',
      woechentlich: 'Wöchentlich',
      monatlich: 'Monatlich',
      quartal: 'Quartalsweise',
      jaehrlich: 'Jährlich'
    }
    return labels[intervall] || intervall
  }

  if (loading) {
    return (
      <Card className="p-6 bg-white border-2 border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
      </Card>
    )
  }

  if (faelligeBuchungen.length === 0) {
    return null // Widget ausblenden wenn keine fälligen Buchungen
  }

  return (
    <Card className="p-6 border-2 border-orange-200 bg-orange-50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Fällige wiederkehrende Buchungen
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {faelligeBuchungen.length} Buchung(en) warten auf Ihre Bestätigung
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadFaelligeBuchungen}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {faelligeBuchungen.map((buchung) => (
          <Alert key={buchung._id} className="bg-white border-orange-300">
            <AlertDescription>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={buchung.typ === 'einnahme' ? 'default' : 'destructive'}>
                      {buchung.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe'}
                    </Badge>
                    <Badge variant="outline">{getIntervallLabel(buchung.intervall)}</Badge>
                  </div>
                  <div className="font-semibold text-gray-900 mb-1">
                    {buchung.name}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {buchung.beschreibung}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold">
                      {formatCurrency(buchung.betrag)}
                    </span>
                    <span className="text-gray-500">
                      📁 {buchung.kategorieName}
                    </span>
                    <span className="text-gray-500">
                      📅 Fällig: {formatDate(buchung.naechstesFaelligkeitsdatum)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => buchungErstellen(buchung._id)}
                    disabled={processing === buchung._id}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Buchen
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => buchungIgnorieren(buchung._id)}
                    disabled={processing === buchung._id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Ignorieren
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </Card>
  )
}

