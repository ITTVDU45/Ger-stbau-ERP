// Mock Service für KI-Kunden-Import (Phase 1)
// Simuliert Google Maps API Aufrufe und Job-Processing

import type { 
  AiImportParams, 
  AiImportResult, 
  CustomerImportJob,
  JobStatus,
  JobPhase,
  ImportResult
} from '../types'

// Mock-Daten: Beispiel-Firmen
const MOCK_COMPANIES: Omit<AiImportResult, 'id'>[] = [
  {
    firmenname: 'Bauunternehmen Schmidt GmbH',
    standort: 'Berlin',
    adresse: {
      strasse: 'Musterstraße',
      hausnummer: '12',
      plz: '10115',
      ort: 'Berlin',
      land: 'Deutschland'
    },
    branche: 'Bauunternehmen',
    telefon: '+49 30 12345678',
    website: 'https://schmidt-bau.de',
    email: 'info@schmidt-bau.de',
    analyseScore: 95,
    istDuplikat: false,
    externalId: 'place_001'
  },
  {
    firmenname: 'Gerüstbau Müller & Co',
    standort: 'Berlin',
    adresse: {
      strasse: 'Baustraße',
      hausnummer: '45',
      plz: '10178',
      ort: 'Berlin',
      land: 'Deutschland'
    },
    branche: 'Gerüstbau',
    telefon: '+49 30 98765432',
    website: 'https://mueller-geruestbau.de',
    email: 'kontakt@mueller-geruestbau.de',
    analyseScore: 90,
    istDuplikat: false,
    externalId: 'place_002'
  },
  {
    firmenname: 'A+ Gerüstbau Service',
    standort: 'Berlin',
    adresse: {
      strasse: 'Industrieweg',
      hausnummer: '8',
      plz: '10245',
      ort: 'Berlin',
      land: 'Deutschland'
    },
    branche: 'Gerüstbau',
    telefon: '+49 30 55512345',
    website: 'https://aplus-geruestbau.de',
    analyseScore: 85,
    istDuplikat: false,
    externalId: 'place_003'
  },
  {
    firmenname: 'Hochbau Wagner GmbH',
    standort: 'Berlin',
    adresse: {
      strasse: 'Alexanderplatz',
      hausnummer: '3',
      plz: '10178',
      ort: 'Berlin',
      land: 'Deutschland'
    },
    branche: 'Hochbau',
    telefon: '+49 30 77788899',
    website: 'https://wagner-hochbau.de',
    analyseScore: 70,
    istDuplikat: false,
    externalId: 'place_004'
  },
  {
    firmenname: 'Bau & Montage Fischer',
    standort: 'Berlin',
    adresse: {
      plz: '10557',
      ort: 'Berlin',
      land: 'Deutschland'
    },
    branche: 'Bauunternehmen',
    telefon: '+49 30 22233344',
    analyseScore: 55,
    istDuplikat: false,
    externalId: 'place_005'
  }
]

// In-Memory Job-Speicher (simuliert Datenbank)
const jobStore = new Map<string, CustomerImportJob>()

// Hilfsfunktion: Wartezeit simulieren
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock-Funktion: Job starten
export async function startImportJob(params: AiImportParams): Promise<string> {
  await delay(300) // Simuliere API-Call
  
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const job: CustomerImportJob = {
    jobId,
    status: 'running',
    params,
    progress: {
      current: 0,
      total: params.anzahlErgebnisse,
      phase: 'searching'
    },
    results: [],
    createdAt: new Date()
  }
  
  jobStore.set(jobId, job)
  
  // Starte Hintergrund-Simulation (nicht blockierend)
  simulateJobProgress(jobId, params)
  
  return jobId
}

