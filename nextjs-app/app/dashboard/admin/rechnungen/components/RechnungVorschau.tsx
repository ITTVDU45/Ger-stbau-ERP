"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Eye,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  AlertCircle
} from 'lucide-react'
import { Rechnung, AngebotPosition } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface RechnungVorschauProps {
  formData: Partial<Rechnung>
  template: 'modern' | 'klassisch' | 'kompakt'
  companySettings: any
  onDownloadPdf: () => void
  rechnungId?: string | null
}

export default function RechnungVorschau({
  formData,
  template,
  companySettings,
  onDownloadPdf,
  rechnungId
}: RechnungVorschauProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-'
    const d = date instanceof Date ? date : new Date(date)
    return format(d, 'dd.MM.yyyy', { locale: de })
  }

  const positionen = (formData.positionen || []) as AngebotPosition[]
  const company = companySettings || {}

  // Template-spezifische Styles
  const templateStyles = {
    modern: {
      header: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
      accent: 'text-blue-600',
      border: 'border-blue-200',
      tableHeader: 'bg-blue-50 text-blue-900',
      total: 'bg-blue-600 text-white'
    },
    klassisch: {
      header: 'bg-gray-900 text-white',
      accent: 'text-gray-900',
      border: 'border-gray-300',
      tableHeader: 'bg-gray-100 text-gray-900',
      total: 'bg-gray-900 text-white'
    },
    kompakt: {
      header: 'bg-gray-700 text-white text-sm',
      accent: 'text-gray-700',
      border: 'border-gray-200',
      tableHeader: 'bg-gray-50 text-gray-800 text-xs',
      total: 'bg-gray-700 text-white text-sm'
    }
  }

  const styles = templateStyles[template]
  const isKompakt = template === 'kompakt'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="bg-white">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Eye className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Vorschau</span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                Template: {template.charAt(0).toUpperCase() + template.slice(1)}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onDownloadPdf}
                disabled={!rechnungId}
                className="gap-2 border-gray-300 text-gray-900 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 text-gray-700" />
                <span className="font-medium">PDF herunterladen</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vorschau */}
      <Card className="bg-white overflow-hidden">
        <div className={`shadow-lg ${isKompakt ? 'text-sm' : ''}`}>
          {/* Header */}
          <div className={`${styles.header} p-6 md:p-8`}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Firmenlogo & Name */}
              <div>
                {company.logo ? (
                  <img 
                    src={company.logo} 
                    alt="Logo" 
                    className="h-16 mb-4 object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className={`h-8 w-8`} />
                    <span className={`text-xl font-bold`}>{company.firmenname || 'Ihre Firma'}</span>
                  </div>
                )}
                <div className={`${isKompakt ? 'text-xs' : 'text-sm'} opacity-90`}>
                  <p>{company.strasse} {company.hausnummer}</p>
                  <p>{company.plz} {company.ort}</p>
                  {company.telefon && <p>Tel: {company.telefon}</p>}
                  {company.email && <p>E-Mail: {company.email}</p>}
                </div>
              </div>

              {/* Rechnungsinfo */}
              <div className="text-right">
                <h1 className={`${isKompakt ? 'text-2xl' : 'text-3xl'} font-bold mb-4`}>RECHNUNG</h1>
                <div className={`${isKompakt ? 'text-xs' : 'text-sm'} space-y-1 opacity-90`}>
                  <p><strong>Rechnungsnr.:</strong> {formData.rechnungsnummer || 'R-XXXX-XXXX'}</p>
                  <p><strong>Datum:</strong> {formatDate(formData.rechnungsdatum)}</p>
                  <p><strong>Fällig am:</strong> {formatDate(formData.faelligAm)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className={`p-6 md:p-8 ${isKompakt ? 'space-y-4' : 'space-y-6'} text-gray-900`}>
            {/* Empfänger */}
            <div className={`${styles.border} border-l-4 pl-4`}>
              <p className={`text-sm text-gray-500 mb-1`}>Rechnungsempfänger</p>
              <p className={`font-semibold ${styles.accent}`}>{formData.kundeName || 'Kunde'}</p>
              <p className="text-gray-600">{formData.kundeAdresse || 'Adresse'}</p>
            </div>

            {/* Betreff */}
            {formData.typ && (
              <div>
                <p className={`font-medium ${styles.accent}`}>
                  {formData.typ === 'vollrechnung' && 'Rechnung'}
                  {formData.typ === 'teilrechnung' && 'Teilrechnung'}
                  {formData.typ === 'abschlagsrechnung' && 'Abschlagsrechnung'}
                  {formData.typ === 'schlussrechnung' && 'Schlussrechnung'}
                </p>
              </div>
            )}

            {/* Positionen-Tabelle */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={`${isKompakt ? 'p-2' : 'p-3'} text-left font-semibold border text-gray-900`}>Pos.</th>
                    <th className={`${isKompakt ? 'p-2' : 'p-3'} text-left font-semibold border text-gray-900`}>Beschreibung</th>
                    <th className={`${isKompakt ? 'p-2' : 'p-3'} text-right font-semibold border text-gray-900`}>Menge</th>
                    <th className={`${isKompakt ? 'p-2' : 'p-3'} text-left font-semibold border text-gray-900`}>Einheit</th>
                    <th className={`${isKompakt ? 'p-2' : 'p-3'} text-right font-semibold border text-gray-900`}>Einzelpreis</th>
                    <th className={`${isKompakt ? 'p-2' : 'p-3'} text-right font-semibold border text-gray-900`}>Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {positionen.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Keine Positionen vorhanden</p>
                      </td>
                    </tr>
                  ) : (
                    positionen.map((pos, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className={`${isKompakt ? 'p-2' : 'p-3'} border text-gray-900`}>
                          {pos.position || index + 1}
                        </td>
                        <td className={`${isKompakt ? 'p-2' : 'p-3'} border text-gray-900`}>
                          {pos.beschreibung}
                          {pos.typ === 'miete' && (pos as any).mietVon && (pos as any).mietBis && (
                            <span className="block text-xs text-gray-500 mt-1">
                              Zeitraum: {formatDate((pos as any).mietVon)} - {formatDate((pos as any).mietBis)} ({(pos as any).anzahlTage} Tage)
                            </span>
                          )}
                        </td>
                        <td className={`${isKompakt ? 'p-2' : 'p-3'} border text-right text-gray-900`}>
                          {pos.menge}
                        </td>
                        <td className={`${isKompakt ? 'p-2' : 'p-3'} border text-gray-900`}>
                          {pos.einheit}
                        </td>
                        <td className={`${isKompakt ? 'p-2' : 'p-3'} border text-right text-gray-900`}>
                          {formatCurrency(pos.einzelpreis || 0)}
                        </td>
                        <td className={`${isKompakt ? 'p-2' : 'p-3'} border text-right font-medium text-gray-900`}>
                          {formatCurrency(pos.gesamtpreis || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Kalkulation */}
            {positionen.length > 0 && (
              <div className="flex justify-end">
                <div className={`${isKompakt ? 'w-64' : 'w-80'} space-y-2 text-gray-900`}>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Zwischensumme:</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(formData.zwischensumme || 0)}</span>
                  </div>
                  
                  {formData.rabatt && formData.rabatt > 0 && (
                    <div className="flex justify-between py-1 text-red-600">
                      <span>Rabatt{formData.rabattProzent ? ` (${formData.rabattProzent}%)` : ''}:</span>
                      <span>-{formatCurrency(formData.rabatt)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between py-1 border-t">
                    <span className="font-medium text-gray-900">Netto:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(formData.netto || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">MwSt. ({formData.mwstSatz || 19}%):</span>
                    <span className="text-gray-900">{formatCurrency(formData.mwstBetrag || 0)}</span>
                  </div>
                  
                  <div className={`${styles.total} flex justify-between p-3 rounded-lg mt-2`}>
                    <span className="font-bold">Gesamtbetrag:</span>
                    <span className="font-bold text-lg">{formatCurrency(formData.brutto || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Zahlungshinweise */}
            <div className={`${styles.border} border rounded-lg p-4 mt-6`}>
              <div className="flex items-start gap-3">
                <CreditCard className={`h-5 w-5 ${styles.accent} mt-0.5`} />
                <div>
                  <p className={`font-medium ${styles.accent} mb-2`}>Zahlungsinformationen</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Bitte überweisen Sie den Betrag innerhalb von {formData.zahlungsziel || 14} Tagen auf folgendes Konto:</p>
                    {company.bankname && <p><strong>Bank:</strong> {company.bankname}</p>}
                    {company.iban && <p><strong>IBAN:</strong> {company.iban}</p>}
                    {company.bic && <p><strong>BIC:</strong> {company.bic}</p>}
                    <p className="mt-2 text-gray-500">
                      <strong>Verwendungszweck:</strong> {formData.rechnungsnummer || 'Rechnungsnummer'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 mt-6 text-center text-xs text-gray-500">
              <p>{company.firmenname} | {company.strasse} {company.hausnummer} | {company.plz} {company.ort}</p>
              {company.ustIdNr && <p>USt-IdNr.: {company.ustIdNr}</p>}
              {company.steuernummer && <p>Steuernummer: {company.steuernummer}</p>}
              {company.handelsregister && <p>{company.handelsregister}</p>}
            </div>
          </div>
        </div>
      </Card>

      {/* Hinweis bei fehlendem Speichern */}
      {!rechnungId && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Rechnung nicht gespeichert</p>
                <p className="text-sm text-yellow-700">
                  Speichern Sie die Rechnung, um ein PDF herunterladen zu können.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
