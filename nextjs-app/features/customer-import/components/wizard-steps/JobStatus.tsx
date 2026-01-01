'use client'

// Step 2: Job-Status und Progress UI
import React from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, XCircle, Search, Database, Globe, Mail } from 'lucide-react'
import type { CustomerImportJob } from '../../types'

interface JobStatusProps {
  job: CustomerImportJob
  onCancel: () => void
}

export function JobStatus({ job, onCancel }: JobStatusProps) {
  const progressPercentage = job.progress.total > 0 
    ? (job.progress.current / job.progress.total) * 100 
    : 0

  // Phase-Texte und Icons
  const phaseInfo = {
    searching: {
      icon: Search,
      text: 'Suche Unternehmen...',
      description: 'Durchsuche Google Maps nach passenden Unternehmen'
    },
    loading_details: {
      icon: Database,
      text: 'Details laden...',
      description: 'Lade detaillierte Informationen für jedes Unternehmen'
    },
    analyzing_websites: {
      icon: Globe,
      text: 'Webseitenanalyse...',
      description: 'Analysiere Websites und extrahiere Informationen'
    },
    extracting_contacts: {
      icon: Mail,
      text: 'Kontakte extrahieren...',
      description: 'Sammle E-Mail-Adressen und Telefonnummern'
    }
  }

  const currentPhase = phaseInfo[job.progress.phase]
  const PhaseIcon = currentPhase.icon

  return (
    <div className="space-y-6 py-4">
      {/* Header mit Animation */}
      <div className="text-center space-y-3">
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-2">
          <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
          {/* Pulse Ring */}
          <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          🤖 KI-Analyse läuft
        </h3>
        <p className="text-sm text-gray-600">
          Bitte warten Sie, während wir passende Unternehmen für Sie finden...
        </p>
      </div>

      {/* Live Counter mit Pulse */}
      <div className="flex justify-center">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl px-8 py-6 shadow-lg">
          <div className="text-center">
            <div className="text-5xl font-bold text-purple-600 mb-2 tabular-nums animate-pulse">
              {job.progress.current}
            </div>
            <div className="text-sm text-gray-600">
              von <span className="font-semibold">{job.progress.total}</span> gefunden
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Progress Bar */}
      <div className="space-y-3">
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div 
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${progressPercentage}%`,
              background: 'linear-gradient(90deg, #9333ea 0%, #7c3aed 50%, #3b82f6 100%)'
            }}
          >
            {/* Animated shine effect */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, white, transparent)',
                animation: 'shimmer 2s infinite'
              }}
            />
          </div>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-600">{Math.round(progressPercentage)}% abgeschlossen</span>
          <span className="text-purple-600 tabular-nums">
            ~{Math.max(1, Math.ceil((job.progress.total - job.progress.current) / 5))}s verbleibend
          </span>
        </div>
      </div>

      {/* Aktuelle Phase - prominent */}
      <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 border-2 border-purple-300 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-center gap-4">
          <div className="rounded-full bg-white p-3 shadow-md">
            <PhaseIcon className="h-7 w-7 text-purple-600 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg text-gray-900">
              {currentPhase.text}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {currentPhase.description}
            </p>
          </div>
        </div>
      </div>

      {/* Phase Timeline - kompakt horizontal */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-around gap-2">
          {Object.entries(phaseInfo).map(([phase, info]) => {
            const Icon = info.icon
            const phaseIndex = Object.keys(phaseInfo).indexOf(phase)
            const currentPhaseIndex = Object.keys(phaseInfo).indexOf(job.progress.phase)
            const isCompleted = phaseIndex < currentPhaseIndex
            const isCurrent = phase === job.progress.phase

            return (
              <div key={phase} className="flex flex-col items-center gap-2 flex-1">
                <div 
                  className={`
                    rounded-full p-2 transition-all duration-300
                    ${isCompleted 
                      ? 'bg-green-100 scale-100' 
                      : isCurrent 
                        ? 'bg-purple-100 scale-110 ring-4 ring-purple-200' 
                        : 'bg-gray-100 scale-90'
                    }
                  `}
                >
                  {isCompleted ? (
                    <span className="text-green-600 text-xl font-bold">✓</span>
                  ) : (
                    <Icon 
                      className={`
                        h-5 w-5 transition-colors
                        ${isCurrent ? 'text-purple-600' : 'text-gray-400'}
                      `} 
                    />
                  )}
                </div>
                <span 
                  className={`
                    text-xs text-center transition-all
                    ${isCompleted 
                      ? 'text-green-700 font-medium' 
                      : isCurrent 
                        ? 'text-purple-900 font-bold' 
                        : 'text-gray-400'
                    }
                  `}
                >
                  {info.text.replace('...', '')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gefundene Ergebnisse - falls bereits welche da */}
      {job.results.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✓</span>
              <div>
                <p className="font-bold text-lg text-green-900">
                  {job.results.length} Unternehmen gefunden
                </p>
                <p className="text-sm text-green-700">
                  Die Analyse läuft weiter...
                </p>
              </div>
            </div>
            <div className="text-4xl font-bold text-green-600 tabular-nums animate-pulse">
              {job.results.length}
            </div>
          </div>
        </div>
      )}

      {/* Abbrechen Button */}
      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Analyse abbrechen
        </Button>
      </div>
    </div>
  )
}

// Label-Komponente (falls nicht vorhanden)
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}

