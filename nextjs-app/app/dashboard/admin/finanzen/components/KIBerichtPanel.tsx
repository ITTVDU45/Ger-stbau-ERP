'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, Download, BookOpen, Trash2, Eye, Calendar } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ZeitraumFilter } from '@/lib/db/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface KIBerichtPanelProps {
  zeitraum: ZeitraumFilter
  mandantId?: string | null
  refreshTrigger?: number
}

export default function KIBerichtPanel({ zeitraum, mandantId, refreshTrigger }: KIBerichtPanelProps) {
  const [loading, setLoading] = useState(false)
  const [bericht, setBericht] = useState<any>(null)
  const [gespeicherteBerichte, setGespeicherteBerichte] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [berichtToDelete, setBerichtToDelete] = useState<any>(null)

  useEffect(() => {
    loadBerichte()
  }, [mandantId, refreshTrigger])

  const loadBerichte = async () => {
    try {
      const params = new URLSearchParams()
      if (mandantId) params.append('mandantId', mandantId)

      const res = await fetch(`/api/finanzen/ki-bericht?${params}`)
      const data = await res.json()

      if (data.erfolg) {
        setGespeicherteBerichte(data.berichte || [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Berichte:', error)
    }
  }

  const handleBerichtAnzeigen = (berichtData: any) => {
    setBericht(berichtData)
    setShowHistory(false)
  }

  const handleDeleteClick = (berichtData: any) => {
    setBerichtToDelete(berichtData)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!berichtToDelete?._id) return

    try {
      const res = await fetch(`/api/finanzen/ki-bericht/${berichtToDelete._id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Bericht erfolgreich gelöscht')
        loadBerichte()
        if (bericht?._id === berichtToDelete._id) {
          setBericht(null)
        }
      } else {
        toast.error('Fehler beim Löschen des Berichts')
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen des Berichts')
    } finally {
      setDeleteDialogOpen(false)
      setBerichtToDelete(null)
    }
  }

  const generiereKIBericht = async () => {
    try {
      setLoading(true)
      
      const res = await fetch('/api/finanzen/ki-bericht', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandantId,
          zeitraum: {
            von: zeitraum.von,
            bis: zeitraum.bis
          }
        })
      })

      const data = await res.json()

      if (data.erfolg) {
        setBericht(data.bericht)
        toast.success('KI-Bericht erfolgreich generiert und gespeichert')
        loadBerichte() // Lade Liste neu
      } else {
        toast.error(data.fehler || 'Fehler beim Generieren des Berichts')
      }
    } catch (error) {
      console.error('Fehler beim Generieren des KI-Berichts:', error)
      toast.error('Fehler beim Generieren des KI-Berichts')
    } finally {
      setLoading(false)
    }
  }

  const exportiereBericht = () => {
    if (!bericht) return

    const text = `
FINANZBERICHT (KI-GENERIERT)
=============================
Zeitraum: ${bericht.zeitraumBeschreibung}
Generiert am: ${new Date(bericht.generiertAm).toLocaleString('de-DE')}

ZUSAMMENFASSUNG
---------------
${bericht.bericht.zusammenfassung}

KENNZAHLEN
----------
${bericht.bericht.kennzahlen}

GRÖSSTE AUSGABEN
----------------
${bericht.bericht.groessteAusgaben}

AUFFÄLLIGKEITEN
---------------
${bericht.bericht.auffaelligkeiten}

EMPFEHLUNGEN
------------
${bericht.bericht.empfehlungen}

RISIKEN
-------
${bericht.bericht.risiken}

NÄCHSTE SCHRITTE
----------------
${bericht.bericht.naechsteSchritte}

DATEN-SNAPSHOT
--------------
Einnahmen Gesamt: ${bericht.datenSnapshot.einnahmenGesamt.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
Ausgaben Gesamt: ${bericht.datenSnapshot.ausgabenGesamt.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
Saldo: ${bericht.datenSnapshot.saldo.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
Anzahl Transaktionen: ${bericht.datenSnapshot.anzahlTransaktionen}
    `.trim()

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finanzbericht_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Bericht exportiert')
  }

  return (
    <Card className="p-6 bg-white border-2 border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            KI-Finanzbericht
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Lassen Sie KI Ihre Finanzdaten analysieren und Empfehlungen geben
          </p>
        </div>
        <div className="flex gap-2">
          {gespeicherteBerichte.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-900 hover:text-gray-900"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {showHistory ? 'Verlauf ausblenden' : `Verlauf (${gespeicherteBerichte.length})`}
            </Button>
          )}
          {bericht && (
            <Button 
              variant="outline" 
              onClick={exportiereBericht}
              className="text-gray-900 hover:text-gray-900"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <Button 
            onClick={generiereKIBericht} 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                KI-Bericht erstellen
              </>
            )}
          </Button>
        </div>
      </div>

      {loading && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            KI analysiert Ihre Finanzdaten. Dies kann bis zu 30 Sekunden dauern...
          </AlertDescription>
        </Alert>
      )}

      {/* Berichte-Historie */}
      {showHistory && gespeicherteBerichte.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Gespeicherte Berichte
          </h3>
          <div className="space-y-2">
            {gespeicherteBerichte.map((gespeicherterBericht) => (
              <div
                key={gespeicherterBericht._id}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {gespeicherterBericht.zeitraumBeschreibung}
                    </span>
                    {gespeicherterBericht._id === bericht?._id && (
                      <Badge variant="secondary" className="text-xs">Aktuell</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    Erstellt: {format(new Date(gespeicherterBericht.generiertAm), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
                    {gespeicherterBericht.kontostand && (
                      <span className="ml-3">
                        Kontostand: {gespeicherterBericht.kontostand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBerichtAnzeigen(gespeicherterBericht)}
                    title="Bericht anzeigen"
                  >
                    <Eye className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(gespeicherterBericht)}
                    title="Bericht löschen"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !bericht && !showHistory && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            Klicken Sie auf "KI-Bericht erstellen", um eine detaillierte Finanzanalyse zu erhalten
          </p>
          {gespeicherteBerichte.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Oder sehen Sie sich gespeicherte Berichte im Verlauf an
            </p>
          )}
        </div>
      )}

      {bericht && !loading && (
        <div className="space-y-6">
          {/* Header */}
          <Alert className="bg-purple-50 border-purple-200">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              <div className="font-semibold text-purple-900">
                Bericht für {bericht.zeitraumBeschreibung}
              </div>
              <div className="text-sm text-purple-700 mt-1">
                Generiert am {new Date(bericht.generiertAm).toLocaleString('de-DE')} | 
                Version {bericht.version}
              </div>
            </AlertDescription>
          </Alert>

          {/* Daten-Snapshot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-600">Einnahmen</div>
              <div className="text-lg font-bold text-green-600">
                {bericht.datenSnapshot.einnahmenGesamt.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Ausgaben</div>
              <div className="text-lg font-bold text-red-600">
                {bericht.datenSnapshot.ausgabenGesamt.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Saldo</div>
              <div className={`text-lg font-bold ${bericht.datenSnapshot.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {bericht.datenSnapshot.saldo.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Transaktionen</div>
              <div className="text-lg font-bold text-gray-900">
                {bericht.datenSnapshot.anzahlTransaktionen}
              </div>
            </div>
          </div>

          {/* Bericht-Abschnitte */}
          <div className="space-y-4">
            <BerichtSection 
              titel="📋 Zusammenfassung" 
              inhalt={bericht.bericht.zusammenfassung}
              bgColor="bg-blue-50"
            />
            <BerichtSection 
              titel="📊 Kennzahlen" 
              inhalt={bericht.bericht.kennzahlen}
              bgColor="bg-green-50"
            />
            {bericht.bericht.kategorieAnalyse && (
              <BerichtSection 
                titel="📂 Kategorien-Analyse" 
                inhalt={bericht.bericht.kategorieAnalyse}
                bgColor="bg-orange-50"
              />
            )}
            <BerichtSection 
              titel="💰 Größte Ausgaben" 
              inhalt={bericht.bericht.groessteAusgaben}
              bgColor="bg-purple-50"
            />
            <BerichtSection 
              titel="🔍 Auffälligkeiten" 
              inhalt={bericht.bericht.auffaelligkeiten}
              bgColor="bg-yellow-50"
            />
            <BerichtSection 
              titel="💡 Empfehlungen" 
              inhalt={bericht.bericht.empfehlungen}
              bgColor="bg-teal-50"
            />
            <BerichtSection 
              titel="⚠️ Risiken" 
              inhalt={bericht.bericht.risiken}
              bgColor="bg-red-50"
            />
            {bericht.bericht.liquiditaetsprognose && (
              <BerichtSection 
                titel="💧 Liquiditätsprognose" 
                inhalt={bericht.bericht.liquiditaetsprognose}
                bgColor="bg-cyan-50"
              />
            )}
            <BerichtSection 
              titel="🎯 Nächste Schritte" 
              inhalt={bericht.bericht.naechsteSchritte}
              bgColor="bg-indigo-50"
            />
          </div>
        </div>
      )}

      {/* Lösch-Bestätigungs-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bericht löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie den Bericht "{berichtToDelete?.zeitraumBeschreibung}" löschen möchten?
              <br />
              <br />
              Erstellt am: {berichtToDelete && format(new Date(berichtToDelete.generiertAm), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
              <br />
              <br />
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setBerichtToDelete(null)
            }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function BerichtSection({ titel, inhalt, bgColor }: { titel: string; inhalt: string | any; bgColor: string }) {
  // Wenn inhalt ein Objekt ist, formatiere es als lesbaren Text
  const formattedInhalt = typeof inhalt === 'object' && inhalt !== null
    ? JSON.stringify(inhalt, null, 2)
    : inhalt

  return (
    <div className={`p-4 rounded-lg ${bgColor}`}>
      <h3 className="font-semibold text-gray-900 mb-2">{titel}</h3>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {formattedInhalt}
      </div>
    </div>
  )
}

