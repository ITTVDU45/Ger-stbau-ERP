'use client'

// Modus-Auswahl Komponente: Manuell vs. KI Import
import React from 'react'
import { Button } from '@/components/ui/button'
import { Edit, Sparkles } from 'lucide-react'
import type { CustomerDialogMode } from '../types'

interface CustomerImportModeSelectorProps {
  mode: CustomerDialogMode
  onChange: (mode: CustomerDialogMode) => void
}

export function CustomerImportModeSelector({ 
  mode, 
  onChange 
}: CustomerImportModeSelectorProps) {
  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Manuell Button */}
        <Button
          type="button"
          variant={mode === 'manual' ? 'default' : 'outline'}
          className={`
            h-auto py-6 flex flex-col items-center gap-3 transition-all
            ${mode === 'manual' 
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700' 
              : 'hover:bg-gray-50 text-gray-700 border-gray-300'
            }
          `}
          onClick={() => onChange('manual')}
        >
          <div className={`
            rounded-full p-3 
            ${mode === 'manual' ? 'bg-cyan-500' : 'bg-gray-100'}
          `}>
            <Edit className={`h-6 w-6 ${mode === 'manual' ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold text-base">Manuell eintragen</span>
            <span className={`text-xs mt-1 ${mode === 'manual' ? 'text-cyan-100' : 'text-gray-500'}`}>
              Kundendaten selbst eingeben
            </span>
          </div>
        </Button>

        {/* KI Button */}
        <Button
          type="button"
          variant={mode === 'ai' ? 'default' : 'outline'}
          className={`
            h-auto py-6 flex flex-col items-center gap-3 transition-all
            ${mode === 'ai' 
              ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700' 
              : 'hover:bg-gray-50 text-gray-700 border-gray-300'
            }
          `}
          onClick={() => onChange('ai')}
        >
          <div className={`
            rounded-full p-3 
            ${mode === 'ai' ? 'bg-purple-500' : 'bg-gray-100'}
          `}>
            <Sparkles className={`h-6 w-6 ${mode === 'ai' ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold text-base">KI Kunden hinzufügen</span>
            <span className={`text-xs mt-1 ${mode === 'ai' ? 'text-purple-100' : 'text-gray-500'}`}>
              Automatisch aus Google Maps
            </span>
          </div>
        </Button>
      </div>
    </div>
  )
}

