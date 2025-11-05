"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Search, RefreshCcw } from 'lucide-react'

export type AdminCasesFilterState = {
  search: string
  status: string
  gutachter: string
  partner: string
  category: string
}

type Props = {
  filters: AdminCasesFilterState
  gutachterOptions: string[]
  partnerOptions: string[]
  categoryOptions: string[]
  onFilterChange: (key: keyof AdminCasesFilterState, value: string) => void
  onReset: () => void
}

export default function AdminCasesFilter({
  filters,
  gutachterOptions,
  partnerOptions,
  categoryOptions,
  onFilterChange,
  onReset
}: Props) {
  return (
    <div className="mb-0">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-600" />
              <span>Filter und Suche</span>
              <span className="text-xs text-gray-500 ml-2">(Klicken zum Anzeigen)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Card className="border-0 shadow-md mt-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filteroptionen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Suche */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Suche</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Fall-ID, Mandant, Gutachter..."
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => onFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle</SelectItem>
                        <SelectItem value="aktiv">Aktiv</SelectItem>
                        <SelectItem value="in Bearbeitung">In Bearbeitung</SelectItem>
                        <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gutachter Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gutachter</label>
                    <Select 
                      value={filters.gutachter} 
                      onValueChange={(value) => onFilterChange('gutachter', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Gutachter auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle</SelectItem>
                        {gutachterOptions.map((gutachter) => (
                          <SelectItem key={gutachter} value={gutachter}>
                            {gutachter}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Partner Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Partner</label>
                    <Select 
                      value={filters.partner} 
                      onValueChange={(value) => onFilterChange('partner', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Partner auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle</SelectItem>
                        {partnerOptions.map((partner) => (
                          <SelectItem key={partner} value={partner}>
                            {partner}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Kategorie Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kategorie</label>
                    <Select 
                      value={filters.category} 
                      onValueChange={(value) => onFilterChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle</SelectItem>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={onReset} className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Zurücksetzen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

