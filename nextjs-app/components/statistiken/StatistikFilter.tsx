'use client'

/**
 * StatistikFilter - Filter-Komponente für Statistiken
 * 
 * Zeitraum-Auswahl und weitere Filter je nach Tab
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns'
import { de } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ZeitraumTyp = 'tag' | 'woche' | 'monat' | 'quartal' | 'jahr' | 'custom'

export interface StatistikFilterProps {
  zeitraumTyp: ZeitraumTyp
  von: Date
  bis: Date
  onZeitraumChange: (typ: ZeitraumTyp, von: Date, bis: Date) => void
  zusaetzlicheFilter?: React.ReactNode
  className?: string
}

export function StatistikFilter({
  zeitraumTyp,
  von,
  bis,
  onZeitraumChange,
  zusaetzlicheFilter,
  className
}: StatistikFilterProps) {
  const [customVon, setCustomVon] = useState<Date | undefined>(von)
  const [customBis, setCustomBis] = useState<Date | undefined>(bis)
  
  const handleZeitraumTypChange = (typ: ZeitraumTyp) => {
    const heute = new Date()
    let neuesVon: Date
    let neuesBis: Date
    
    switch (typ) {
      case 'tag':
        neuesVon = new Date(heute.setHours(0, 0, 0, 0))
        neuesBis = new Date(heute.setHours(23, 59, 59, 999))
        break
      case 'woche':
        neuesVon = startOfWeek(heute, { weekStartsOn: 1 })
        neuesBis = endOfWeek(heute, { weekStartsOn: 1 })
        break
      case 'monat':
        neuesVon = startOfMonth(heute)
        neuesBis = endOfMonth(heute)
        break
      case 'quartal':
        const quartal = Math.floor(heute.getMonth() / 3)
        neuesVon = new Date(heute.getFullYear(), quartal * 3, 1)
        neuesBis = new Date(heute.getFullYear(), quartal * 3 + 3, 0, 23, 59, 59, 999)
        break
      case 'jahr':
        neuesVon = startOfYear(heute)
        neuesBis = endOfYear(heute)
        break
      case 'custom':
        // Custom bleibt wie es ist
        return
      default:
        return
    }
    
    onZeitraumChange(typ, neuesVon, neuesBis)
  }
  
  const handleCustomDateChange = () => {
    if (customVon && customBis) {
      onZeitraumChange('custom', customVon, customBis)
    }
  }
  
  useEffect(() => {
    setCustomVon(von)
    setCustomBis(bis)
  }, [von, bis])
  
  return (
    <div className={cn('flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg border', className)}>
      <div className="space-y-2">
        <Label htmlFor="zeitraum-typ">Zeitraum</Label>
        <Select value={zeitraumTyp} onValueChange={(value) => handleZeitraumTypChange(value as ZeitraumTyp)}>
          <SelectTrigger id="zeitraum-typ" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tag">Tag</SelectItem>
            <SelectItem value="woche">Woche</SelectItem>
            <SelectItem value="monat">Monat</SelectItem>
            <SelectItem value="quartal">Quartal</SelectItem>
            <SelectItem value="jahr">Jahr</SelectItem>
            <SelectItem value="custom">Benutzerdefiniert</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {zeitraumTyp === 'custom' && (
        <>
          <div className="space-y-2">
            <Label>Von</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !customVon && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customVon ? format(customVon, 'PPP', { locale: de }) : 'Datum wählen'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customVon}
                  onSelect={(date) => date && setCustomVon(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>Bis</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !customBis && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customBis ? format(customBis, 'PPP', { locale: de }) : 'Datum wählen'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customBis}
                  onSelect={(date) => date && setCustomBis(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button onClick={handleCustomDateChange} disabled={!customVon || !customBis}>
            Anwenden
          </Button>
        </>
      )}
      
      {zeitraumTyp !== 'custom' && (
        <div className="text-sm text-gray-600">
          {format(von, 'dd.MM.yyyy', { locale: de })} - {format(bis, 'dd.MM.yyyy', { locale: de })}
        </div>
      )}
      
      {zusaetzlicheFilter && (
        <div className="ml-auto">
          {zusaetzlicheFilter}
        </div>
      )}
    </div>
  )
}
