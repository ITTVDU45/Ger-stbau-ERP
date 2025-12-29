'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from 'lucide-react'
import { ZeitraumFilter as ZeitraumFilterType } from '@/lib/db/types'

interface ZeitraumFilterProps {
  zeitraumTyp: ZeitraumFilterType['typ']
  vonDatum: string
  bisDatum: string
  onZeitraumTypChange: (typ: ZeitraumFilterType['typ']) => void
  onVonDatumChange: (datum: string) => void
  onBisDatumChange: (datum: string) => void
  compact?: boolean
}

export default function ZeitraumFilter({
  zeitraumTyp,
  vonDatum,
  bisDatum,
  onZeitraumTypChange,
  onVonDatumChange,
  onBisDatumChange,
  compact = false
}: ZeitraumFilterProps) {
  const zeitraumLabels: Record<ZeitraumFilterType['typ'], string> = {
    all: 'Alle Daten',
    letzte_30_tage: 'Letzte 30 Tage',
    letzte_90_tage: 'Letzte 90 Tage',
    letztes_jahr: 'Letztes Jahr (365 Tage)',
    aktuelles_jahr: 'Aktuelles Jahr',
    aktuelles_quartal: 'Aktuelles Quartal',
    vorjahr: 'Vorjahr',
    letztes_quartal: 'Letztes Quartal',
    benutzerdefiniert: 'Benutzerdefiniert'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Select value={zeitraumTyp} onValueChange={(value) => onZeitraumTypChange(value as ZeitraumFilterType['typ'])}>
            <SelectTrigger className="bg-white border-gray-300 text-gray-900">
              <SelectValue className="text-gray-900" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {Object.entries(zeitraumLabels).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-gray-900 cursor-pointer">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {zeitraumTyp === 'benutzerdefiniert' && (
          <>
            <div className="flex-1 min-w-[150px]">
              <Input
                type="date"
                value={vonDatum}
                onChange={(e) => onVonDatumChange(e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Input
                type="date"
                value={bisDatum}
                onChange={(e) => onBisDatumChange(e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Card className="bg-white border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          Zeitraumfilter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="zeitraum" className="text-gray-900 font-semibold">
              Zeitraum
            </Label>
            <Select value={zeitraumTyp} onValueChange={(value) => onZeitraumTypChange(value as ZeitraumFilterType['typ'])}>
              <SelectTrigger id="zeitraum" className="mt-2 bg-white border-gray-300 text-gray-900">
                <SelectValue className="text-gray-900" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {Object.entries(zeitraumLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-gray-900 cursor-pointer">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {zeitraumTyp === 'benutzerdefiniert' && (
            <>
              <div>
                <Label htmlFor="von" className="text-gray-900 font-semibold">
                  Von
                </Label>
                <Input
                  id="von"
                  type="date"
                  value={vonDatum}
                  onChange={(e) => onVonDatumChange(e.target.value)}
                  className="mt-2 bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="bis" className="text-gray-900 font-semibold">
                  Bis
                </Label>
                <Input
                  id="bis"
                  type="date"
                  value={bisDatum}
                  onChange={(e) => onBisDatumChange(e.target.value)}
                  className="mt-2 bg-white border-gray-300 text-gray-900"
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
