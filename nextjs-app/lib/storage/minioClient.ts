/**
 * MinIO Client für Dokument-Storage
 * Server-only - wird nur in API-Routes verwendet
 */

import * as Minio from 'minio'

// Singleton Instance
let minioClient: Minio.Client | null = null

/**
 * Initialisiert und gibt den MinIO Client zurück
 */
export function getMinioClient(): Minio.Client {
  if (minioClient) {
    return minioClient
  }

  // Parse MinIO endpoint (kann URL oder einfacher Hostname sein)
  let MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost'
  let MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10)
  let MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true'

  // Wenn MINIO_ENDPOINT eine URL ist, parse sie
  if (MINIO_ENDPOINT.startsWith('http://') || MINIO_ENDPOINT.startsWith('https://')) {
    try {
      const url = new URL(MINIO_ENDPOINT)
      MINIO_ENDPOINT = url.hostname
      MINIO_PORT = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80)
      MINIO_USE_SSL = url.protocol === 'https:'
    } catch (error) {
      console.error('Failed to parse MINIO_ENDPOINT URL:', error)
    }
  }

  const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER || process.env.MINIO_ACCESS_KEY || 'minioadmin'
  const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD || process.env.MINIO_SECRET_KEY || 'minioadmin'

  minioClient = new Minio.Client({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  })

  return minioClient
}

/**
 * Erstellt Bucket falls er nicht existiert
 */
export async function ensureBucketExists(bucketName: string): Promise<void> {
  const client = getMinioClient()
  const exists = await client.bucketExists(bucketName)
  
  if (!exists) {
    await client.makeBucket(bucketName, 'eu-west-1')
    console.log(`✅ Bucket '${bucketName}' erstellt`)
  }
}

/**
 * Generiert eindeutigen Dateinamen mit Gutachternummer
 */
export function generateUniqueFileName(
  gutachterNummer: string,
  fallId: string,
  originalFileName: string
): string {
  const timestamp = Date.now()
  const extension = originalFileName.split('.').pop()
  const baseName = originalFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')
  
  return `gutachter_${gutachterNummer}/fall_${fallId}/${timestamp}_${baseName}.${extension}`
}

/**
 * Upload Datei zu MinIO
 */
export async function uploadFileToMinio(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  metadata: Record<string, string>
): Promise<{ erfolg: boolean; url?: string; fehler?: string }> {
  try {
    const client = getMinioClient()
    await ensureBucketExists(bucketName)

    await client.putObject(bucketName, objectName, buffer, buffer.length, metadata)

    // Generiere URL (7 Tage gültig)
    const url = await client.presignedGetObject(bucketName, objectName, 24 * 60 * 60 * 7)

    return { erfolg: true, url }
  } catch (error: any) {
    console.error('MinIO Upload Fehler:', error)
    return { erfolg: false, fehler: error.message }
  }
}

/**
 * Hole presigned URL für Download
 */
export async function getPresignedUrl(
  bucketName: string,
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = getMinioClient()
  return await client.presignedGetObject(bucketName, objectName, expirySeconds)
}

/**
 * Lösche Datei aus MinIO
 */
export async function deleteFileFromMinio(
  bucketName: string,
  objectName: string
): Promise<{ erfolg: boolean; fehler?: string }> {
  try {
    const client = getMinioClient()
    await client.removeObject(bucketName, objectName)
    return { erfolg: true }
  } catch (error: any) {
    console.error('MinIO Delete Fehler:', error)
    return { erfolg: false, fehler: error.message }
  }
}

/**
 * Settings-spezifische Upload-Funktionen
 */

const SETTINGS_BUCKET = 'settings-assets'

/**
 * Lädt ein Firmenlogo hoch (primär oder sekundär)
 */
export async function uploadCompanyLogo(
  buffer: Buffer,
  originalFileName: string,
  type: 'primary' | 'secondary' = 'primary'
): Promise<{ erfolg: boolean; url?: string; objectName?: string; fehler?: string }> {
  try {
    const client = getMinioClient()
    await ensureBucketExists(SETTINGS_BUCKET)

    const timestamp = Date.now()
    const extension = originalFileName.split('.').pop()
    const objectName = `logos/${type}_logo_${timestamp}.${extension}`

    const metadata = {
      'Content-Type': getContentType(extension || ''),
      'X-Upload-Type': 'company-logo',
      'X-Logo-Type': type
    }

    await client.putObject(SETTINGS_BUCKET, objectName, buffer, buffer.length, metadata)

    // Generiere presigned URL (7 Tage gültig - MinIO Maximum)
    const url = await client.presignedGetObject(SETTINGS_BUCKET, objectName, 7 * 24 * 60 * 60)

    return { erfolg: true, url, objectName }
  } catch (error: any) {
    console.error('Logo Upload Fehler:', error)
    return { erfolg: false, fehler: error.message }
  }
}

/**
 * Lädt ein Zertifikat hoch
 */
export async function uploadCertificate(
  buffer: Buffer,
  originalFileName: string,
  certificateType: string
): Promise<{ erfolg: boolean; url?: string; objectName?: string; fehler?: string }> {
  try {
    const client = getMinioClient()
    await ensureBucketExists(SETTINGS_BUCKET)

    const timestamp = Date.now()
    const extension = originalFileName.split('.').pop()
    const safeName = originalFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')
    const objectName = `certificates/${certificateType}_${timestamp}_${safeName}.${extension}`

    const metadata = {
      'Content-Type': getContentType(extension || ''),
      'X-Upload-Type': 'certificate',
      'X-Certificate-Type': certificateType
    }

    await client.putObject(SETTINGS_BUCKET, objectName, buffer, buffer.length, metadata)

    // Generiere presigned URL (7 Tage gültig - MinIO Maximum)
    const url = await client.presignedGetObject(SETTINGS_BUCKET, objectName, 7 * 24 * 60 * 60)

    return { erfolg: true, url, objectName }
  } catch (error: any) {
    console.error('Zertifikat Upload Fehler:', error)
    return { erfolg: false, fehler: error.message }
  }
}

