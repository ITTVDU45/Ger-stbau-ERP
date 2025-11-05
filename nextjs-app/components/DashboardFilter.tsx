"use client"

import React from 'react'
import { useDashboard } from '@/lib/contexts/DashboardContext'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardFilter() {
  const { filterState, setFilterState } = useDashboard()

  const handleTimeframeChange = (value: string) => {
    setFilterState({ timeframe: value as '7d' | '30d' | '3m' })
  }

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatus = filterState.status
    let newStatus: string[]

    if (checked) {
      newStatus = [...currentStatus, status]
    } else {
      newStatus = currentStatus.filter(s => s !== status)
    }

    setFilterState({ status: newStatus })
  }

  const handleVehicleTypeChange = (value: string) => {
    setFilterState({ vehicleType: value === 'all' ? '' : value })
  }

  const handleGutachterChange = (value: string) => {
    setFilterState({ gutachter: value === 'all' ? '' : value })
  }

  const resetFilters = () => {
    setFilterState({
      timeframe: '30d',
      status: ['aktiv', 'in Bearbeitung', 'abgeschlossen'],
      vehicleType: '',
      gutachter: ''
    })
  }

  return (
    <div className="mb-6">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎛️</span>
              <span>Filter</span>
              <span className="text-xs text-gray-500 ml-2">(Klicken zum Anzeigen)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Card className="border-0 shadow-md mt-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filteroptionen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Zeitraum */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zeitraum</label>
                  <Select value={filterState.timeframe} onValueChange={handleTimeframeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zeitraum auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                      <SelectItem value="30d">Letzte 30 Tage</SelectItem>
                      <SelectItem value="3m">Letzte 3 Monate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Fahrzeugtyp */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fahrzeugtyp</label>
                  <Select value={filterState.vehicleType || 'all'} onValueChange={handleVehicleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Fahrzeugtyp auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Typen</SelectItem>
                      <SelectItem value="pkw">PKW</SelectItem>
                      <SelectItem value="lkw">LKW</SelectItem>
                      <SelectItem value="motorrad">Motorrad</SelectItem>
                      <SelectItem value="transporter">Transporter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gutachter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gutachter</label>
                  <Select value={filterState.gutachter || 'all'} onValueChange={handleGutachterChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gutachter auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Gutachter</SelectItem>
                      <SelectItem value="max-mustermann">Max Mustermann</SelectItem>
                      <SelectItem value="anna-schmidt">Anna Schmidt</SelectItem>
                      <SelectItem value="peter-mueller">Peter Müller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter zurücksetzen */}
                <div className="space-y-2">
                  <label className="text-sm font-medium opacity-0">Aktion</label>
                  <Button onClick={resetFilters} variant="outline" className="w-full">
                    Filter zurücksetzen
                  </Button>
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Fallstatus</label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: 'aktiv', label: 'Aktiv' },
                    { id: 'in Bearbeitung', label: 'In Bearbeitung' },
                    { id: 'abgeschlossen', label: 'Abgeschlossen' }
                  ].map((status) => (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={status.id}
                        checked={filterState.status.includes(status.id)}
                        onCheckedChange={(checked) =>
                          handleStatusChange(status.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={status.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
