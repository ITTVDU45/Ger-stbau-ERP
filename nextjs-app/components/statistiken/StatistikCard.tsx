'use client'

/**
 * StatistikCard - Wiederverwendbare KPI-Karte
 * 
 * Zeigt einen einzelnen KPI-Wert mit optionalem Trend und Vergleich
 */

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatistikCardProps {
  titel: string
  wert: number | string
  format?: 'number' | 'currency' | 'percent' | 'text'
  trend?: number // Prozentuale Änderung
  vergleich?: string | null // Vergleichstext
  untertitel?: string
  className?: string
  onClick?: () => void
}

export function StatistikCard({
  titel,
  wert,
  format = 'number',
  trend,
  vergleich,
  untertitel,
  className,
  onClick
}: StatistikCardProps) {
  // Wert formatieren
  const formatValue = (val: number | string, fmt: string): string => {
    if (typeof val === 'string') return val
    
    switch (fmt) {
      case 'currency':
        return val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
      case 'percent':
        return `${val.toFixed(1)}%`
      case 'number':
        return val.toLocaleString('de-DE')
      default:
        return String(val)
    }
  }
  
  const formattedValue = formatValue(wert, format)
  
  // Trend-Indikator
  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null
    
    if (trend > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (trend < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    } else {
      return <Minus className="h-4 w-4 text-gray-400" />
    }
  }
  
  const getTrendText = () => {
    if (trend === undefined || trend === null) return null
    
    const absTrend = Math.abs(trend)
    const sign = trend > 0 ? '+' : trend < 0 ? '-' : ''
    return `${sign}${absTrend.toFixed(1)}%`
  }
  
  return (
    <Card 
      className={cn(
        'bg-white hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">{titel}</h3>
            {trend !== undefined && trend !== null && (
              <div className="flex items-center gap-1 text-xs">
                {getTrendIcon()}
                <span className={cn(
                  'font-medium',
                  trend > 0 && 'text-green-600',
                  trend < 0 && 'text-red-600',
                  trend === 0 && 'text-gray-400'
                )}>
                  {getTrendText()}
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-gray-900">
              {formattedValue}
            </p>
            
            {untertitel && (
              <p className="text-xs text-gray-500">
                {untertitel}
              </p>
            )}
            
            {vergleich && (
              <p className="text-xs text-gray-400">
                {vergleich}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
