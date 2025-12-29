'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle,
  Send,
  Clock,
  FileWarning,
  Ban,
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react'

export interface MahnwesenStats {
  aktiveMahnungen: number
  gesendeteMahnungen: number
  offeneMahnungen: number
  ueberfaelligeRechnungen: number
  gesperrteKunden: number
  zurGenehmigung: number
  abgelehnteMahnungen: number
  offenerGesamtbetrag: number
}

interface MahnwesenKPICardsProps {
  stats: MahnwesenStats
  onCardClick?: (filter: string) => void
}

export default function MahnwesenKPICards({ stats, onCardClick }: MahnwesenKPICardsProps) {
  const cards = [
    {
      title: 'Aktive Mahnungen',
      value: stats.aktiveMahnungen,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      filter: 'aktiv'
    },
    {
      title: 'Gesendete Mahnungen',
      value: stats.gesendeteMahnungen,
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      filter: 'gesendet'
    },
    {
      title: 'Offene Mahnungen',
      value: stats.offeneMahnungen,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      filter: 'offen'
    },
    {
      title: 'Überfällige Rechnungen',
      value: stats.ueberfaelligeRechnungen,
      icon: FileWarning,
      color: 'text-yellow-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      description: 'noch nicht gemahnt',
      filter: 'ueberfaellig'
    },
    {
      title: 'Gesperrte Kunden',
      value: stats.gesperrteKunden,
      icon: Ban,
      color: 'text-gray-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      filter: 'gesperrt'
    },
    {
      title: 'Zur Genehmigung',
      value: stats.zurGenehmigung,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      filter: 'genehmigung'
    },
    {
      title: 'Abgelehnte Mahnungen',
      value: stats.abgelehnteMahnungen,
      icon: XCircle,
      color: 'text-pink-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      filter: 'abgelehnt'
    },
    {
      title: 'Offener Gesamtbetrag',
      value: `${stats.offenerGesamtbetrag.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} €`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      description: 'Summe aller offenen Forderungen',
      filter: 'betrag'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.title}
            className={`${card.bgColor} ${card.borderColor} ${
              onCardClick ? 'cursor-pointer hover:shadow-lg transition-all' : ''
            }`}
            onClick={() => onCardClick?.(card.filter)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              {card.description && (
                <p className="text-xs text-gray-600 mt-1">{card.description}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

