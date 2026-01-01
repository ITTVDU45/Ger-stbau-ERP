'use client'

// Haupt-Wizard-Komponente für KI-Kunden-Import
import React, { useEffect } from 'react'
import { useCustomerImport } from '../hooks/useCustomerImport'
import { ParameterForm } from './wizard-steps/ParameterForm'
import { JobStatus } from './wizard-steps/JobStatus'
import { ResultsTable } from './wizard-steps/ResultsTable'
import { ImportConfirmation } from './wizard-steps/ImportConfirmation'

interface AiCustomerImportWizardProps {
  onImportComplete: (importedCount: number) => void
  onCancel: () => void
}

export function AiCustomerImportWizard({
  onImportComplete,
  onCancel
}: AiCustomerImportWizardProps) {
  const {
    currentStep,
    params,
    job,
    selectedResults,
    importing,
    importResult,
    startJob,
    importCustomers,
    handleCancelJob,
    goBack,
    goNext,
    toggleResultSelection,
    selectAll,
    deselectAll,
    selectOnlyComplete,
    reset,
    isJobRunning,
    isJobCompleted,
    hasResults,
    selectedCount
  } = useCustomerImport()

  // Automatischer Wechsel zu Step 4 beim Import
  useEffect(() => {
    if (importResult) {
      // Nach Import: Dialog nach 2 Sekunden schließen (bei Erfolg)
      if (importResult.erfolg) {
        const timer = setTimeout(() => {
          onImportComplete(importResult.importedCount)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [importResult, onImportComplete])

  // Step-Indikator mit Timeline-Design
  const renderStepIndicator = () => {
    const steps = [
      { number: 1, label: 'Parameter', icon: '⚙️' },
      { number: 2, label: 'Analyse', icon: '🔍' },
      { number: 3, label: 'Auswahl', icon: '✓' },
      { number: 4, label: 'Import', icon: '📥' }
    ]

    return (
      <div className="relative px-6 py-4 mb-4">
        {/* Hintergrund-Linie */}
        <div className="absolute left-6 right-6 top-8 h-0.5 bg-gray-200" />
        
        {/* Fortschritt-Linie mit Gradient */}
        <div 
          className="absolute left-6 top-8 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
          style={{ width: `calc(${((currentStep - 1) / 3) * 100}% - 24px)` }}
        />

        <div className="relative flex items-start justify-between">
          {steps.map((step) => {
            const isCompleted = currentStep > step.number
            const isCurrent = currentStep === step.number
            const isPending = currentStep < step.number

            return (
              <div key={step.number} className="flex flex-col items-center" style={{ width: '80px' }}>
                <div className="relative">
                  {/* Step Circle */}
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base
                      transition-all duration-300 border-4 border-white shadow-lg
                      ${isCompleted 
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white scale-100' 
                        : isCurrent
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white scale-110 ring-4 ring-purple-100'
                          : 'bg-gray-100 text-gray-400 scale-95'
                      }
                    `}
                  >
                    {isCompleted ? '✓' : step.icon}
                  </div>
                  
                  {/* Pulse Animation für aktuellen Step */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
                  )}
                </div>
                
                {/* Label */}
                <span className={`
                  text-xs mt-2 font-medium text-center transition-colors
                  ${isCurrent ? 'text-purple-700 font-semibold' : isCompleted ? 'text-green-700' : 'text-gray-400'}
                `}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ParameterForm
            onSubmit={startJob}
            onCancel={onCancel}
          />
        )

      case 2:
        if (!job) return null
        return (
          <JobStatus
            job={job}
            onCancel={handleCancelJob}
          />
        )

      case 3:
        if (!job || !hasResults) return null
        return (
          <ResultsTable
            results={job.results}
            selectedIds={selectedResults}
            onToggleSelection={toggleResultSelection}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onSelectOnlyComplete={selectOnlyComplete}
            onBack={goBack}
            onNext={() => {
              importCustomers()
            }}
          />
        )

      case 4:
        return (
          <ImportConfirmation
            importing={importing}
            importResult={importResult}
            selectedCount={selectedCount}
            onClose={(success) => {
              if (success && importResult) {
                onImportComplete(importResult.importedCount)
              } else {
                reset()
              }
            }}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="w-full">
      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      <div className="px-6 pb-6">
        {renderStepContent()}
      </div>
    </div>
  )
}

