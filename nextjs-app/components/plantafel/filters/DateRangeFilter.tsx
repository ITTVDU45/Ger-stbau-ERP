'use client'

/**
 * DateRangeFilter - Erweiterte Zeitraumauswahl für Plantafel
 * 
 * Bietet vordefinierte Zeiträume:
 * - Heute, Gestern
 * - Dieser/Letzter Monat
 * - Dieses/Letztes Jahr
 * - Aktuelles/Letztes Quartal
 * - Benutzerdefiniert
 */

import { useState } from 'react'
import { 
  startOfDay, 
  endOfDay, 
  subDays,
  addDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  format
} from 'date-fns'
import { de } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar, ChevronDown } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export interface DateRange {
  start: Date
  end: Date
}

interface DateRangeFilterProps {
  currentRange: DateRange
  onRangeChange: (range: DateRange) => void
  isActive: boolean
}

type PresetOption = {
  label: string
  icon?: string
  getValue: () => DateRange
}

export default function DateRangeFilter({ 
  currentRange, 
  onRangeChange, 
  isActive 
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  
  // Vordefinierte Zeiträume
  const presets: PresetOption[] = [
    {
      label: 'Heute',
      icon: '📅',
      getValue: () => ({
        start: startOfDay(new Date()),
        end: endOfDay(new Date())
      })
    },
    {
      label: 'Gestern',
      icon: '📆',
      getValue: () => {
        const yesterday = subDays(new Date(), 1)
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        }
      }
    },
    {
      label: 'Die nächsten 2 Wochen',
      icon: '📅',
      getValue: () => {
        const today = new Date()
        const twoWeeksLater = addDays(today, 14)
        return {
          start: startOfDay(today),
          end: endOfDay(twoWeeksLater)
        }
      }
    },
    {
      label: 'Dieser Monat',
      icon: '📊',
      getValue: () => {
        const now = new Date()
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
      }
    },
    {
      label: 'Letzter Monat',
      icon: '📉',
      getValue: () => {
        const lastMonth = subMonths(new Date(), 1)
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        }
      }
    },
    {
      label: 'Dieses Quartal',
      icon: '📈',
      getValue: () => {
        const now = new Date()
        return {
          start: startOfQuarter(now),
          end: endOfQuarter(now)
        }
      }
    },
    {
      label: 'Letztes Quartal',
      icon: '📋',
      getValue: () => {
        const lastQuarter = subQuarters(new Date(), 1)
        return {
          start: startOfQuarter(lastQuarter),
          end: endOfQuarter(lastQuarter)
        }
      }
    },
    {
      label: 'Dieses Jahr',
      icon: '🗓️',
      getValue: () => {
        const now = new Date()
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        }
      }
    },
    {
      label: 'Letztes Jahr',
      icon: '📅',
      getValue: () => {
        const lastYear = subYears(new Date(), 1)
        return {
          start: startOfYear(lastYear),
          end: endOfYear(lastYear)
        }
      }
    }
  ]
  
  const handlePresetClick = (preset: PresetOption) => {
    const range = preset.getValue()
    onRangeChange(range)
    setOpen(false)
  }
  
  // Prüfe ob ein Preset aktiv ist
  const isPresetActive = (preset: PresetOption): boolean => {
    const range = preset.getValue()
    const rangeStartDay = format(range.start, 'yyyy-MM-dd')
    const rangeEndDay = format(range.end, 'yyyy-MM-dd')
    const currentStartDay = format(currentRange.start, 'yyyy-MM-dd')
    const currentEndDay = format(currentRange.end, 'yyyy-MM-dd')
    
    return rangeStartDay === currentStartDay && rangeEndDay === currentEndDay
  }
  
  const handleCustomApply = () => {
    if (customFrom && customTo) {
      const from = startOfDay(new Date(customFrom))
      const to = endOfDay(new Date(customTo))
      
      if (from <= to) {
        onRangeChange({ start: from, end: to })
        setOpen(false)
      }
    }
  }
  
  // Zeige aktuellen Zeitraum als Button-Text
  const getDisplayText = () => {
    // Prüfe ob ein Preset aktiv ist
    for (const preset of presets) {
      const range = preset.getValue()
      // Vergleiche nur das Datum, nicht die Zeit
      const rangeStartDay = format(range.start, 'yyyy-MM-dd')
      const rangeEndDay = format(range.end, 'yyyy-MM-dd')
      const currentStartDay = format(currentRange.start, 'yyyy-MM-dd')
      const currentEndDay = format(currentRange.end, 'yyyy-MM-dd')
      
      if (rangeStartDay === currentStartDay && rangeEndDay === currentEndDay) {
        return preset.label
      }
    }
    
    // Benutzerdefinierter Zeitraum
    if (isActive) {
      return `${format(currentRange.start, 'dd.MM.', { locale: de })} - ${format(currentRange.end, 'dd.MM.yy', { locale: de })}`
    }
    
    return 'Heute'
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={isActive ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-700'}
        >
          <Calendar className="h-4 w-4 mr-2" />
          {getDisplayText()}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 bg-white border border-gray-200 shadow-xl" align="start">
        <div className="p-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Zeitraum auswählen</p>
          <p className="text-xs text-gray-500 mt-1">
            Aktuell: {format(currentRange.start, 'dd.MM.yyyy', { locale: de })} - {format(currentRange.end, 'dd.MM.yyyy', { locale: de })}
          </p>
        </div>
        
        <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
          {/* Schnell-Optionen */}
          {presets.map((preset) => {
            const isActive = isPresetActive(preset)
            return (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className={`w-full justify-start ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handlePresetClick(preset)}
              >
                <span className="mr-2">{preset.icon}</span>
                {preset.label}
                {isActive && <span className="ml-auto text-blue-600">✓</span>}
              </Button>
            )
          })}
          
          <Separator className="my-3" />
          
          {/* Benutzerdefinierter Zeitraum */}
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium text-gray-900">
              Benutzerdefiniert
            </Label>
            
            <div className="grid gap-2">
              <div>
                <Label htmlFor="date-from" className="text-xs text-gray-600">
                  Von
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="date-to" className="text-xs text-gray-600">
                  Bis
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            
            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleCustomApply}
              disabled={!customFrom || !customTo}
            >
              Zeitraum anwenden
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
