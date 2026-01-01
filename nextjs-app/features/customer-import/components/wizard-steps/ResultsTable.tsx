'use client'

// Step 3: Ergebnisliste mit Auswahl
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle2, AlertTriangle, XCircle, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, FileText, Briefcase, Users, Mail } from 'lucide-react'
import type { AiImportResult } from '../../types'

interface ResultsTableProps {
  results: AiImportResult[]
  selectedIds: string[]
  onToggleSelection: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSelectOnlyComplete: () => void
  onBack: () => void
  onNext: () => void
}

export function ResultsTable({
  results,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onSelectOnlyComplete,
  onBack,
  onNext
}: ResultsTableProps) {
  const allSelected = results.length > 0 && selectedIds.length === results.length
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Score Badge Helper - kompakter
  const getScoreBadge = (score?: number) => {
    if (!score) return <span className="text-gray-400 text-xs">-</span>
    
    if (score >= 80) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs px-2 py-0.5">
          <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
          {score}%
        </Badge>
      )
    } else if (score >= 60) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs px-2 py-0.5">
          <AlertTriangle className="h-2.5 w-2.5 mr-1" />
          {score}%
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs px-2 py-0.5">
          <XCircle className="h-2.5 w-2.5 mr-1" />
          {score}%
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">✓</span>
              {results.length} Unternehmen gefunden
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Wählen Sie die Unternehmen aus, die Sie als Kunden importieren möchten
            </p>
          </div>
          
          {/* Selection Counter Badge */}
          <div className="bg-white px-4 py-2 rounded-lg border border-green-300 shadow-sm">
            <div className="text-sm text-gray-600 text-center">
              <span className="text-2xl font-bold text-green-600">{selectedIds.length}</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-gray-500">{results.length}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">ausgewählt</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="bg-white hover:bg-gray-50"
          >
            {allSelected ? '⊗ Alle abwählen' : '☑ Alle auswählen'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSelectOnlyComplete}
            className="bg-white hover:bg-gray-50"
          >
            ✓ Nur vollständige
          </Button>
        </div>
      </div>

      {/* Tabelle */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-sm">
              <TableRow className="border-b-2 border-gray-200">
                <TableHead className="w-10 py-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => allSelected ? onDeselectAll() : onSelectAll()}
                  />
                </TableHead>
                <TableHead className="w-10 py-2"></TableHead>
                <TableHead className="font-semibold py-2">Firmenname</TableHead>
                <TableHead className="font-semibold py-2">Adresse</TableHead>
                <TableHead className="font-semibold py-2">Branche</TableHead>
                <TableHead className="font-semibold py-2">Ansprechpartner</TableHead>
                <TableHead className="font-semibold py-2">Telefon</TableHead>
                <TableHead className="font-semibold py-2">E-Mail</TableHead>
                <TableHead className="font-semibold py-2">Website</TableHead>
                <TableHead className="font-semibold py-2 text-center">Qualität</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <React.Fragment key={result.id}>
                  <TableRow
                    className={`
                      cursor-pointer transition-all border-b border-gray-100
                      ${selectedIds.includes(result.id) 
                        ? 'bg-purple-50 hover:bg-purple-100 border-l-4 border-l-purple-500' 
                        : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }
                      ${result.istDuplikat ? 'opacity-60' : ''}
                    `}
                    onClick={() => onToggleSelection(result.id)}
                  >
                  <TableCell className="py-2">
                    <Checkbox
                      checked={selectedIds.includes(result.id)}
                      onCheckedChange={() => onToggleSelection(result.id)}
                    />
                  </TableCell>
                  
                  {/* Details-Button für Website-Analyse */}
                  <TableCell className="py-2">
                    {result.websiteAnalyse && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRowExpansion(result.id)
                        }}
                      >
                        {expandedRows.has(result.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  
                  <TableCell className="font-medium py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{result.firmenname}</span>
                      {result.istDuplikat && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs px-1.5 py-0">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          Duplikat?
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Vollständige Adresse */}
                  <TableCell className="text-xs py-2">
                    {result.adresse ? (
                      <div className="space-y-0.5">
                        {(result.adresse.strasse || result.adresse.hausnummer) && (
                          <div className="text-gray-900">
                            {result.adresse.strasse} {result.adresse.hausnummer}
                          </div>
                        )}
                        {(result.adresse.plz || result.adresse.ort) && (
                          <div className="text-gray-600">
                            {result.adresse.plz} {result.adresse.ort}
                          </div>
                        )}
                        {!result.adresse.strasse && !result.adresse.plz && result.standort && (
                          <div className="text-gray-600">{result.standort}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  
                  {/* Branche */}
                  <TableCell className="text-xs text-gray-600 py-2">
                    {result.branche || <span className="text-gray-400">-</span>}
                  </TableCell>
                  
                  {/* Ansprechpartner */}
                  <TableCell className="text-xs py-2">
                    {result.ansprechpartner ? (
                      <div className="space-y-0.5">
                        <div className="text-gray-900 font-medium">
                          {result.ansprechpartner.vorname} {result.ansprechpartner.nachname}
                        </div>
                        {result.ansprechpartner.position && (
                          <div className="text-gray-500 text-[10px]">
                            {result.ansprechpartner.position}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  
                  {/* Telefon */}
                  <TableCell className="text-xs py-2">
                    {result.telefon ? (
                      <span className="text-gray-900 font-mono">{result.telefon}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  
                  {/* E-Mail */}
                  <TableCell className="text-xs py-2">
                    {result.email ? (
                      <a 
                        href={`mailto:${result.email}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {result.email}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  
                  {/* Website */}
                  <TableCell className="text-xs py-2">
                    {result.website ? (
                      <a 
                        href={result.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🔗 Link
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  
                    {/* Qualität */}
                    <TableCell className="py-2 text-center">
                      {getScoreBadge(result.analyseScore)}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expandierbare Zeile mit Website-Analyse */}
                  {expandedRows.has(result.id) && result.websiteAnalyse && (
                    <TableRow className="bg-purple-50/50">
                    <TableCell colSpan={10} className="py-4 px-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-purple-700 font-semibold text-sm mb-3">
                          <FileText className="h-4 w-4" />
                          <span>Website-Analyse für {result.firmenname}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Beschreibung */}
                          {result.websiteAnalyse.beschreibung && (
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold text-sm text-gray-900">Unternehmensbeschreibung</span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {result.websiteAnalyse.beschreibung}
                              </p>
                            </div>
                          )}
                          
                          {/* Dienstleistungen */}
                          {result.websiteAnalyse.dienstleistungen && result.websiteAnalyse.dienstleistungen.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold text-sm text-gray-900">Dienstleistungen</span>
                              </div>
                              <ul className="text-xs text-gray-700 space-y-1">
                                {result.websiteAnalyse.dienstleistungen.slice(0, 5).map((service, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-purple-500">•</span>
                                    <span>{service}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Gefundene E-Mails */}
                          {result.websiteAnalyse.extractedEmails && result.websiteAnalyse.extractedEmails.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Mail className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold text-sm text-gray-900">Gefundene E-Mails</span>
                              </div>
                              <ul className="text-xs text-gray-700 space-y-1">
                                {result.websiteAnalyse.extractedEmails.map((email, idx) => (
                                  <li key={idx}>
                                    <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                                      {email}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Ansprechpartner aus Website */}
                          {result.websiteAnalyse.ansprechpartner && result.websiteAnalyse.ansprechpartner.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold text-sm text-gray-900">Ansprechpartner</span>
                              </div>
                              <div className="space-y-2">
                                {result.websiteAnalyse.ansprechpartner.map((contact, idx) => (
                                  <div key={idx} className="text-xs border-l-2 border-purple-300 pl-2">
                                    <div className="font-semibold text-gray-900">{contact.name}</div>
                                    {contact.position && (
                                      <div className="text-gray-600">{contact.position}</div>
                                    )}
                                    {contact.email && (
                                      <div className="text-blue-600">{contact.email}</div>
                                    )}
                                    {contact.telefon && (
                                      <div className="text-gray-700 font-mono">{contact.telefon}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Info Box - Warnung wenn keine Auswahl */}
      {selectedIds.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">Keine Kunden ausgewählt</p>
            <p className="text-xs text-amber-800 mt-1">
              Wählen Sie mindestens ein Unternehmen aus der Tabelle aus, um den Import zu starten.
            </p>
          </div>
        </div>
      )}
      
      {/* Info Box - Erfolg wenn Auswahl vorhanden */}
      {selectedIds.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-900 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">{selectedIds.length} Kunden bereit zum Import</p>
            <p className="text-xs text-green-800 mt-1">
              Die Kunden werden als <strong>inaktiv</strong> markiert und mit Quelle "KI-Import" angelegt.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <Button
          type="button"
          onClick={() => {
            console.log('🔘 Import-Button geklickt!')
            console.log('  Ausgewählte IDs:', selectedIds)
            console.log('  Anzahl:', selectedIds.length)
            onNext()
          }}
          disabled={selectedIds.length === 0}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
          title={selectedIds.length === 0 ? 'Bitte wählen Sie mindestens einen Kunden aus' : `${selectedIds.length} Kunden importieren`}
        >
          📥 {selectedIds.length > 0 ? `${selectedIds.length} Kunden importieren` : 'Kunden importieren'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

