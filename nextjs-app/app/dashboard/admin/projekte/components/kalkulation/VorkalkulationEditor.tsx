'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Vorkalkulation } from '@/lib/db/types'
import { Info, Save } from 'lucide-react'

interface VorkalkulationEditorProps {
  projektId: string
  vorkalkulation?: Vorkalkulation
  angebotId?: string
  angebotssumme?: number
  zugewieseneMitarbeiter?: any[]
  onUpdate: () => void
}

export default function VorkalkulationEditor({ 
  projektId, 
  vorkalkulation, 
  angebotId,
  angebotssumme,
  zugewieseneMitarbeiter,
  onUpdate 
}: VorkalkulationEditorProps) {
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [stundensatz, setStundensatz] = useState(72)
  const [nettoUmsatz, setNettoUmsatz] = useState(0)
  const [anzahlMitarbeiter, setAnzahlMitarbeiter] = useState(1)
  const [sollStundenAufbauProMA, setSollStundenAufbauProMA] = useState(0)
  const [sollStundenAbbauProMA, setSollStundenAbbauProMA] = useState(0)
  const initializedRef = useRef(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const lastSavedPayload = useRef<string>('') // JSON-stringified snapshot, um Autosave-Loops zu vermeiden
  const hydratingRef = useRef(false) // true während Props→State Sync

  // Berechnete Werte - Gesamt für ganze Kolonne
  const sollStundenAufbauGesamt = sollStundenAufbauProMA * anzahlMitarbeiter
  const sollStundenAbbauGesamt = sollStundenAbbauProMA * anzahlMitarbeiter
  const sollUmsatzAufbau = sollStundenAufbauGesamt * stundensatz
  const sollUmsatzAbbau = sollStundenAbbauGesamt * stundensatz
  
  // Gesamt-Soll = Einfache Summe (nicht gewichtet)
  const gesamtSollStunden = sollStundenAufbauGesamt + sollStundenAbbauGesamt
  const gesamtSollUmsatz = sollUmsatzAufbau + sollUmsatzAbbau

  useEffect(() => {
    hydratingRef.current = true
    console.log('=== VorkalkulationEditor - Props ===')
    console.log('projektId:', projektId)
    console.log('angebotId:', angebotId)
    console.log('angebotssumme:', angebotssumme)
    console.log('zugewieseneMitarbeiter:', zugewieseneMitarbeiter?.length)
    console.log('vorkalkulation vorhanden:', !!vorkalkulation)
    
    // DIAGNOSE
    if (!angebotssumme || angebotssumme === 0) {
      console.warn('⚠️ PROBLEM: Keine Angebotssumme vorhanden!')
      console.warn('→ Prüfen Sie: 1) Ist ein Angebot zugewiesen? 2) Hat das Projekt ein Budget-Feld?')
    }
    if (!angebotId) {
      console.warn('⚠️ PROBLEM: Keine Angebot-ID vorhanden! Das Projekt hat kein zugewiesenes Angebot.')
    }
    
    // Setze Mitarbeiter-Anzahl
    const mitarbeiterCount = zugewieseneMitarbeiter?.length || 1
    setAnzahlMitarbeiter(mitarbeiterCount)
    
    // PRIORITÄT 0: Prüfe ob zugewiesene Mitarbeiter Aufbau/Abbau-Stunden haben
    const mitarbeiterHabenStunden = zugewieseneMitarbeiter?.some(
      (m: any) => (m.stundenAufbau !== undefined && m.stundenAufbau !== null) || 
                  (m.stundenAbbau !== undefined && m.stundenAbbau !== null)
    )
    
    if (mitarbeiterHabenStunden) {
      console.log('✓ Zugewiesene Mitarbeiter haben Aufbau/Abbau-Stunden gesetzt')
      // Berechne Gesamt-Stunden aus zugewiesenen Mitarbeitern
      const gesamtAufbau = zugewieseneMitarbeiter?.reduce((sum: number, m: any) => 
        sum + (m.stundenAufbau || 0), 0) || 0
      const gesamtAbbau = zugewieseneMitarbeiter?.reduce((sum: number, m: any) => 
        sum + (m.stundenAbbau || 0), 0) || 0
      
      const aufbauProMA = mitarbeiterCount > 0 ? gesamtAufbau / mitarbeiterCount : 0
      const abbauProMA = mitarbeiterCount > 0 ? gesamtAbbau / mitarbeiterCount : 0
      
      setSollStundenAufbauProMA(Math.round(aufbauProMA * 100) / 100)
      setSollStundenAbbauProMA(Math.round(abbauProMA * 100) / 100)
      
      console.log('→ Berechnet aus Mitarbeitern: Aufbau', gesamtAufbau, 'h, Abbau', gesamtAbbau, 'h')
      console.log('→ Pro MA: Aufbau', aufbauProMA.toFixed(2), 'h, Abbau', abbauProMA.toFixed(2), 'h')
      
      // Setze Angebotssumme wenn vorhanden
      if (angebotssumme && angebotssumme > 0) {
        setNettoUmsatz(Number(angebotssumme))
      }
      
      return // Beende useEffect hier, um weitere Berechnungen zu überspringen
    }
    
    // PRIORITÄT 1: Wenn Vorkalkulation existiert, lade die Werte
    if (vorkalkulation) {
      console.log('Lade existierende Vorkalkulation')
      setStundensatz(vorkalkulation.stundensatz || 72)
      
      // Teile durch Anzahl Mitarbeiter um Pro-MA zu bekommen
      const aufbauProMA = vorkalkulation.sollStundenAufbau / mitarbeiterCount
      const abbauProMA = vorkalkulation.sollStundenAbbau / mitarbeiterCount
      setSollStundenAufbauProMA(Math.round(aufbauProMA * 100) / 100)
      setSollStundenAbbauProMA(Math.round(abbauProMA * 100) / 100)
      
      // Setze Netto-Umsatz aus Angebot (wenn vorhanden) ODER aus Vorkalkulation
      if (angebotssumme && angebotssumme > 0) {
        console.log('✓ Setze Netto-Umsatz aus Angebot:', angebotssumme)
        setNettoUmsatz(Number(angebotssumme))
      } else {
        console.log('→ Setze Netto-Umsatz aus Vorkalkulation:', vorkalkulation.gesamtSollUmsatz)
        setNettoUmsatz(vorkalkulation.gesamtSollUmsatz)
      }
    } else {
      // PRIORITÄT 2: Keine Vorkalkulation vorhanden - Berechne automatisch aus Angebot
      if (angebotssumme && angebotssumme > 0) {
        console.log('✓ Keine Vorkalkulation - Berechne automatisch aus Angebot:', angebotssumme)
        setNettoUmsatz(Number(angebotssumme))
        
        // AUTOMATISCHE BERECHNUNG der Sollstunden aus Angebot
        const tempStundensatz = 72 // Default-Stundensatz
        const gesamtStunden = angebotssumme / tempStundensatz
        const aufbauStundenKolonne = gesamtStunden * 0.70
        const abbauStundenKolonne = gesamtStunden * 0.30
        const aufbauStundenProMA = aufbauStundenKolonne / mitarbeiterCount
        const abbauStundenProMA = abbauStundenKolonne / mitarbeiterCount
        
        setSollStundenAufbauProMA(Math.round(aufbauStundenProMA * 100) / 100)
        setSollStundenAbbauProMA(Math.round(abbauStundenProMA * 100) / 100)
        
        console.log('→ Automatisch berechnet: Aufbau', aufbauStundenProMA.toFixed(2), 'h/MA, Abbau', abbauStundenProMA.toFixed(2), 'h/MA')
      } else {
        console.log('⚠ Keine Angebotssumme und keine Vorkalkulation vorhanden')
      }
    }
    // Snapshot nach Hydration speichern
    const payload = buildPayload(false)
    lastSavedPayload.current = JSON.stringify(payload)
    hydratingRef.current = false
  }, [vorkalkulation, angebotssumme, zugewieseneMitarbeiter])

  // Auto-Save bei Änderungen (debounced)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }
    if (hydratingRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      autoSave()
    }, 800)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sollStundenAufbauProMA, sollStundenAbbauProMA, stundensatz, nettoUmsatz, anzahlMitarbeiter])

  // Automatische Berechnung aus Netto-Umsatz
  const berechneAusNetto = async () => {
    if (nettoUmsatz <= 0 || stundensatz <= 0 || anzahlMitarbeiter <= 0) {
      toast.error('Bitte geben Sie einen gültigen Netto-Umsatz, Stundensatz und Mitarbeiter-Anzahl ein')
      return
    }

    // Gesamt-Stunden für ganze Kolonne = Netto / Stundensatz
    const gesamtStunden = nettoUmsatz / stundensatz
    
    // Verteilung nach 70/30 für Kolonne
    const aufbauStundenKolonne = gesamtStunden * 0.70
    const abbauStundenKolonne = gesamtStunden * 0.30
    
    // Pro Mitarbeiter teilen
    const aufbauStundenProMA = aufbauStundenKolonne / anzahlMitarbeiter
    const abbauStundenProMA = abbauStundenKolonne / anzahlMitarbeiter
    
    // Runde auf 2 Dezimalstellen
    const aufbauGerundet = Math.round(aufbauStundenProMA * 100) / 100
    const abbauGerundet = Math.round(abbauStundenProMA * 100) / 100
    
    setSollStundenAufbauProMA(aufbauGerundet)
    setSollStundenAbbauProMA(abbauGerundet)
    
    // Sofort speichern nach Berechnung
    setSaving(true)
    try {
      const aufbauGesamt = aufbauGerundet * anzahlMitarbeiter
      const abbauGesamt = abbauGerundet * anzahlMitarbeiter
      
      const response = await fetch(`/api/kalkulation/${projektId}/vorkalkulation`, {
        method: vorkalkulation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sollStundenAufbau: aufbauGesamt,
          sollStundenAbbau: abbauGesamt,
          stundensatz,
          erstelltVon: 'lokal-berechnen'
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success(`Soll-Stunden berechnet und gespeichert: Pro MA (${anzahlMitarbeiter} Mitarbeiter, 70/30-Verteilung)`)
        await onUpdate() // Lade aktualisierte Daten
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      toast.error('Fehler beim Speichern der Vorkalkulation')
    } finally {
      setSaving(false)
    }
  }

  // Automatische Berechnung über API (nutzt Angebot + zugewiesene Mitarbeiter)
  const autoBerechnenViaAPI = async () => {
    if (!projektId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/kalkulation/${projektId}/auto-berechnen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Vorkalkulation automatisch berechnet und gespeichert!')
        onUpdate() // Lädt die aktualisierte Kalkulation
      } else {
        toast.error(data.fehler || 'Fehler bei der automatischen Berechnung')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler bei der automatischen Berechnung')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (sollStundenAufbauProMA <= 0 || sollStundenAbbauProMA <= 0 || stundensatz <= 0) {
      toast.error('Bitte füllen Sie alle Felder mit gültigen Werten aus')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/kalkulation/${projektId}/vorkalkulation`, {
        method: vorkalkulation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sollStundenAufbau: sollStundenAufbauGesamt, // Gesamt für DB
          sollStundenAbbau: sollStundenAbbauGesamt,   // Gesamt für DB
          stundensatz,
          erstelltVon: 'admin' // TODO: Aktuellen User verwenden
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Vorkalkulation erfolgreich gespeichert')
        onUpdate()
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Speichern der Vorkalkulation')
    } finally {
      setSaving(false)
    }
  }

  const autoSave = async () => {
    if (sollStundenAufbauProMA <= 0 || sollStundenAbbauProMA <= 0 || stundensatz <= 0) return
    if (saving || autoSaving) return
    const payload = buildPayload(true)
    const payloadJson = JSON.stringify(payload)
    // Wenn unverändert, kein erneuter Save (vermeidet Loops)
    if (payloadJson === lastSavedPayload.current) return

    setAutoSaving(true)
    try {
      await fetch(`/api/kalkulation/${projektId}/vorkalkulation`, {
        method: vorkalkulation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadJson
      })
      lastSavedPayload.current = payloadJson
      await Promise.resolve(onUpdate())
    } catch (error) {
      console.error('Auto-Save Vorkalkulation fehlgeschlagen:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  const buildPayload = (forSave: boolean) => ({
    sollStundenAufbau: sollStundenAufbauGesamt,
    sollStundenAbbau: sollStundenAbbauGesamt,
    stundensatz,
    erstelltVon: forSave ? 'auto' : 'hydrate'
  })

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader className="bg-white">
        <CardTitle className="text-xl font-bold text-gray-900">Vorkalkulation</CardTitle>
        <CardDescription className="text-gray-600">
          Geplante Soll-Werte für Stunden und Umsätze (Planung vor Projektstart)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 bg-white">
        {/* Alert wenn Stunden aus Mitarbeitern berechnet */}
        {zugewieseneMitarbeiter && zugewieseneMitarbeiter.some((m: any) => 
          (m.stundenAufbau !== undefined && m.stundenAufbau !== null) || 
          (m.stundenAbbau !== undefined && m.stundenAbbau !== null)
        ) && (
          <Alert className="bg-green-50 border-green-200">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Soll-Stunden aus Mitarbeiter-Zuweisungen:</strong> Die Soll-Stunden wurden aus den im Mitarbeiter-Tab 
              gespeicherten Aufbau- und Abbau-Stunden der zugewiesenen Mitarbeiter berechnet.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Alert wenn aus Angebot */}
        {vorkalkulation?.quelle === 'angebot' && angebotId && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Diese Vorkalkulation wurde automatisch aus Angebot #{vorkalkulation.angebotId?.slice(-6)} übernommen.
              Sie können die Werte bei Bedarf anpassen.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Alert wenn Angebot vorhanden aber keine Vorkalkulation gespeichert */}
        {!vorkalkulation && angebotId && angebotssumme && angebotssumme > 0 && (
          <Alert className="bg-green-50 border-green-200">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Werte aus Angebot automatisch geladen:</strong> Netto-Umsatz und Sollstunden wurden aus dem zugewiesenen Angebot berechnet (70% Aufbau / 30% Abbau).
              Klicken Sie auf <strong>"Vorkalkulation speichern"</strong> um die Werte zu übernehmen.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Warnung wenn kein Angebot zugewiesen */}
        {!angebotId && (
          <Alert className="bg-orange-50 border-orange-300">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <div className="flex items-start justify-between">
                <div>
                  <strong>Kein Angebot zugewiesen:</strong> Diesem Projekt ist noch kein Angebot zugewiesen. 
                  Gehen Sie zum Tab <strong>"Angebote"</strong> um ein Angebot zuzuweisen, damit die Werte automatisch übernommen werden können.
                  <br />
                  <span className="text-xs mt-1 block">
                    Falls Sie bereits ein Angebot zugewiesen haben, laden Sie die Seite bitte neu (F5) oder klicken Sie auf den Button rechts.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="ml-4 whitespace-nowrap border-orange-400 text-orange-800 hover:bg-orange-100"
                >
                  Seite neu laden
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Basis-Werte für automatische Berechnung */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Netto-Umsatz */}
          <div className="space-y-2">
            <Label htmlFor="nettoUmsatz" className="text-base font-semibold text-gray-900">
              Netto-Umsatz (Basis)
            </Label>
            <div className="relative">
              <Input
                id="nettoUmsatz"
                type="number"
                value={nettoUmsatz}
                onChange={(e) => setNettoUmsatz(Number(e.target.value))}
                className="pr-8 text-gray-900 font-semibold text-base border-gray-300"
                min="0"
                step="0.01"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                €
              </span>
            </div>
            {angebotssumme && (
              <p className="text-xs text-gray-700 font-medium">
                Aus Angebot (Netto): {angebotssumme.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </p>
            )}
          </div>

          {/* Stundensatz */}
          <div className="space-y-2">
            <Label htmlFor="stundensatz" className="text-base font-semibold text-gray-900">
              Stundensatz
            </Label>
            <div className="relative">
              <Input
                id="stundensatz"
                type="number"
                value={stundensatz}
                onChange={(e) => setStundensatz(Number(e.target.value))}
                className="pr-12 text-gray-900 font-semibold text-base border-gray-300"
                min="0"
                step="0.01"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                € / h
              </span>
            </div>
          </div>

          {/* Anzahl Mitarbeiter */}
          <div className="space-y-2">
            <Label htmlFor="anzahlMitarbeiter" className="text-base font-semibold text-gray-900">
              Anzahl Mitarbeiter
            </Label>
            <div className="relative">
              <Input
                id="anzahlMitarbeiter"
                type="number"
                value={anzahlMitarbeiter}
                onChange={(e) => setAnzahlMitarbeiter(Number(e.target.value))}
                className="pr-12 text-gray-900 font-semibold text-base border-gray-300"
                min="1"
                step="1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                MA
              </span>
            </div>
            {zugewieseneMitarbeiter && zugewieseneMitarbeiter.length > 0 && (
              <p className="text-xs text-gray-700 font-medium">
                Zugewiesen: {zugewieseneMitarbeiter.length} MA
              </p>
            )}
          </div>

          {/* Auto-Berechnen Buttons */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-gray-900">
              Automatisch berechnen
            </Label>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={berechneAusNetto}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
                disabled={saving}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Lokal berechnen
              </Button>
              {angebotId && (
                <Button
                  type="button"
                  onClick={autoBerechnenViaAPI}
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                  disabled={saving}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {saving ? 'Berechnet...' : 'Auto & Speichern'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Soll-Stunden Eingabe (Pro Mitarbeiter) */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm text-blue-900 font-medium">
              <strong>Hinweis:</strong> Geben Sie die Soll-Stunden <strong>PRO MA</strong> ein. 
              Die gesamt-kolonne ({anzahlMitarbeiter} Mitarbeiter) wird automatisch berechnet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Soll-Stunden Aufbau Pro MA */}
            <div className="space-y-2">
              <Label htmlFor="sollStundenAufbauProMA" className="text-base font-semibold text-gray-900">
                Soll-Stunden Aufbau (PRO MA, 70%)
              </Label>
              <div className="relative">
                <Input
                  id="sollStundenAufbauProMA"
                  type="number"
                  value={sollStundenAufbauProMA}
                  onChange={(e) => setSollStundenAufbauProMA(Number(e.target.value))}
                  className="pr-14 border-blue-300 text-gray-900 font-semibold text-base"
                  min="0"
                  step="0.01"
                  placeholder="PRO MA"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                  h/MA
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">Umsatz gesamt:</span>
                  <span className="text-gray-900 font-bold">
                    {sollUmsatzAufbau.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 font-bold">gesamt-kolonne:</span>
                  <span className="text-blue-900 font-bold">
                    {sollStundenAufbauGesamt.toFixed(2)}h
                  </span>
                </div>
              </div>
            </div>

            {/* Soll-Stunden Abbau Pro MA */}
            <div className="space-y-2">
              <Label htmlFor="sollStundenAbbauProMA" className="text-base font-semibold text-gray-900">
                Soll-Stunden Abbau (PRO MA, 30%)
              </Label>
              <div className="relative">
                <Input
                  id="sollStundenAbbauProMA"
                  type="number"
                  value={sollStundenAbbauProMA}
                  onChange={(e) => setSollStundenAbbauProMA(Number(e.target.value))}
                  className="pr-14 border-green-300 text-gray-900 font-semibold text-base"
                  min="0"
                  step="0.01"
                  placeholder="PRO MA"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                  h/MA
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">Umsatz gesamt:</span>
                  <span className="text-gray-900 font-bold">
                    {sollUmsatzAbbau.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700 font-bold">gesamt-kolonne:</span>
                  <span className="text-green-900 font-bold">
                    {sollStundenAbbauGesamt.toFixed(2)}h
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Berechnete Gesamt-Werte */}
        <div className="bg-white p-5 rounded-lg border-2 border-gray-300">
          <h4 className="font-bold text-gray-900 mb-4 text-lg">
            Gesamt-Soll (Aufbau + Abbau)
          </h4>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">Zeit</p>
              <p className="text-4xl font-bold text-gray-900">
                {gesamtSollStunden.toFixed(2)} h
              </p>
              <div className="space-y-1 text-xs">
                <p className="text-gray-600">
                  {sollStundenAufbauGesamt.toFixed(2)}h Aufbau + {sollStundenAbbauGesamt.toFixed(2)}h Abbau
                </p>
                <p className="text-indigo-700 font-bold text-sm">
                  PRO MA: {anzahlMitarbeiter > 0 ? (gesamtSollStunden / anzahlMitarbeiter).toFixed(2) : '0,00'}h
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">Umsatz</p>
              <p className="text-4xl font-bold text-gray-900">
                {gesamtSollUmsatz.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </p>
              <div className="space-y-1 text-xs">
                <p className="text-gray-600">
                  {sollUmsatzAufbau.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € + {sollUmsatzAbbau.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </p>
                <p className="text-indigo-700 font-bold text-sm">
                  PRO MA: {anzahlMitarbeiter > 0 ? (gesamtSollUmsatz / anzahlMitarbeiter).toLocaleString('de-DE', { minimumFractionDigits: 2 }) : '0,00'} €
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info-Box */}
        <Alert className="bg-white border-gray-300">
          <Info className="h-4 w-4 text-gray-700" />
          <AlertDescription className="text-gray-900 text-sm font-medium">
            <strong className="text-gray-900">Hinweis:</strong> Die Eingabe erfolgt PRO MA (pro Mitarbeiter). 
            Die gesamt-kolonne wird automatisch berechnet (Anzahl × PRO MA).
          </AlertDescription>
        </Alert>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird gespeichert...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Vorkalkulation speichern
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