// Simuliert Job-Fortschritt im Hintergrund
async function simulateJobProgress(jobId: string, params: AiImportParams) {
  const job = jobStore.get(jobId)
  if (!job) return
  
  const phases: JobPhase[] = ['searching', 'loading_details']
  if (params.websiteAnalysieren) phases.push('analyzing_websites')
  if (params.kontaktdatenHinzufuegen) phases.push('extracting_contacts')
  
  const totalSteps = phases.length
  const resultsPerPhase = Math.ceil(params.anzahlErgebnisse / totalSteps)
  
  // Wähle zufällige Firmen aus Mock-Daten
  const selectedCompanies = MOCK_COMPANIES
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(params.anzahlErgebnisse, MOCK_COMPANIES.length))
  
  let currentResult = 0
  
  for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
    const phase = phases[phaseIndex]
    job.progress.phase = phase
    
    // Simuliere Fortschritt in dieser Phase
    for (let i = 0; i < resultsPerPhase && currentResult < selectedCompanies.length; i++) {
      await delay(400 + Math.random() * 600) // 400-1000ms pro Eintrag
      
      const company = selectedCompanies[currentResult]
      const result: AiImportResult = {
        ...company,
        id: `result_${currentResult}_${Date.now()}`
      }
      
      // Anpasse Daten basierend auf Optionen
      if (!params.websiteAnalysieren) {
        delete result.website
      }
      if (!params.kontaktdatenHinzufuegen) {
        delete result.email
      }
      
      // Berechne Score basierend auf Vollständigkeit
      let score = 50
      if (result.telefon) score += 15
      if (result.website) score += 15
      if (result.email) score += 20
      result.analyseScore = score
      
      job.results.push(result)
      job.progress.current = currentResult + 1
      currentResult++
    }
  }
  
  // Job abschließen
  job.status = 'completed'
  job.progress.current = job.results.length
  job.progress.total = job.results.length
}

// Mock-Funktion: Job-Status abrufen
export async function pollJobStatus(jobId: string): Promise<CustomerImportJob | null> {
  await delay(100) // Simuliere API-Call
  
  const job = jobStore.get(jobId)
  if (!job) return null
  
  // Kopie zurückgeben (nicht Original)
  return JSON.parse(JSON.stringify(job))
}

// Mock-Funktion: Kunden importieren
export async function importSelectedCustomers(
  jobId: string, 
  selectedIds: string[]
): Promise<ImportResult> {
  await delay(500) // Simuliere API-Call
  
  const job = jobStore.get(jobId)
  if (!job) {
    return {
      erfolg: false,
      importedCount: 0,
      errors: ['Job nicht gefunden']
    }
  }
  
  const selectedResults = job.results.filter(r => selectedIds.includes(r.id))
  
  if (selectedResults.length === 0) {
    return {
      erfolg: false,
      importedCount: 0,
      errors: ['Keine Ergebnisse ausgewählt']
    }
  }
  
  // Simuliere Import für jedes Ergebnis
  const errors: string[] = []
  let importedCount = 0
  
  for (const result of selectedResults) {
    try {
      // Simuliere POST /api/kunden
      const kundeData = {
        firma: result.firmenname,
        kundentyp: 'gewerblich',
        aktiv: false,
        telefon: result.telefon,
        email: result.email,
        adresse: result.adresse,
        notizen: `KI-Import aus Job ${jobId}\nBranche: ${result.branche || 'N/A'}\nWebsite: ${result.website || 'N/A'}`,
        source: 'ai_import',
        sourceMeta: {
          jobId,
          externalId: result.externalId
        }
      }
      
      // Echter API-Call würde hier stattfinden
      const response = await fetch('/api/kunden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kundeData)
      })
      
      if (response.ok) {
        importedCount++
      } else {
        const error = await response.json()
        errors.push(`${result.firmenname}: ${error.fehler || 'Unbekannter Fehler'}`)
      }
      
      await delay(200) // Verzögerung zwischen Imports
    } catch (error) {
      errors.push(`${result.firmenname}: ${error instanceof Error ? error.message : 'Fehler'}`)
    }
  }
  
  return {
    erfolg: importedCount > 0,
    importedCount,
    errors: errors.length > 0 ? errors : undefined
  }
}

// Hilfsfunktion: Job abbrechen
export async function cancelJob(jobId: string): Promise<boolean> {
  await delay(100)
  
  const job = jobStore.get(jobId)
  if (!job) return false
  
  if (job.status === 'running') {
    job.status = 'cancelled'
    return true
  }
  
  return false
}

// Hilfsfunktion: Job löschen (Cleanup)
export function deleteJob(jobId: string): void {
  jobStore.delete(jobId)
}

