import { Client } from 'minio'

// MinIO Client Konfiguration
// WICHTIG: MINIO_ENDPOINT darf KEIN Protokoll (http:// oder https://) enthalten!
// Nutze stattdessen MINIO_USE_SSL=true für HTTPS
let endpoint = process.env.MINIO_ENDPOINT || 'localhost'

// Entferne Protokoll falls vorhanden (für Fehlertoleranz)
endpoint = endpoint.replace(/^https?:\/\//, '')

// Bestimme useSSL und Port automatisch
const useSSL = process.env.MINIO_USE_SSL === 'true'
let port = parseInt(process.env.MINIO_PORT || '0')

// Wenn kein Port angegeben, nutze Standard-Ports basierend auf SSL
if (port === 0) {
  port = useSSL ? 443 : 9000
}

const minioClient = new Client({
  endPoint: endpoint,
  port: port,
  useSSL: useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
})

const BUCKET_NAME = 'finanzen-belege'

/**
 * Initialisiere MinIO Bucket (falls nicht vorhanden)
 */
async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME)
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'eu-central-1')
      console.log(`✅ MinIO Bucket "${BUCKET_NAME}" erstellt`)
    }
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des MinIO Buckets:', error)
    throw error
  }
}

export interface MinIOUploadResult {
  fileId: string          // Eindeutige ID (UUID)
  filename: string        // Original-Dateiname
  contentType: string     // MIME-Type
  size: number           // Dateigröße in Bytes
  url: string            // MinIO URL zum Abrufen
  uploadedAt: Date
}

/**
 * Lade eine Datei in MinIO hoch
 */
export async function uploadToMinIO(
  buffer: Buffer,
  filename: string,
  contentType: string,
  userId?: string
): Promise<MinIOUploadResult> {
  try {
    await ensureBucketExists()

    // Generiere eindeutige ID
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const extension = filename.split('.').pop()
    const objectName = `${fileId}.${extension}`

    // Metadaten
    const metadata = {
      'Content-Type': contentType,
      'Original-Filename': filename,
      'Uploaded-By': userId || 'system',
      'Uploaded-At': new Date().toISOString()
    }

    // Upload zu MinIO
    await minioClient.putObject(
      BUCKET_NAME,
      objectName,
      buffer,
      buffer.length,
      metadata
    )

    console.log(`✅ Datei in MinIO hochgeladen: ${objectName}`)

    // Generiere URL (intern oder extern je nach Konfiguration)
    const url = `/${BUCKET_NAME}/${objectName}`

    return {
      fileId: objectName,
      filename,
      contentType,
      size: buffer.length,
      url,
      uploadedAt: new Date()
    }
  } catch (error: any) {
    console.error('❌ Fehler beim Upload zu MinIO:', error)
    throw new Error(`MinIO Upload fehlgeschlagen: ${error.message}`)
  }
}

/**
 * Lade eine Datei von MinIO herunter
 */
export async function downloadFromMinIO(fileId: string): Promise<{
  stream: any
  contentType: string
  filename: string
}> {
  try {
    // Hole Metadaten
    const stat = await minioClient.statObject(BUCKET_NAME, fileId)
    
    // Hole Stream
    const stream = await minioClient.getObject(BUCKET_NAME, fileId)

    return {
      stream,
      contentType: stat.metaData['content-type'] || 'application/octet-stream',
      filename: stat.metaData['original-filename'] || fileId
    }
  } catch (error: any) {
    console.error('❌ Fehler beim Download von MinIO:', error)
    throw new Error(`MinIO Download fehlgeschlagen: ${error.message}`)
  }
}

/**
 * Lösche eine Datei aus MinIO
 */
export async function deleteFromMinIO(fileId: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, fileId)
    console.log(`✅ Datei aus MinIO gelöscht: ${fileId}`)
  } catch (error: any) {
    console.error('❌ Fehler beim Löschen aus MinIO:', error)
    throw new Error(`MinIO Löschen fehlgeschlagen: ${error.message}`)
  }
}

/**
 * Generiere eine temporäre URL (Presigned URL) für direkten Zugriff
 */
export async function getPresignedUrl(
  fileId: string,
  expirySeconds: number = 3600
): Promise<string> {
  try {
    const url = await minioClient.presignedGetObject(
      BUCKET_NAME,
      fileId,
      expirySeconds
    )
    return url
  } catch (error: any) {
    console.error('❌ Fehler beim Generieren der Presigned URL:', error)
    throw new Error(`Presigned URL fehlgeschlagen: ${error.message}`)
  }
}

