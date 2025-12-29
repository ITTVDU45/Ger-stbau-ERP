'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Plus, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface MahnungenListeProps {
  rechnungId: string
}

export default function MahnungenListe({ rechnungId }: MahnungenListeProps) {
  const router = useRouter()
  const [mahnungen, setMahnungen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMahnungen()
  }, [rechnungId])

  const loadMahnungen = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mahnwesen?rechnungId=${rechnungId}`)
      const data = await response.json()

      if (data.erfolg) {
        setMahnungen(data.mahnungen)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mahnungen:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMahnstufeColor = (mahnstufe: number) => {
    switch (mahnstufe) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 2:
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 3:
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      erstellt: { label: 'Erstellt', className: 'bg-gray-100 text-gray-800' },
      zur_genehmigung: {
        label: 'Zur Genehmigung',
        className: 'bg-yellow-100 text-yellow-800'
      },
      genehmigt: { label: 'Genehmigt', className: 'bg-green-100 text-green-800' },
      abgelehnt: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      versendet: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      bezahlt: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' }
    }
    const c = config[status] || config.erstellt
    return <Badge className={c.className}>{c.label}</Badge>
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
      </div>
    )
  }

  if (mahnungen.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 mb-4">Noch keine Mahnungen zu dieser Rechnung</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/dashboard/admin/mahnwesen')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Mahnung erstellen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {mahnungen.map((mahnung) => (
        <div
          key={mahnung._id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono font-medium text-gray-900">
                {mahnung.mahnungsnummer}
              </span>
              <Badge
                variant="outline"
                className={getMahnstufeColor(mahnung.mahnstufe)}
              >
                Stufe {mahnung.mahnstufe}
              </Badge>
              {getStatusBadge(mahnung.status)}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                Erstellt:{' '}
                {format(new Date(mahnung.datum), 'dd.MM.yyyy', { locale: de })}
              </span>
              <span>•</span>
              <span>
                Fällig:{' '}
                {format(new Date(mahnung.faelligAm), 'dd.MM.yyyy', { locale: de })}
              </span>
              <span>•</span>
              <span className="font-semibold text-gray-900">
                {mahnung.gesamtforderung.toLocaleString('de-DE', {
                  minimumFractionDigits: 2
                })}{' '}
                €
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/admin/mahnwesen/${mahnung._id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Details
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push('/dashboard/admin/mahnwesen')}
      >
        <Plus className="h-4 w-4 mr-2" />
        Weitere Mahnung erstellen
      </Button>
    </div>
  )
}

