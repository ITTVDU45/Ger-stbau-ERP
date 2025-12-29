import { GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'stream'
import { getDatabase } from '@/lib/db/client'

export interface UploadResult {
  fileId: string
  filename: string
  contentType: string
  size: number
}

/**
 * Upload einer Datei zu MongoDB GridFS
 * Nutzt die bestehende DB-Verbindung
 */
export async function uploadToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string,
  uploadedBy: string = 'system'
): Promise<UploadResult> {
  try {
    const db = await getDatabase()
    const bucket = new GridFSBucket(db, { bucketName: 'finanzen_dokumente' })
    
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: { 
        uploadedAt: new Date(),
        uploadedBy 
      }
    })
    
    const readableStream = Readable.from(buffer)
    readableStream.pipe(uploadStream)
    
    return new Promise((resolve, reject) => {
      uploadStream.on('finish', () => {
        resolve({
          fileId: uploadStream.id.toString(),
          filename,
          contentType,
          size: buffer.length
        })
      })
      uploadStream.on('error', reject)
    })
  } catch (error) {
    console.error('❌ GridFS Upload Fehler:', error)
    throw error
  }
}

/**
 * Download einer Datei aus MongoDB GridFS
 * Nutzt die bestehende DB-Verbindung
 */
export async function downloadFromGridFS(fileId: string): Promise<{
  stream: Readable
  contentType: string
  filename: string
}> {
  try {
    const db = await getDatabase()
    const bucket = new GridFSBucket(db, { bucketName: 'finanzen_dokumente' })
    
    // Datei-Metadaten abrufen
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray()
    if (files.length === 0) {
      throw new Error('Datei nicht gefunden')
    }
    
    const file = files[0]
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId))
    
    return {
      stream: downloadStream,
      contentType: file.contentType || 'application/octet-stream',
      filename: file.filename
    }
  } catch (error) {
    console.error('❌ GridFS Download Fehler:', error)
    throw error
  }
}

/**
 * Löschen einer Datei aus MongoDB GridFS
 * Nutzt die bestehende DB-Verbindung
 */
export async function deleteFromGridFS(fileId: string): Promise<void> {
  try {
    const db = await getDatabase()
    const bucket = new GridFSBucket(db, { bucketName: 'finanzen_dokumente' })
    
    await bucket.delete(new ObjectId(fileId))
  } catch (error) {
    console.error('❌ GridFS Delete Fehler:', error)
    throw error
  }
}

/**
 * Liste aller Dateien für eine Transaktion
 * Nutzt die bestehende DB-Verbindung
 */
export async function listFilesForTransaction(transaktionId: string): Promise<any[]> {
  try {
    const db = await getDatabase()
    const bucket = new GridFSBucket(db, { bucketName: 'finanzen_dokumente' })
    
    const files = await bucket.find({ 'metadata.transaktionId': transaktionId }).toArray()
    return files
  } catch (error) {
    console.error('❌ GridFS List Fehler:', error)
    throw error
  }
}

