'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, FileWarning, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import { KundenberichtStats } from '@/lib/db/types'

interface BerichtKPICardsProps {
  stats: KundenberichtStats | null
  onCardClick: (filter: string) => void
}

export default function BerichtKPICards({ stats, onCardClick }: BerichtKPICardsProps) {
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-gray-100">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Aktive Kunden',
      value: stats.aktiveKunden,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      filter: 'aktive'
    },
    {
      title: 'Offene Rechnungen',
      value: stats.kundenMitOffenenRechnungen,
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      filter: 'offene_rechnungen'
    },
    {
      title: 'Mahnungen offen',
      value: stats.kundenMitOffenerMahnung,
      icon: FileWarning,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      filter: 'mahnung_offen'
    },
    {
      title: 'Umsatz im Zeitraum',
      value: `${stats.gesamtumsatzImZeitraum.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      filter: 'top_umsatz'
    },
    {
      title: 'Ø Zahlungsdauer',
      value: `${stats.durchschnittlicheZahlungsdauer} Tage`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      filter: 'zahlungsdauer'
    },
    {
      title: 'Ohne Aktivität (90T)',
      value: stats.kundenOhneAktivitaet90Tage,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      filter: 'keine_aktivitaet'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={`${card.bgColor} ${card.borderColor} cursor-pointer hover:shadow-md transition-shadow`}
          onClick={() => onCardClick(card.filter)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

