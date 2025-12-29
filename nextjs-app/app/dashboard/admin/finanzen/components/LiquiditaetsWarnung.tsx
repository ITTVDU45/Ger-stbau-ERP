'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingDown, X } from 'lucide-react'

interface LiquiditaetsWarnungProps {
  mandantId?: string | null
  zeitraum?: { von?: Date | null; bis?: Date | null }
  refreshTrigger?: number
}

export default function LiquiditaetsWarnung({ mandantId, zeitraum, refreshTrigger }: LiquiditaetsWarnungProps) {
  const [loading, setLoading] = useState(true)
  const [warnung, setWarnung] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    pruefeLiquiditaet()
  }, [mandantId, zeitraum, refreshTrigger])

  const pruefeLiquiditaet = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (mandantId) params.append('mandantId', mandantId)
      if (zeitraum?.von) params.append('von', zeitraum.von.toISOString())
      if (zeitraum?.bis) params.append('bis', zeitraum.bis.toISOString())

      // 1. Hole aktuellen Kontostand
      const kontoRes = await fetch(`/api/finanzen/kontostand?${params}`)
      const kontoData = await kontoRes.json()
      const kontostand = kontoData.aktueller?.betrag || 0

      // 2. Hole Stats (Einnahmen + Ausgaben)
      const statsRes = await fetch(`/api/finanzen/stats?${params}`)
      const statsData = await statsRes.json()

      // 3. Hole Budget-Status mit tatsächlichen Ausgaben (im gefilterten Zeitraum)
      const budgetRes = await fetch(`/api/finanzen/budgets/status?${params}`)
      const budgetData = await budgetRes.json()

      if (budgetData.erfolg && budgetData.budgets && statsData.erfolg) {
        // 4. Hole Einnahmen und Ausgaben aus Stats
        const einnahmenGesamt = statsData.stats.einnahmenGesamt || 0
        const ausgabenGesamt = statsData.stats.ausgabenGesamt || 0
        
        // 5. Berechne prognostizierten Kontostand
        // Wenn Zeitraum gefiltert ist, nehmen wir die tatsächlichen Werte
        // Ansonsten: 30-Tage-Prognose basierend auf Durchschnitt
        let prognoseEinnahmen = einnahmenGesamt
        let prognoseAusgaben = ausgabenGesamt
        let prognoseTage = 30
        
        if (!zeitraum?.von || !zeitraum?.bis) {
          // Keine Filterung: Berechne 30-Tage-Prognose aus Monatsdurchschnitt
          const durchschnittEinnahmenProMonat = statsData.stats.durchschnittEinnahmenProMonat || 0
          const durchschnittAusgabenProMonat = statsData.stats.durchschnittAusgabenProMonat || 0
          
          prognoseEinnahmen = durchschnittEinnahmenProMonat
          prognoseAusgaben = durchschnittAusgabenProMonat
        } else {
          // Mit Filter: Verwende tatsächliche Werte im gefilterten Zeitraum
          const diffTime = Math.abs(zeitraum.bis.getTime() - zeitraum.von.getTime())
          prognoseTage = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        const prognostiziertKonto = kontostand + prognoseEinnahmen - prognoseAusgaben
        const nettoSaldo = prognoseEinnahmen - prognoseAusgaben

        // 5. Schwellwerte
        const minimalerSaldo = 5000 // Default
        const kritischerSaldo = 1000 // Default

        // 6. Zeitraum-Text für Beschreibung
        const zeitraumText = prognoseTage === 30 ? '30 Tagen' : `${prognoseTage} Tagen (gefilterte Periode)`

        // 7. Warnungen basierend auf Prognose
        if (prognostiziertKonto < kritischerSaldo) {
          setWarnung({
            level: 'critical',
            aktuell: kontostand,
            prognose: prognostiziertKonto,
            prognoseEinnahmen,
            prognoseAusgaben,
            nettoSaldo,
            budgets: budgetData.budgets,
            prognoseTage,
            zeitraumGefiltert: !!(zeitraum?.von && zeitraum?.bis),
            schwellwert: kritischerSaldo,
            titel: 'Kritische Liquiditätswarnung!',
            beschreibung: `Basierend auf Ihren ${zeitraum?.von && zeitraum?.bis ? 'gefilterten' : 'aktuellen'} Finanzprognosen (Einnahmen: ${formatCurrency(prognoseEinnahmen)}, Ausgaben: ${formatCurrency(prognoseAusgaben)}) wird Ihr Kontostand in ${zeitraumText} voraussichtlich ${formatCurrency(prognostiziertKonto)} betragen. Sofortiges Handeln erforderlich!`
          })
        } else if (prognostiziertKonto < minimalerSaldo) {
          setWarnung({
            level: 'warning',
            aktuell: kontostand,
            prognose: prognostiziertKonto,
            prognoseEinnahmen,
            prognoseAusgaben,
            nettoSaldo,
            budgets: budgetData.budgets,
            prognoseTage,
            zeitraumGefiltert: !!(zeitraum?.von && zeitraum?.bis),
            schwellwert: minimalerSaldo,
            titel: 'Liquiditätswarnung',
            beschreibung: `Basierend auf Ihren ${zeitraum?.von && zeitraum?.bis ? 'gefilterten' : 'aktuellen'} Finanzprognosen (Einnahmen: ${formatCurrency(prognoseEinnahmen)}, Ausgaben: ${formatCurrency(prognoseAusgaben)}) wird Ihr Kontostand in ${zeitraumText} voraussichtlich ${formatCurrency(prognostiziertKonto)} betragen. Bitte beobachten Sie Ihre Liquidität.`
          })
        }
      }
    } catch (error) {
      console.error('Fehler beim Prüfen der Liquidität:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  if (loading || !warnung || dismissed) {
    return null
  }

  return (
    <Alert 
      variant={warnung.level === 'critical' ? 'destructive' : 'default'}
      className={
        warnung.level === 'critical' 
          ? 'border-red-500 bg-red-50' 
          : 'border-orange-500 bg-orange-50'
      }
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {warnung.level === 'critical' ? (
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          ) : (
            <TrendingDown className="h-5 w-5 text-orange-600 mt-0.5" />
          )}
          <div className="flex-1">
            <AlertTitle className={warnung.level === 'critical' ? 'text-red-900' : 'text-orange-900'}>
              {warnung.titel}
            </AlertTitle>
            <AlertDescription className={warnung.level === 'critical' ? 'text-red-800' : 'text-orange-800'}>
              <div className="mb-3">{warnung.beschreibung}</div>
              
              <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-white/50 rounded-lg text-sm">
                <div>
                  <div className="font-semibold text-gray-900">Aktueller Kontostand:</div>
                  <div className="text-lg font-bold text-blue-700">
                    {formatCurrency(warnung.aktuell || warnung.saldo || 0)}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Prognose ({warnung.prognoseTage || 30} Tage):
                  </div>
                  <div className={`text-lg font-bold ${warnung.level === 'critical' ? 'text-red-900' : 'text-orange-900'}`}>
                    {formatCurrency(warnung.prognose || warnung.saldo || 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-2 p-3 bg-white/50 rounded-lg text-sm">
                <div>
                  <div className="font-semibold text-gray-900">Erwartete Einnahmen:</div>
                  <div className="text-lg font-bold text-green-700">
                    +{formatCurrency(warnung.prognoseEinnahmen || 0)}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Erwartete Ausgaben:</div>
                  <div className="text-lg font-bold text-red-700">
                    -{formatCurrency(warnung.prognoseAusgaben || 0)}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Netto-Saldo:</div>
                  <div className={`text-lg font-bold ${(warnung.nettoSaldo || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(warnung.nettoSaldo || 0)}
                  </div>
                </div>
              </div>

              {warnung.budgets && warnung.budgets.length > 0 && (
                <div className="mt-3 p-3 bg-white/50 rounded-lg">
                  <div className="text-xs font-semibold text-gray-900 mb-2">
                    Ausgaben-Aufschlüsselung ({warnung.zeitraumGefiltert ? 'Gefilterter Zeitraum' : '30-Tage-Hochrechnung'}):
                  </div>
                  <div className="space-y-1">
                    {warnung.budgets.map((budget: any, index: number) => {
                      // Wenn Zeitraum gefiltert ist, zeige tatsächliche Ausgaben
                      // Ansonsten berechne 30-Tage-Prognose
                      let angezeigterBetrag = budget.ausgabenAktuell
                      
                      if (!warnung.zeitraumGefiltert) {
                        let tageImBudgetZeitraum = 30
                        if (budget.zeitraum === 'quartal') tageImBudgetZeitraum = 90
                        else if (budget.zeitraum === 'jahr') tageImBudgetZeitraum = 365
                        angezeigterBetrag = (budget.ausgabenAktuell / tageImBudgetZeitraum) * 30
                      }
                      
                      return (
                        <div key={index} className="flex justify-between text-xs text-gray-900">
                          <span>{budget.kategorieName}:</span>
                          <span className="font-semibold">{formatCurrency(angezeigterBetrag)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  )
}

