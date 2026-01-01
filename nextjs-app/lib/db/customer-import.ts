import { getDatabase } from './index'
import { ObjectId } from 'mongodb'
import type { CustomerImportJob, AiImportParams, AiImportResult } from '@/features/customer-import/types'

/**
 * Erstellt einen neuen Import-Job
 */
export async function createJob(params: AiImportParams): Promise<string> {
  const db = await getDatabase()
  const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

  const newJob: Omit<CustomerImportJob, '_id'> = {
    status: 'queued',
    params,
    progress: {
      current: 0,
      total: params.anzahlErgebnisse,
      phase: 'searching'
    },
    results: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const result = await jobsCollection.insertOne(newJob as any)
  return result.insertedId.toString()
}

/**
 * Holt einen Job anhand der ID
 */
export async function getJob(jobId: string): Promise<CustomerImportJob | null> {
  if (!ObjectId.isValid(jobId)) {
    throw new Error('Ungültige Job-ID')
  }

  const db = await getDatabase()
  const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

  const job = await jobsCollection.findOne({ _id: new ObjectId(jobId) })
  return job
}

/**
 * Aktualisiert den Fortschritt eines Jobs
 */
export async function updateJobProgress(
  jobId: string,
  progress: CustomerImportJob['progress']
): Promise<void> {
  if (!ObjectId.isValid(jobId)) {
    throw new Error('Ungültige Job-ID')
  }

  const db = await getDatabase()
  const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

  await jobsCollection.updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        progress,
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Markiert einen Job als abgeschlossen und setzt die Ergebnisse
 */
export async function completeJob(
  jobId: string,
  results: AiImportResult[]
): Promise<void> {
  if (!ObjectId.isValid(jobId)) {
    throw new Error('Ungültige Job-ID')
  }

  const db = await getDatabase()
  const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

  await jobsCollection.updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status: 'completed',
        results,
        completedAt: new Date(),
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Markiert einen Job als fehlgeschlagen
 */
export async function failJob(jobId: string, error: string): Promise<void> {
  if (!ObjectId.isValid(jobId)) {
    throw new Error('Ungültige Job-ID')
  }

  const db = await getDatabase()
  const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

  await jobsCollection.updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status: 'failed',
        error,
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Bricht einen laufenden Job ab
 */
export async function cancelJob(jobId: string): Promise<void> {
  if (!ObjectId.isValid(jobId)) {
    throw new Error('Ungültige Job-ID')
  }

  const db = await getDatabase()
  const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

  await jobsCollection.updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status: 'cancelled',
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Löscht alte Jobs (Cleanup-Funktion)
 */
export async function deleteOldJobs(days: number = 30): Promise<number> {
  const db = await getDatabase()
  const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const result = await jobsCollection.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['completed', 'failed', 'cancelled'] }
  })

  return result.deletedCount
}

/**
 * Holt alle Jobs für einen Benutzer (später mit userId)
 */
export async function getJobsByUser(limit: number = 50): Promise<CustomerImportJob[]> {
  const db = await getDatabase()
  const jobsCollection = db.collection<CustomerImportJob>('customer_import_jobs')

  const jobs = await jobsCollection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  return jobs
}

/**
 * Erstellt Indexes für die customer_import_jobs Collection
 */
export async function createJobIndexes(): Promise<void> {
  const db = await getDatabase()
  const jobsCollection = db.collection('customer_import_jobs')

  await jobsCollection.createIndex({ status: 1 })
  await jobsCollection.createIndex({ createdAt: -1 })
  await jobsCollection.createIndex({ 'params.branche': 1 })
  await jobsCollection.createIndex({ 'params.standort': 1 })
  
  console.log('✅ Indexes für customer_import_jobs erstellt')
}

