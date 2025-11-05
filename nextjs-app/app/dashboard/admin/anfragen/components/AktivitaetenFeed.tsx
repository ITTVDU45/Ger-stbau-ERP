'use client'

import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, AlertCircle, FileText, User } from 'lucide-react'
import { Anfrage } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface AktivitaetenFeedProps {
  aktivitaeten?: Anfrage['aktivitaeten']
}

export default function AktivitaetenFeed({ aktivitaeten = [] }: AktivitaetenFeedProps) {
  if (!aktivitaeten || aktivitaeten.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Keine Aktivitäten vorhanden</p>
        <p className="text-sm text-gray-500 mt-1">Änderungen werden hier protokolliert</p>
      </div>
    )
  }

  const getIcon = (aktion: string) => {
    if (aktion.toLowerCase().includes('erstellt')) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (aktion.toLowerCase().includes('aktualisiert') || aktion.toLowerCase().includes('bearbeitet')) {
      return <AlertCircle className="h-5 w-5 text-blue-600" />
    } else if (aktion.toLowerCase().includes('angebot')) {
      return <FileText className="h-5 w-5 text-purple-600" />
    } else {
      return <User className="h-5 w-5 text-gray-600" />
    }
  }

  const getColor = (aktion: string) => {
    if (aktion.toLowerCase().includes('erstellt')) {
      return 'bg-green-50 border-green-200'
    } else if (aktion.toLowerCase().includes('aktualisiert') || aktion.toLowerCase().includes('bearbeitet')) {
      return 'bg-blue-50 border-blue-200'
    } else if (aktion.toLowerCase().includes('angebot')) {
      return 'bg-purple-50 border-purple-200'
    } else {
      return 'bg-gray-50 border-gray-200'
    }
  }

  // Sortiere Aktivitäten nach Datum (neueste zuerst)
  const sortiertAktivitaeten = [...aktivitaeten].sort(
    (a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime()
  )

  return (
    <div className="space-y-4">
      {sortiertAktivitaeten.map((aktivitaet, index) => (
        <div 
          key={index} 
          className={`p-4 rounded-lg border ${getColor(aktivitaet.aktion)} transition-all hover:shadow-md`}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {getIcon(aktivitaet.aktion)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {aktivitaet.aktion}
                  </p>
                  {aktivitaet.details && (
                    <p className="text-sm text-gray-700 mt-1">
                      {aktivitaet.details}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="bg-white text-gray-700 border-gray-300 flex-shrink-0">
                  {aktivitaet.zeitpunkt ? format(new Date(aktivitaet.zeitpunkt), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <User className="h-3 w-3 text-gray-500" />
                <p className="text-xs text-gray-600">
                  {aktivitaet.benutzer}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

