'use client'

// Custom Hook für KI-Kunden-Import Wizard State Management
import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { 
  AiImportParams, 
  CustomerImportJob, 
  ImportResult 
} from '../types'
// Toggle between real API and mock for testing
// PRODUCTION: Use apiService when Python Worker is ready
import { 
  startImportJob, 
  pollJobStatus, 
  importSelectedCustomers,
  cancelJob
} from '../services/apiService'
// DEMO/TEST: Use mockService for frontend development
// import { 
//   startImportJob, 
//   pollJobStatus, 
//   importSelectedCustomers,
//   cancelJob
// } from '../services/mockService'

export function useCustomerImport() {
  // Wizard-Step (1-4)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Eingabe-Parameter
  const [params, setParams] = useState<AiImportParams | null>(null)
  
  // Aktueller Job
  const [job, setJob] = useState<CustomerImportJob | null>(null)
  
  // Ausgewählte Ergebnisse (IDs)
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  
  // Import-Status
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  
  // Polling-Intervall Ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Job starten
  const startJob = useCallback(async (newParams: AiImportParams) => {
    try {
      setParams(newParams)
      const jobId = await startImportJob(newParams)
      
      // Initial Status abrufen
      const initialJob = await pollJobStatus(jobId)
      if (initialJob) {
        setJob(initialJob)
        setCurrentStep(2) // Wechsel zu Progress-Step
        
        // Starte Polling
        startPolling(jobId)
      }
    } catch (error) {
      console.error('Fehler beim Starten des Jobs:', error)
      // Fehler-Handling könnte hier erweitert werden
    }
  }, [])
  
  // Polling starten
  const startPolling = useCallback((jobId: string) => {
    // Cleane vorheriges Polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      const updatedJob = await pollJobStatus(jobId)
      if (updatedJob) {
        setJob(updatedJob)
        
        // Stoppe Polling wenn Job fertig oder fehlgeschlagen
        if (updatedJob.status === 'completed' || 
            updatedJob.status === 'failed' || 
            updatedJob.status === 'cancelled') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          
          // Bei Erfolg: Wechsel zu Ergebnissen
          if (updatedJob.status === 'completed' && updatedJob.results.length > 0) {
            setCurrentStep(3)
          }
        }
      }
    }, 500) // Alle 500ms aktualisieren
  }, [])
  
  // Job abbrechen
  const handleCancelJob = useCallback(async () => {
    if (job?.jobId) {
      await cancelJob(job.jobId)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setCurrentStep(1) // Zurück zum Start
    }
  }, [job])
  
  // Kunden importieren
  const importCustomers = useCallback(async () => {
    console.log('🚀 importCustomers aufgerufen')
    
    // Verwende _id (primär) oder jobId (fallback) von MongoDB
    const jobId = job?._id || job?.jobId
    console.log('  Job-ID:', jobId)
    console.log('  Job Object:', job)
    console.log('  Ausgewählte Ergebnisse:', selectedResults.length, selectedResults)
    
    // Validierung mit User-Feedback
    if (!jobId) {
      console.error('❌ Keine Job-ID gefunden!')
      toast.error('Fehler: Keine Job-ID vorhanden. Bitte starten Sie die Analyse erneut.', {
        duration: 5000
      })
      return
    }
    
    if (selectedResults.length === 0) {
      console.warn('⚠️ Keine Kunden ausgewählt')
      toast.error('Bitte wählen Sie mindestens einen Kunden zum Importieren aus.', {
        duration: 4000
      })
      return
    }
    
    setImporting(true)
    setCurrentStep(4) // Wechsel zu Confirmation-Step
    
    try {
      console.log(`📤 Sende Import-Request für Job ${jobId} mit ${selectedResults.length} Kunden`)
      const result = await importSelectedCustomers(jobId, selectedResults)
      console.log('✅ Import-Antwort erhalten:', result)
      setImportResult(result)
    } catch (error) {
      console.error('❌ Fehler beim Importieren:', error)
      toast.error('Fehler beim Importieren der Kunden. Bitte versuchen Sie es erneut.', {
        duration: 5000
      })
      setImportResult({
        erfolg: false,
        importedCount: 0,
        createdCustomers: [],
        errors: [error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten']
      })
    } finally {
      setImporting(false)
    }
  }, [job, selectedResults])
  
  // Navigation
  const goBack = useCallback(() => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }, [])
  
  const goNext = useCallback(() => {
    setCurrentStep(prev => Math.min(4, prev + 1))
  }, [])
  
  // Auswahl-Helper
  const toggleResultSelection = useCallback((id: string) => {
    setSelectedResults(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }, [])
  
  const selectAll = useCallback(() => {
    if (job?.results) {
      setSelectedResults(job.results.map(r => r.id))
    }
  }, [job])
  
  const deselectAll = useCallback(() => {
    setSelectedResults([])
  }, [])
  
  const selectOnlyComplete = useCallback(() => {
    if (job?.results) {
      const completeResults = job.results.filter(r => 
        (r.analyseScore || 0) >= 80
      )
      setSelectedResults(completeResults.map(r => r.id))
    }
  }, [job])
  
  // Reset für neuen Durchlauf
  const reset = useCallback(() => {
    setCurrentStep(1)
    setParams(null)
    setJob(null)
    setSelectedResults([])
    setImporting(false)
    setImportResult(null)
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])
  
  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])
  
  return {
    // State
    currentStep,
    params,
    job,
    selectedResults,
    importing,
    importResult,
    
    // Actions
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
    
    // Helper
    isJobRunning: job?.status === 'running',
    isJobCompleted: job?.status === 'completed',
    hasResults: (job?.results?.length || 0) > 0,
    selectedCount: selectedResults.length
  }
}

