'use client'

import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Euro, ShoppingCart, Wallet, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinanzenKPICardsProps {
  stats: {
    einnahmenGesamt: number
    ausgabenGesamt: number
    saldo: number
    topKategorienAusgaben?: Array<{ _id: string; gesamt: number }>
    topKategorienEinnahmen?: Array<{ _id: string; gesamt: number }>
    durchschnittEinnahmenProMonat?: number
    durchschnittAusgabenProMonat?: number
    anzahlTransaktionen?: number
    vergleichVorperiode?: {
      einnahmenDifferenz: number
      ausgabenDifferenz: number
      saldoDifferenz: number
    }
  } | null
  onCardClick?: (filter: string) => void
  activeFilter?: string | null
}

export default function FinanzenKPICards({ stats, onCardClick, activeFilter }: FinanzenKPICardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-6 bg-white border-2 border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const kpiCards = [
    {
      id: 'einnahmen',
      label: 'Einnahmen Gesamt',
      value: formatCurrency(stats.einnahmenGesamt),
      icon: TrendingUp,
      color: 'text-green-600',
      borderColor: 'border-gray-200',
      trend: stats.vergleichVorperiode?.einnahmenDifferenz,
      clickable: true
    },
    {
      id: 'ausgaben',
      label: 'Ausgaben Gesamt',
      value: formatCurrency(stats.ausgabenGesamt),
      icon: TrendingDown,
      color: 'text-red-600',
      borderColor: 'border-gray-200',
      trend: stats.vergleichVorperiode?.ausgabenDifferenz,
      clickable: true
    },
    {
      id: 'saldo',
      label: 'Differenz',
      value: formatCurrency(stats.saldo),
      icon: stats.saldo >= 0 ? Wallet : CreditCard,
      color: stats.saldo >= 0 ? 'text-blue-600' : 'text-orange-600',
      borderColor: 'border-gray-200',
      trend: stats.vergleichVorperiode?.saldoDifferenz,
      clickable: false
    },
    {
      id: 'top-kategorie-ausgaben',
      label: 'Top Ausgabenkategorie',
      value: stats.topKategorienAusgaben?.[0]?._id || 'Keine Daten',
      subValue: stats.topKategorienAusgaben?.[0]?.gesamt 
        ? formatCurrency(stats.topKategorienAusgaben[0].gesamt)
        : '',
      icon: ShoppingCart,
      color: 'text-purple-600',
      borderColor: 'border-gray-200',
      clickable: true
    },
    {
      id: 'durchschnitt-einnahmen',
      label: 'Ø Einnahmen / Monat',
      value: stats.durchschnittEinnahmenProMonat 
        ? formatCurrency(stats.durchschnittEinnahmenProMonat)
        : 'N/A',
      icon: Euro,
      color: 'text-teal-600',
      borderColor: 'border-gray-200',
      clickable: false
    },
    {
      id: 'durchschnitt-ausgaben',
      label: 'Ø Ausgaben / Monat',
      value: stats.durchschnittAusgabenProMonat 
        ? formatCurrency(stats.durchschnittAusgabenProMonat)
        : 'N/A',
      icon: ShoppingCart,
      color: 'text-amber-600',
      borderColor: 'border-gray-200',
      clickable: false
    },
    {
      id: 'top-kategorie-einnahmen',
      label: 'Top Einnahmenkategorie',
      value: stats.topKategorienEinnahmen?.[0]?._id || 'Keine Daten',
      subValue: stats.topKategorienEinnahmen?.[0]?.gesamt 
        ? formatCurrency(stats.topKategorienEinnahmen[0].gesamt)
        : '',
      icon: ArrowUpRight,
      color: 'text-emerald-600',
      borderColor: 'border-gray-200',
      clickable: true
    },
    {
      id: 'anzahl-transaktionen',
      label: 'Anzahl Transaktionen',
      value: stats.anzahlTransaktionen?.toString() || '0',
      icon: ArrowDownRight,
      color: 'text-gray-600',
      borderColor: 'border-gray-200',
      clickable: false
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((card) => {
        const Icon = card.icon
        const isActive = activeFilter === card.id
        const isClickable = card.clickable

        return (
          <Card
            key={card.id}
            className={cn(
              'p-6 transition-all duration-200 bg-white',
              isClickable && 'cursor-pointer hover:shadow-md hover:scale-105',
              isActive && 'ring-2 ring-primary shadow-lg',
              card.borderColor,
              'border-2'
            )}
            onClick={() => isClickable && onCardClick?.(card.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                {card.subValue && (
                  <p className="text-xs text-gray-500">{card.subValue}</p>
                )}
                {card.trend !== undefined && card.trend !== 0 && (
                  <div className={cn(
                    'flex items-center gap-1 mt-2',
                    card.trend > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {card.trend > 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    <span className="text-xs font-medium">
                      {formatPercent(card.trend)} vs. Vorperiode
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <Icon className={cn('h-6 w-6', card.color)} />
              </div>
            </div>
            {isClickable && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  {isActive ? '✓ Filter aktiv' : 'Klicken zum Filtern'}
                </p>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

