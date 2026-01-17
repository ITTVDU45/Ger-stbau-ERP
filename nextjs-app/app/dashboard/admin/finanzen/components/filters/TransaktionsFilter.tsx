'use client'

/**
 * TransaktionsFilter - Filter-Komponente für Transaktionsübersicht
 * 
 * Filter nach:
 * - Kategorie
 * - Typ (Einnahme/Ausgabe)
 * - Zahlungsart
 * - Manuell oder KI
 * - Zeitraum von bis
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
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
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronDown, Filter, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface TransaktionsFilters {
  kategorie: string | null
  typ: 'alle' | 'einnahme' | 'ausgabe' | null
  zahlungsart: string | null
  quelle: 'alle' | 'manuell' | 'ki' | null
  zeitraum: {
    von: Date | null
    bis: Date | null
  }
}

interface TransaktionsFilterProps {
  filters: TransaktionsFilters
  onFiltersChange: (filters: TransaktionsFilters) => void
  activeTab?: 'alle' | 'einnahmen' | 'ausgaben'
}

type PresetOption = {
  label: string
  icon?: string
  getValue: () => { start: Date; end: Date }
}

export default function TransaktionsFilter({
  filters,
  onFiltersChange,
  activeTab = 'alle'
}: TransaktionsFilterProps) {
  const [kategorien, setKategorien] = useState<Array<{ _id: string; name: string; typ: string }>>([])
  const [dateRangeOpen, setDateRangeOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  
  // Lade Kategorien
  useEffect(() => {
    const loadKategorien = async () => {
      try {
        const [einnahmeRes, ausgabeRes] = await Promise.all([
          fetch('/api/finanzen/kategorien?typ=einnahme&aktiv=true'),
          fetch('/api/finanzen/kategorien?typ=ausgabe&aktiv=true')
        ])
        
        const [einnahmeData, ausgabeData] = await Promise.all([
          einnahmeRes.json(),
          ausgabeRes.json()
        ])
        
        const alle = [
          ...(einnahmeData.erfolg ? einnahmeData.kategorien.map((k: any) => ({ ...k, kategorieTyp: 'einnahme' })) : []),
          ...(ausgabeData.erfolg ? ausgabeData.kategorien.map((k: any) => ({ ...k, kategorieTyp: 'ausgabe' })) : [])
        ]
        
        setKategorien(alle)
      } catch (error) {
        console.error('Fehler beim Laden der Kategorien:', error)
      }
    }
    
    loadKategorien()
  }, [])
  
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
  
  const handleFilterChange = (key: keyof TransaktionsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }
  
  const handlePresetClick = (preset: PresetOption) => {
    const range = preset.getValue()
    handleFilterChange('zeitraum', {
      von: range.start,
      bis: range.end
    })
    setDateRangeOpen(false)
  }
  
  const handleCustomDateApply = () => {
    if (customFrom && customTo) {
      const von = startOfDay(new Date(customFrom))
      const bis = endOfDay(new Date(customTo))
      
      if (von <= bis) {
        handleFilterChange('zeitraum', { von, bis })
        setDateRangeOpen(false)
      }
    }
  }
  
  const isPresetActive = (preset: PresetOption): boolean => {
    if (!filters.zeitraum.von || !filters.zeitraum.bis) return false
    
    const range = preset.getValue()
    const rangeStartDay = format(range.start, 'yyyy-MM-dd')
    const rangeEndDay = format(range.end, 'yyyy-MM-dd')
    const currentStartDay = format(filters.zeitraum.von, 'yyyy-MM-dd')
    const currentEndDay = format(filters.zeitraum.bis, 'yyyy-MM-dd')
    
    return rangeStartDay === currentStartDay && rangeEndDay === currentEndDay
  }
  
  const getDisplayDate = () => {
    if (!filters.zeitraum.von || !filters.zeitraum.bis) {
      return 'Zeitraum'
    }
    
    // Prüfe ob Preset aktiv
    for (const preset of presets) {
      if (isPresetActive(preset)) {
        return preset.label
      }
    }
    
    // Benutzerdefiniert
    return `${format(filters.zeitraum.von, 'dd.MM.', { locale: de })} - ${format(filters.zeitraum.bis, 'dd.MM.yy', { locale: de })}`
  }
  
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.kategorie) count++
    if (filters.typ && filters.typ !== 'alle') count++
    if (filters.zahlungsart) count++
    if (filters.quelle && filters.quelle !== 'alle') count++
    if (filters.zeitraum.von && filters.zeitraum.bis) count++
    return count
  }
  
  const clearAllFilters = () => {
    onFiltersChange({
      kategorie: null,
      typ: null,
      zahlungsart: null,
      quelle: null,
      zeitraum: { von: null, bis: null }
    })
  }
  
  const activeCount = getActiveFilterCount()
  const isDateRangeActive = filters.zeitraum.von && filters.zeitraum.bis
  
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Filter-Icon */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Filter:</span>
      </div>
      
      {/* Kategorie-Filter */}
      <Select
        value={filters.kategorie || 'alle'}
        onValueChange={(value) => handleFilterChange('kategorie', value === 'alle' ? null : value)}
      >
        <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900">
          <SelectValue placeholder="Kategorie" />
        </SelectTrigger>
        <SelectContent className="bg-white text-gray-900">
          <SelectItem value="alle">Alle Kategorien</SelectItem>
          {kategorien.map((kat) => (
            <SelectItem key={kat._id} value={kat._id}>
              {kat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Typ-Filter */}
      <Select
        value={filters.typ || 'alle'}
        onValueChange={(value) => handleFilterChange('typ', value === 'alle' ? null : value as any)}
      >
        <SelectTrigger className="w-[150px] bg-white border-gray-300 text-gray-900">
          <SelectValue placeholder="Typ" />
        </SelectTrigger>
        <SelectContent className="bg-white text-gray-900">
          <SelectItem value="alle">Alle Typen</SelectItem>
          <SelectItem value="einnahme">Einnahme</SelectItem>
          <SelectItem value="ausgabe">Ausgabe</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Zahlungsart-Filter */}
      <Select
        value={filters.zahlungsart || 'alle'}
        onValueChange={(value) => handleFilterChange('zahlungsart', value === 'alle' ? null : value)}
      >
        <SelectTrigger className="w-[160px] bg-white border-gray-300 text-gray-900">
          <SelectValue placeholder="Zahlungsart" />
        </SelectTrigger>
        <SelectContent className="bg-white text-gray-900">
          <SelectItem value="alle">Alle Zahlungsarten</SelectItem>
          <SelectItem value="ueberweisung">Überweisung</SelectItem>
          <SelectItem value="bar">Bar</SelectItem>
          <SelectItem value="karte">Karte</SelectItem>
          <SelectItem value="lastschrift">Lastschrift</SelectItem>
          <SelectItem value="paypal">PayPal</SelectItem>
          <SelectItem value="sonstige">Sonstige</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Manuell oder KI-Filter */}
      <Select
        value={filters.quelle || 'alle'}
        onValueChange={(value) => handleFilterChange('quelle', value === 'alle' ? null : value as any)}
      >
        <SelectTrigger className="w-[160px] bg-white border-gray-300 text-gray-900">
          <SelectValue placeholder="Quelle" />
        </SelectTrigger>
        <SelectContent className="bg-white text-gray-900">
          <SelectItem value="alle">Alle Quellen</SelectItem>
          <SelectItem value="manuell">📝 Manuell</SelectItem>
          <SelectItem value="ki">✨ KI</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Zeitraum-Filter */}
      <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={isDateRangeActive ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700'}
          >
            <Calendar className="h-4 w-4 mr-2" />
            {getDisplayDate()}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0 bg-white border border-gray-200 shadow-xl" align="start">
          <div className="p-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Zeitraum auswählen</p>
            {filters.zeitraum.von && filters.zeitraum.bis && (
              <p className="text-xs text-gray-500 mt-1">
                Aktuell: {format(filters.zeitraum.von, 'dd.MM.yyyy', { locale: de })} - {format(filters.zeitraum.bis, 'dd.MM.yyyy', { locale: de })}
              </p>
            )}
          </div>
          
          <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
            {/* Presets */}
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
            
            {/* Benutzerdefiniert */}
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
                onClick={handleCustomDateApply}
                disabled={!customFrom || !customTo}
              >
                Zeitraum anwenden
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Clear-Filter Button */}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Filter zurücksetzen
          <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
            {activeCount}
          </Badge>
        </Button>
      )}
    </div>
  )
}