/**
 * Löscht eine Settings-Datei (Logo oder Zertifikat)
 */
export async function deleteSettingsFile(
  objectName: string
): Promise<{ erfolg: boolean; fehler?: string }> {
  return deleteFileFromMinio(SETTINGS_BUCKET, objectName)
}

/**
 * Generiert eine neue presigned URL für ein Settings-Asset
 */
export async function refreshSettingsFileUrl(
  objectName: string,
  expiryDays: number = 7
): Promise<string> {
  // MinIO erlaubt max. 7 Tage für presigned URLs
  const maxDays = Math.min(expiryDays, 7)
  return getPresignedUrl(SETTINGS_BUCKET, objectName, maxDays * 24 * 60 * 60)
}

/**
 * Hilfsfunktion: Bestimmt Content-Type basierend auf Dateiendung
 */
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  
  return contentTypes[extension.toLowerCase()] || 'application/octet-stream'
}

// ============================================================================
// ANFRAGEN-DOKUMENTE
// ============================================================================

export const ANFRAGEN_BUCKET = 'anfragen'

/**
 * Anfrage-Dokument hochladen
 * Pfadstruktur: /anfragen/{anfrageId}/docs/{filename}
 */
export async function uploadAnfrageDokument(
  anfrageId: string,
  file: File
): Promise<{ url: string; objectName: string }> {
  const client = getMinioClient()
  
  // Sicherstellen, dass Bucket existiert
  await ensureBucketExists(ANFRAGEN_BUCKET)
  
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const objectName = `anfragen/${anfrageId}/docs/${timestamp}_${sanitizedFileName}`
  
  // Datei in Buffer konvertieren
  const buffer = Buffer.from(await file.arrayBuffer())
  
  // Upload
  await client.putObject(ANFRAGEN_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': file.type || 'application/octet-stream'
  })
  
  // Generiere presigned URL (7 Tage gültig - MinIO Maximum)
  const url = await client.presignedGetObject(ANFRAGEN_BUCKET, objectName, 7 * 24 * 60 * 60)
  
  return { url, objectName }
}

/**
 * Anfrage-Dokument löschen
 */
export async function deleteAnfrageDokument(objectName: string): Promise<void> {
  const client = getMinioClient()
  await client.removeObject(ANFRAGEN_BUCKET, objectName)
}

// ============================================================================
// PROJEKT-DOKUMENTE
// ============================================================================

export const PROJEKTE_BUCKET = 'projekte'

/**
 * Projekt-Dokument hochladen
 * Pfadstruktur: /projekte/{projektId}/docs/{kategorie}/{filename}
 */
export async function uploadProjektDokument(
  projektId: string,
  file: File,
  kategorie?: string
): Promise<{ url: string; objectName: string }> {
  const client = getMinioClient()
  
  // Sicherstellen, dass Bucket existiert
  await ensureBucketExists(PROJEKTE_BUCKET)
  
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const kategoriePrefix = kategorie || 'sonstiges'
  const objectName = `projekte/${projektId}/docs/${kategoriePrefix}/${timestamp}_${sanitizedFileName}`
  
  // Datei in Buffer konvertieren
  const buffer = Buffer.from(await file.arrayBuffer())
  
  // Upload
  await client.putObject(PROJEKTE_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': file.type || 'application/octet-stream'
  })
  
  // Generiere presigned URL (7 Tage gültig - MinIO Maximum)
  const url = await client.presignedGetObject(PROJEKTE_BUCKET, objectName, 7 * 24 * 60 * 60)
  
  return { url, objectName }
}

/**
 * Projekt-Dokument löschen
 */
export async function deleteProjektDokument(objectName: string): Promise<void> {
  const client = getMinioClient()
  await client.removeObject(PROJEKTE_BUCKET, objectName)
}

// ============================================================================
// MITARBEITER-DOKUMENTE
// ============================================================================

export const MITARBEITER_BUCKET = 'mitarbeiter'

/**
 * Mitarbeiter-Dokument hochladen
 * Pfadstruktur: /mitarbeiter/{mitarbeiterId}/docs/{kategorie}/{filename}
 */
export async function uploadMitarbeiterDokument(
  mitarbeiterId: string,
  file: File,
  kategorie?: string
): Promise<{ url: string; objectName: string }> {
  const client = getMinioClient()
  
  // Sicherstellen, dass Bucket existiert
  await ensureBucketExists(MITARBEITER_BUCKET)
  
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const kategoriePrefix = kategorie || 'sonstiges'
  const objectName = `mitarbeiter/${mitarbeiterId}/docs/${kategoriePrefix}/${timestamp}_${sanitizedFileName}`
  
  // Datei in Buffer konvertieren
  const buffer = Buffer.from(await file.arrayBuffer())
  
  // Upload
  await client.putObject(MITARBEITER_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': file.type || 'application/octet-stream'
  })
  
  // Generiere presigned URL (7 Tage gültig - MinIO Maximum)
  const url = await client.presignedGetObject(MITARBEITER_BUCKET, objectName, 7 * 24 * 60 * 60)
  
  return { url, objectName }
}

/**
 * Mitarbeiter-Dokument löschen
 */
export async function deleteMitarbeiterDokument(objectName: string): Promise<void> {
  const client = getMinioClient()
  await client.removeObject(MITARBEITER_BUCKET, objectName)
}

