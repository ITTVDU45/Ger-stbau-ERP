'use client'

// Step 4: Import-Bestätigung und Ergebnis
import React from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import type { ImportResult } from '../../types'

interface ImportConfirmationProps {
  importing: boolean
  importResult: ImportResult | null
  selectedCount: number
  onClose: (success: boolean) => void
}

export function ImportConfirmation({
  importing,
  importResult,
  selectedCount,
  onClose
}: ImportConfirmationProps) {
  // Noch kein Ergebnis - Import läuft oder wird vorbereitet
  if (!importResult && importing) {
    return (
      <div className="space-y-8 py-12">
        <div className="text-center space-y-6">
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-4">
            <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
            {/* Pulse Ring */}
            <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900">
            📥 Importiere Kunden...
          </h3>
          <p className="text-lg text-gray-600">
            Bitte warten Sie, während <span className="font-bold text-purple-600">{selectedCount}</span> Kunden angelegt werden
          </p>
        </div>
      </div>
    )
  }

  // Import erfolgreich
  if (importResult?.erfolg) {
    return (
      <div className="space-y-8 py-8">
        {/* Success Animation Header */}
        <div className="text-center space-y-6">
          <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 animate-bounce" />
            {/* Success Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-40" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900">
            🎉 Import erfolgreich!
          </h3>
          <div className="inline-block bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl px-8 py-4 shadow-lg">
            <div className="text-5xl font-bold text-green-600 mb-1">
              {importResult.importedCount}
            </div>
            <p className="text-sm text-green-700 font-medium">
              Kunden erfolgreich importiert
            </p>
          </div>
        </div>

        {/* Info-Box mit moderner Gestaltung */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <p className="font-bold text-blue-900">Wichtige Hinweise:</p>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Die importierten Kunden sind als <strong>inaktiv</strong> markiert</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Sie werden als Quelle <strong>"KI-Import"</strong> gekennzeichnet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Sie können die Kunden in der Kundenverwaltung aktivieren</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Scrollbare Fehlerliste (falls welche) */}
        {importResult.errors && importResult.errors.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-amber-600" />
              <p className="font-bold text-amber-900">
                Einige Kunden konnten nicht importiert werden ({importResult.errors.length}):
              </p>
            </div>
            {/* Scrollbare Liste mit max-height */}
            <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-amber-200 p-3">
              <ul className="text-sm text-amber-800 space-y-2">
                {importResult.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5 flex-shrink-0">⚠</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Schließen Button */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={() => onClose(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md px-8 py-3 text-lg"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Fertig
          </Button>
        </div>
      </div>
    )
  }

  // Import fehlgeschlagen
  if (importResult && !importResult.erfolg) {
    return (
      <div className="space-y-8 py-8">
        {/* Error Header mit Animation */}
        <div className="text-center space-y-6">
          <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-red-100 to-rose-100 mb-4">
            <XCircle className="h-16 w-16 text-red-600" />
            {/* Error Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-pulse opacity-40" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900">
            ❌ Import fehlgeschlagen
          </h3>
          <p className="text-lg text-gray-600">
            Beim Importieren der Kunden ist ein Fehler aufgetreten
          </p>
        </div>

        {/* Scrollbare Fehler-Details */}
        {importResult.errors && importResult.errors.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="font-bold text-red-900">
                Fehlerdetails ({importResult.errors.length}):
              </p>
            </div>
            {/* Scrollbare Liste mit max-height */}
            <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-red-200 p-3">
              <ul className="text-sm text-red-800 space-y-2">
                {importResult.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5 flex-shrink-0">⚠</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            className="hover:bg-gray-50"
          >
            Schließen
          </Button>
        </div>
      </div>
    )
  }

  // Fallback: Sollte nicht vorkommen
  return (
    <div className="text-center py-8">
      <p className="text-gray-600">Warte auf Import-Status...</p>
    </div>
  )
}

