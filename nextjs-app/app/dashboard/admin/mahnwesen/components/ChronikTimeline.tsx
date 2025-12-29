'use client'

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  FileText,
  CheckCircle,
  XCircle,
  Send,
  Edit,
  Ban,
  TrendingUp
} from 'lucide-react'

interface ChronikEintrag {
  aktion: string
  benutzer: string
  zeitpunkt: Date | string
  details?: string
  alterStatus?: string
  neuerStatus?: string
}

interface ChronikTimelineProps {
  chronik: ChronikEintrag[]
}

export default function ChronikTimeline({ chronik }: ChronikTimelineProps) {
  const getIcon = (aktion: string) => {
    switch (aktion) {
      case 'erstellt':
        return <FileText className="h-5 w-5 text-blue-600" />
      case 'genehmigt':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'abgelehnt':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'versendet':
        return <Send className="h-5 w-5 text-purple-600" />
      case 'bearbeitet':
        return <Edit className="h-5 w-5 text-orange-600" />
      case 'storniert':
        return <Ban className="h-5 w-5 text-gray-600" />
      case 'mahnstufe_erhoeht':
        return <TrendingUp className="h-5 w-5 text-yellow-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getAktionLabel = (aktion: string) => {
    const labels: Record<string, string> = {
      erstellt: 'Mahnung erstellt',
      genehmigt: 'Mahnung genehmigt',
      abgelehnt: 'Mahnung abgelehnt',
      versendet: 'Mahnung versendet',
      bearbeitet: 'Mahnung bearbeitet',
      storniert: 'Mahnung storniert',
      mahnstufe_erhoeht: 'Mahnstufe erhöht'
    }
    return labels[aktion] || aktion
  }

  const getAktionColor = (aktion: string) => {
    switch (aktion) {
      case 'erstellt':
        return 'text-blue-700 bg-blue-50'
      case 'genehmigt':
        return 'text-green-700 bg-green-50'
      case 'abgelehnt':
        return 'text-red-700 bg-red-50'
      case 'versendet':
        return 'text-purple-700 bg-purple-50'
      case 'bearbeitet':
        return 'text-orange-700 bg-orange-50'
      case 'storniert':
        return 'text-gray-700 bg-gray-50'
      case 'mahnstufe_erhoeht':
        return 'text-yellow-700 bg-yellow-50'
      default:
        return 'text-gray-700 bg-gray-50'
    }
  }

  // Sortiere Chronik nach Zeitpunkt (neueste zuerst)
  const sortierteChronik = [...chronik].sort(
    (a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime()
  )

  if (chronik.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Keine Aktivitäten vorhanden</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortierteChronik.map((eintrag, index) => (
        <div
          key={index}
          className="relative flex gap-4 pb-4 border-l-2 border-gray-200 last:border-l-0 pl-6"
        >
          {/* Icon */}
          <div className="absolute left-[-13px] top-0 bg-white p-1 rounded-full border-2 border-gray-200">
            {getIcon(eintrag.aktion)}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block px-2 py-1 rounded-md text-sm font-medium ${getAktionColor(
                      eintrag.aktion
                    )}`}
                  >
                    {getAktionLabel(eintrag.aktion)}
                  </span>
                </div>

                {eintrag.details && (
                  <p className="text-sm text-gray-700 mb-2">{eintrag.details}</p>
                )}

                {eintrag.alterStatus && eintrag.neuerStatus && (
                  <p className="text-xs text-gray-600">
                    Status:{' '}
                    <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                      {eintrag.alterStatus}
                    </span>
                    {' → '}
                    <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                      {eintrag.neuerStatus}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{eintrag.benutzer}</span>
              <span>•</span>
              <span>
                {format(new Date(eintrag.zeitpunkt), 'dd.MM.yyyy HH:mm', {
                  locale: de
                })}{' '}
                Uhr
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

