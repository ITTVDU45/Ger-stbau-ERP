'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Projekt } from '@/lib/db/types'
import { Activity, FileText, Package, Euro, Upload, CheckCircle, AlertCircle, Calculator, BarChart, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface ProjektAktivitaetenSidebarProps {
  projekt: Projekt
}

export default function ProjektAktivitaetenSidebar({ projekt }: ProjektAktivitaetenSidebarProps) {
  const [showAll, setShowAll] = useState(false)
  const aktivitaeten = projekt.aktivitaeten || []
  const maxInitialDisplay = 5
  
  const displayedAktivitaeten = showAll 
    ? aktivitaeten 
    : aktivitaeten.slice(0, maxInitialDisplay)

  const getAktivitaetenIcon = (typ: string) => {
    switch (typ) {
      case 'projekt':
        return <Activity className="h-4 w-4 text-blue-600" />
      case 'angebot':
        return <Package className="h-4 w-4 text-green-600" />
      case 'anfrage':
        return <FileText className="h-4 w-4 text-indigo-600" />
      case 'rechnung':
        return <Euro className="h-4 w-4 text-purple-600" />
      case 'vorkalkulation':
        return <Calculator className="h-4 w-4 text-cyan-600" />
      case 'nachkalkulation':
        return <BarChart className="h-4 w-4 text-pink-600" />
      case 'dokument':
        return <Upload className="h-4 w-4 text-orange-600" />
      case 'status':
        return <CheckCircle className="h-4 w-4 text-teal-600" />
      case 'mitarbeiter':
        return <Activity className="h-4 w-4 text-amber-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getAktivitaetenBadge = (typ: string) => {
    const config: any = {
      projekt: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Projekt' },
      angebot: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Angebot' },
      anfrage: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', label: 'Anfrage' },
      rechnung: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Rechnung' },
      vorkalkulation: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', label: 'Vorkalkulation' },
      nachkalkulation: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300', label: 'Nachkalkulation' },
      dokument: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'Dokument' },
      status: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', label: 'Status' },
      mitarbeiter: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Mitarbeiter' },
    }
    const c = config[typ] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: typ }
    return <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border} text-xs`}>{c.label}</Badge>
  }

  return (
    <Card className="bg-white border-gray-200 sticky top-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Aktivitätenlog
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aktivitaeten.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Noch keine Aktivitäten</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {displayedAktivitaeten
                .sort((a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime())
                .map((aktivitaet, index) => (
                  <div
                    key={index}
                    className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-l-0 last:pb-0"
                  >
                    {/* Icon */}
                    <div className="absolute left-[-9px] top-0 bg-white">
                      {getAktivitaetenIcon(aktivitaet.typ)}
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 flex-1">
                          {aktivitaet.aktion}
                        </p>
                        {getAktivitaetenBadge(aktivitaet.typ)}
                      </div>

                      {aktivitaet.details && (
                        <p className="text-xs text-gray-600">{aktivitaet.details}</p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{aktivitaet.benutzer}</span>
                        <span>•</span>
                        <span>
                          {aktivitaet.zeitpunkt ? format(new Date(aktivitaet.zeitpunkt), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            
            {/* Mehr anzeigen Button */}
            {aktivitaeten.length > maxInitialDisplay && (
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Weniger anzeigen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      {aktivitaeten.length - maxInitialDisplay} weitere Aktivitäten anzeigen
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

