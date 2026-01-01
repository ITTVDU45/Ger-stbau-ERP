import type { AiImportParams, CustomerImportJob } from '../types'
import type { Kunde } from '@/lib/db/types'

/**
 * Echter API-Service für Customer-Import
 * Ruft die Backend-API-Routen auf
 */

/**
 * Erstellt einen neuen Import-Job
 */
export async function startImportJob(params: AiImportParams): Promise<string> {
  const response = await fetch('/api/customer-import/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Starten des Jobs')
  }

  const data = await response.json()
  console.log('📥 Job erstellt:', data)
  
  // jobId ist die MongoDB _id
  return data.jobId
}

/**
 * Fragt den Status eines Jobs ab
 */
export async function pollJobStatus(jobId: string): Promise<CustomerImportJob> {
  const response = await fetch(`/api/customer-import/jobs/${jobId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Abrufen des Job-Status')
  }

  const data = await response.json()
  const job = data.job
  
  // Sicherstellen, dass sowohl _id als auch jobId vorhanden sind (Kompatibilität)
  if (job._id && !job.jobId) {
    job.jobId = job._id
  }
  
  console.log('📥 Job-Status empfangen:', { _id: job._id, jobId: job.jobId, status: job.status })
  
  return job
}

/**
 * Importiert ausgewählte Kunden aus einem Job
 */
export async function importSelectedCustomers(
  jobId: string,
  selectedIds: string[]
): Promise<{ erfolg: boolean; importedCount: number; createdCustomers: Kunde[]; errors?: string[] }> {
  console.log(`📤 API-Request: POST /api/customer-import/jobs/${jobId}/import`)
  console.log(`📋 Payload:`, { selectedIds })
  
  const response = await fetch(`/api/customer-import/jobs/${jobId}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedIds })
  })

  console.log(`📥 Response Status: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    const error = await response.json()
    console.error('❌ API-Fehler:', error)
    throw new Error(error.fehler || 'Fehler beim Importieren der Kunden')
  }

  const data = await response.json()
  console.log('✅ API-Response:', data)
  return data
}

/**
 * Bricht einen laufenden Job ab
 */
export async function cancelJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/customer-import/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Abbrechen des Jobs')
  }
}

/**
 * Löscht einen Job
 */
export async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/customer-import/jobs/${jobId}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.fehler || 'Fehler beim Löschen des Jobs')
  }
}
