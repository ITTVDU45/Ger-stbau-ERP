"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, Loader2, Download, RefreshCw, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { KIBerichtSnapshot, ZeitraumFilter } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface KIBerichtPanelProps {
  kundeId: string
  zeitraumFilter: ZeitraumFilter
}

export default function KIBerichtPanel({ kundeId, zeitraumFilter }: KIBerichtPanelProps) {
  const [loading, setLoading] = useState(false)
  const [generierung, setGenerierung] = useState(false)
  const [snapshot, setSnapshot] = useState<KIBerichtSnapshot | null>(null)

  useEffect(() => {
    loadSnapshot()
  }, [kundeId])

  const loadSnapshot = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/ki-bericht`)
      const data = await response.json()
      
      if (data.erfolg) {
        setSnapshot(data.bericht)
      } else {
        setSnapshot(null)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Snapshots:', error)
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerieren = async () => {
    try {
      setGenerierung(true)
      
      const response = await fetch(`/api/kunden/${kundeId}/ki-bericht`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zeitraumTyp: zeitraumFilter.typ,
          von: zeitraumFilter.von?.toISOString(),
          bis: zeitraumFilter.bis?.toISOString(),
          benutzer: 'Admin' // TODO: Dynamisch aus Session
        })
      })
      
      const data = await response.json()
      
      if (data.erfolg) {
        toast.success('KI-Bericht erfolgreich generiert')
        setSnapshot(data.bericht)
      } else {
        toast.error(data.fehler || 'Fehler bei der Generierung')
      }
    } catch (error) {
      console.error('Fehler bei der Generierung:', error)
      toast.error('Fehler bei der KI-Bericht-Generierung')
    } finally {
      setGenerierung(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white border-purple-200">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    )
  }

  if (!snapshot) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            KI-Bericht
          </CardTitle>
          <CardDescription className="text-gray-700">
            Generieren Sie einen automatischen Bericht mit KI-Analyse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm text-gray-700">
              Es wurde noch kein KI-Bericht für diesen Kunden generiert. 
              Klicken Sie auf "Generieren", um einen neuen Bericht zu erstellen.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleGenerieren} 
            disabled={generierung}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {generierung ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generiere Bericht...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                KI-Bericht generieren
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-600 text-center">
            Die Generierung kann 10-30 Sekunden dauern
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              KI-Bericht
            </CardTitle>
            <CardDescription className="text-gray-700">
              Generiert am {format(new Date(snapshot.generiertAm), 'dd.MM.yyyy HH:mm', { locale: de })} · 
              Zeitraum: {snapshot.zeitraumBeschreibung}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Version {snapshot.version}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGenerieren}
              disabled={generierung}
            >
              {generierung ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Executive Summary */}
        {snapshot.bericht.executiveSummary && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Zusammenfassung</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {snapshot.bericht.executiveSummary}
            </p>
          </div>
        )}
        
        {/* Highlights */}
        {snapshot.bericht.highlights.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Highlights</h4>
            <ul className="list-disc list-inside space-y-1">
              {snapshot.bericht.highlights.map((highlight, idx) => (
                <li key={idx} className="text-sm text-gray-700">{highlight}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Finanzen */}
        {snapshot.bericht.finanzen && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Finanzen</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {snapshot.bericht.finanzen}
            </p>
          </div>
        )}
        
        {/* Risiken & Empfehlungen */}
        {snapshot.bericht.risikenUndEmpfehlungen && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Risiken & Empfehlungen</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {snapshot.bericht.risikenUndEmpfehlungen}
            </p>
          </div>
        )}
        
        {/* Nächste Schritte */}
        {snapshot.bericht.naechsteSchritte.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Nächste Schritte</h4>
            <ul className="list-decimal list-inside space-y-1">
              {snapshot.bericht.naechsteSchritte.map((schritt, idx) => (
                <li key={idx} className="text-sm text-gray-700">{schritt}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Metadaten */}
        <div className="text-xs text-gray-500 border-t pt-4">
          <p>Generiert mit {snapshot.modelVersion}</p>
          <p>Token verwendet: {snapshot.tokenCount || 'N/A'}</p>
          <p>Generierungsdauer: {snapshot.generierungsdauer ? `${(snapshot.generierungsdauer / 1000).toFixed(2)}s` : 'N/A'}</p>
        </div>
      </CardContent>
    </Card>
  )
}

