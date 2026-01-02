"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Angebot, AngebotPosition, CompanySettings } from '@/lib/db/types'
import { Download, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface AngebotVorschauProps {
  angebot: Partial<Angebot>
  positionen: AngebotPosition[]
  kalkulation: {
    nettosumme: number
    mwstBetrag: number
    bruttosumme: number
  }
}

export default function AngebotVorschau({ angebot, positionen, kalkulation }: AngebotVorschauProps) {
  const [loading, setLoading] = useState(false)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const hasMiete = positionen.some((pos) => pos.typ === 'miete')

  useEffect(() => {
    loadCompanySettings()
  }, [])

  const loadCompanySettings = async () => {
    try {
      const response = await fetch('/api/settings/company')
      if (response.ok) {
        const data = await response.json()
        setCompanySettings(data.settings)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Firmeneinstellungen:', error)
    } finally {
      setLoadingSettings(false)
    }
  }

  const handlePDFDownload = () => {
    if (!angebot.kundeId || !angebot.kundeName) {
      toast.error('Fehler', {
        description: 'Bitte wählen Sie zuerst einen Kunden aus'
      })
      return
    }

    if (positionen.length === 0) {
      toast.error('Fehler', {
        description: 'Bitte fügen Sie mindestens eine Position hinzu'
      })
      return
    }

    setLoading(true)
    
    // Verwende Browser-Druckfunktion für PDF-Erstellung
    setTimeout(() => {
      window.print()
      setLoading(false)
      toast.success('PDF-Druckdialog geöffnet', {
        description: 'Wählen Sie "Als PDF speichern" im Druckdialog'
      })
    }, 100)
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Angebotsvorschau</h3>
        </div>
        <Button 
          onClick={handlePDFDownload}
          disabled={loading || !angebot.kundeId || positionen.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Erstelle PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Als PDF herunterladen
            </>
          )}
        </Button>
      </div>

      {/* PDF-Vorschau */}
      <Card className="bg-white border-gray-300 shadow-lg">
        <CardContent className="p-8 md:p-12">
          {/* Header mit Logo */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              {/* Logo Links */}
              <div>
                {companySettings?.logoUrl ? (
                  <div className="mb-4">
                    <Image 
                      src={companySettings.logoUrl} 
                      alt="Firmenlogo" 
                      width={120} 
                      height={60}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-32 h-16 bg-gray-200 rounded flex items-center justify-center mb-4">
                    <span className="text-xs text-gray-500">Logo</span>
                  </div>
                )}
                <div className="text-sm text-gray-700">
                  {companySettings?.firmenname && <p className="font-semibold">{companySettings.firmenname}</p>}
                  {companySettings?.strasse && <p>{companySettings.strasse}</p>}
                  {(companySettings?.plz || companySettings?.ort) && (
                    <p>{companySettings.plz} {companySettings.ort}</p>
                  )}
                </div>
              </div>

              {/* Angebotsnummer & Datum Rechts */}
              <div className="text-right">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">ANGEBOT</h1>
                {angebot.angebotsnummer && (
                  <p className="text-sm text-gray-600">Nr. {angebot.angebotsnummer}</p>
                )}
                <p className="text-sm text-gray-600 mt-2">Datum: {formatDate(angebot.angebotsdatum)}</p>
                {angebot.gueltigBis && (
                  <p className="text-sm text-gray-600">Gültig bis: {formatDate(angebot.gueltigBis)}</p>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Absender-Zeile (klein) */}
            {companySettings && (
              <p className="text-xs text-gray-500 mb-2">
                {companySettings.firmenname || 'Firma'} • {companySettings.strasse || 'Straße'} • {companySettings.plz || 'PLZ'} {companySettings.ort || 'Ort'}
              </p>
            )}

            {/* Kundenadresse */}
            <div className="mb-6">
              <div className="mt-4">
                <p className="font-semibold text-gray-900">{angebot.kundeName || 'Kundenname'}</p>
                {angebot.kundeAdresse && (
                  <p className="text-sm text-gray-700 whitespace-pre-line">{angebot.kundeAdresse}</p>
                )}
              </div>
            </div>

            {/* Betreff */}
            {angebot.betreff && (
              <div className="mb-6 mt-8">
                <p className="font-bold text-gray-900 text-lg">Betreff: {angebot.betreff}</p>
              </div>
            )}
          </div>

          {/* Einleitungstext */}
          {angebot.einleitungstext && (
            <div className="mb-8">
              <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                {angebot.einleitungstext}
              </p>
            </div>
          )}

          {/* Positionen */}
          {positionen.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Leistungsverzeichnis</h2>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 w-12">Pos.</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Beschreibung</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 w-20">Menge</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 w-24">Einheit</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 w-32">Einzelpreis (€)</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 w-24">Prozentsatz (%)</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 w-32">Gesamtpreis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionen.map((pos, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-700">{pos.position}</td>
                        <td className="py-3 px-4 text-sm text-gray-800">
                          <div>
                            <div 
                              className="font-medium rich-text-content" 
                              dangerouslySetInnerHTML={{ __html: pos.beschreibung || '' }}
                            />
                            {pos.verknuepftMitPosition && (
                              <span className="text-xs text-gray-600 block mt-1">
                                (bezieht sich auf Pos. {pos.verknuepftMitPosition})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 text-right">{pos.menge.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {/* Stelle sicher, dass keine Prozentangabe in der Einheit angezeigt wird */}
                          {pos.einheit && pos.einheit.includes('%') ? 'St.' : (pos.einheit || 'St.')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 text-right">{formatCurrency(pos.einzelpreis)}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 text-right">
                          {pos.prozentsatz && pos.prozentsatz > 0 ? (
                            <span className="text-green-600 font-medium">{pos.prozentsatz}%</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
                          {pos.typ === 'miete' ? 'E.P.' : formatCurrency(pos.gesamtpreis)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kalkulation */}
          <div className="mb-8">
            <div className="flex justify-end">
              <div className="w-full md:w-1/2 lg:w-1/3">
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Nettosumme:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(kalkulation.nettosumme)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">zzgl. MwSt. ({angebot.mwstSatz || 19}%):</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(kalkulation.mwstBetrag)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-900 text-lg">Bruttosumme:</span>
                      <span className="font-bold text-blue-600 text-lg">{formatCurrency(kalkulation.bruttosumme)}</span>
                    </div>
                  {hasMiete && (
                    <p className="text-xs text-amber-700 mt-2">
                      Hinweis: Mietpositionen sind in der Summe nicht enthalten und werden später separat nach tatsächlicher Mietdauer berechnet.
                    </p>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zahlungsbedingungen */}
          {angebot.zahlungsbedingungen && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Zahlungsbedingungen</h3>
              <p className="text-gray-800 whitespace-pre-line leading-relaxed text-sm">
                {angebot.zahlungsbedingungen}
              </p>
            </div>
          )}

          {/* Schlusstext */}
          {angebot.schlusstext && (
            <div className="mb-8">
              <p className="text-gray-800 whitespace-pre-line leading-relaxed text-sm">
                {angebot.schlusstext}
              </p>
            </div>
          )}

          {/* Footer mit Firmendaten */}
          <div className="mt-12 pt-6 border-t-2 border-gray-300">
            {companySettings ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700 mb-4">
                  {/* Firmenadresse */}
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Anschrift</p>
                    {companySettings.firmenname && <p className="font-semibold">{companySettings.firmenname}</p>}
                    {companySettings.strasse && <p>{companySettings.strasse}</p>}
                    {(companySettings.plz || companySettings.ort) && (
                      <p>{companySettings.plz} {companySettings.ort}</p>
                    )}
                    {companySettings.land && <p>{companySettings.land}</p>}
                  </div>

                  {/* Kontakt */}
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Kontakt</p>
                    {companySettings.telefon && <p>Tel: {companySettings.telefon}</p>}
                    {companySettings.email && <p>E-Mail: {companySettings.email}</p>}
                    {companySettings.website && <p>Web: {companySettings.website}</p>}
                  </div>

                  {/* Rechtliches */}
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Rechtliches</p>
                    {companySettings.geschaeftsfuehrer && <p>Geschäftsführer: {companySettings.geschaeftsfuehrer}</p>}
                    {companySettings.ustId && <p>USt-IdNr.: {companySettings.ustId}</p>}
                    {companySettings.steuernummer && <p>Steuernr.: {companySettings.steuernummer}</p>}
                    {companySettings.handelsregister && <p>HRB: {companySettings.handelsregister}</p>}
                    {companySettings.amtsgericht && <p>AG: {companySettings.amtsgericht}</p>}
                  </div>
                </div>

                {/* Bankverbindung */}
                {(companySettings.bankname || companySettings.iban || companySettings.bic) && (
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700">
                      <div>
                        <p className="font-bold text-gray-900 mb-1">Bankverbindung</p>
                        {companySettings.bankname && <p>{companySettings.bankname}</p>}
                        {companySettings.iban && <p>IBAN: {companySettings.iban}</p>}
                        {companySettings.bic && <p>BIC: {companySettings.bic}</p>}
                      </div>
                      <div className="md:col-span-2">
                        {companySettings.footerText && (
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {companySettings.footerText}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">Firmendaten werden geladen...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hinweis */}
      {(!angebot.kundeId || positionen.length === 0) && (
        <Card className="bg-amber-50 border-amber-300">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Um ein PDF zu erstellen, müssen mindestens ein Kunde ausgewählt und Positionen hinzugefügt worden sein.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Styles für Rich-Text-Content & Print */}
      <style jsx global>{`
        .rich-text-content p {
          margin: 0;
        }
        .rich-text-content strong {
          font-weight: 700;
        }
        .rich-text-content em {
          font-style: italic;
        }
        .rich-text-content u {
          text-decoration: underline;
        }
        .rich-text-content ul,
        .rich-text-content ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .rich-text-content li {
          margin-bottom: 0.25rem;
        }

        /* Print Styles für PDF-Export */
        @media print {
          /* Verstecke Navigation und Buttons */
          nav, header, footer, .no-print {
            display: none !important;
          }
          
          /* Verstecke den "Als PDF herunterladen" Button */
          button {
            display: none !important;
          }
          
          /* Zeige nur die Vorschau-Karte */
          body * {
            visibility: hidden;
          }
          
          .space-y-6, .space-y-6 * {
            visibility: visible;
          }
          
          /* Optimiere für Druck */
          .space-y-6 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Entferne Schatten und Rahmen */
          * {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          /* Seitenumbruch-Optimierung */
          table {
            page-break-inside: avoid;
          }
          
          tr {
            page-break-inside: avoid;
          }
          
          /* Farbige Texte für Druck optimieren */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}

