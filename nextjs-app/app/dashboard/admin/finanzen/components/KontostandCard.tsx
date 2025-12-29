'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, TrendingUp, TrendingDown, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface KontostandCardProps {
  kontostand: any
  onEdit: () => void
  loading?: boolean
}

export default function KontostandCard({ kontostand, onEdit, loading }: KontostandCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  if (loading) {
    return (
      <Card className="p-6 bg-white border-2 border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-100 rounded w-2/3"></div>
      </Card>
    )
  }

  const betrag = kontostand?.betrag || 0
  const datum = kontostand?.datum ? new Date(kontostand.datum) : null
  const isPositive = betrag >= 0

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-100 rounded-full p-2">
              <Wallet className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Aktueller Kontostand</h3>
          </div>
          
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(betrag)}
              </span>
              {isPositive ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
            
            {datum && (
              <p className="text-sm text-gray-600 mt-2">
                Stand vom {format(datum, 'dd.MM.yyyy', { locale: de })}
              </p>
            )}
            
            {kontostand?.notiz && (
              <p className="text-xs text-gray-500 mt-1 italic">
                {kontostand.notiz}
              </p>
            )}
          </div>
        </div>
        
        <Button
          onClick={onEdit}
          size="sm"
          variant="outline"
          className="ml-4 text-gray-900 hover:text-gray-900"
        >
          <Edit className="h-4 w-4 mr-2" />
          Anpassen
        </Button>
      </div>
      
      {!kontostand && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ℹ️ Noch kein Kontostand erfasst. Klicken Sie auf "Anpassen", um den Anfangsstand einzugeben.
          </p>
        </div>
      )}
    </Card>
  )
}

