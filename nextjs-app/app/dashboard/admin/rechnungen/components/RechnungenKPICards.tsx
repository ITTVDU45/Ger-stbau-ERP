'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, XCircle, CheckCircle, FileWarning, Clock, DollarSign } from 'lucide-react'

interface RechnungenStats {
  offeneRechnungen: number
  ueberfaelligeRechnungen: number
  bezahlteRechnungen: number
  rechnungenMitMahnung: number
  rechnungenOhneMahnung: number
  summeOffen: number
  summeBezahlt: number
  summeUeberfaellig: number
}

interface RechnungenKPICardsProps {
  stats: RechnungenStats | null
  onCardClick: (filter: string) => void
}

export default function RechnungenKPICards({ stats, onCardClick }: RechnungenKPICardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Offene Rechnungen',
      value: stats.offeneRechnungen,
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300',
      iconColor: 'text-yellow-600',
      filter: 'offen',
      description: 'Noch nicht bezahlt'
    },
    {
      title: 'Überfällige Rechnungen',
      value: stats.ueberfaelligeRechnungen,
      icon: XCircle,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      iconColor: 'text-red-600',
      filter: 'ueberfaellig',
      description: 'Zahlungsziel überschritten'
    },
    {
      title: 'Bezahlte Rechnungen',
      value: stats.bezahlteRechnungen,
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-300',
      iconColor: 'text-green-600',
      filter: 'bezahlt',
      description: 'Vollständig bezahlt'
    },
    {
      title: 'Rechnungen mit Mahnung',
      value: stats.rechnungenMitMahnung,
      icon: FileWarning,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-300',
      iconColor: 'text-orange-600',
      filter: 'mahnung',
      description: 'Offene Mahnungen'
    },
    {
      title: 'Ohne Mahnung',
      value: stats.rechnungenOhneMahnung,
      icon: Clock,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300',
      iconColor: 'text-blue-600',
      filter: 'ohne_mahnung',
      description: 'Überfällig, nicht gemahnt'
    },
    {
      title: 'Summe offen',
      value: `${stats.summeOffen.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`,
      icon: DollarSign,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-300',
      iconColor: 'text-purple-600',
      filter: 'offen',
      description: 'Offener Gesamtbetrag'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card
            key={index}
            className={`bg-white border ${card.borderColor} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => onCardClick(card.filter)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 mt-1">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

