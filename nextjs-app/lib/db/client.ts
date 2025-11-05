// Server-only imports - nur auf dem Server verfügbar
let MongoClient: any
let Db: any

if (typeof window === 'undefined') {
  const mongodb = require('mongodb')
  MongoClient = mongodb.MongoClient
  Db = mongodb.Db
}

interface MongoConnection {
  client: typeof MongoClient
  db: typeof Db
  lastPing: number
}

// Nutze globalThis für besseres Caching in Next.js Development
const globalForMongo = globalThis as unknown as {
  mongoConnection: MongoConnection | null
  isConnecting: boolean
}

// Ping-Intervall: Nur alle 30 Sekunden prüfen
const PING_INTERVAL = 30000

async function connectToDatabase(): Promise<MongoConnection> {
  // Prüfe ob gecachte Connection existiert
  if (globalForMongo.mongoConnection) {
    const timeSinceLastPing = Date.now() - globalForMongo.mongoConnection.lastPing
    
    // Nur pingen wenn länger als 30s her
    if (timeSinceLastPing < PING_INTERVAL) {
      return globalForMongo.mongoConnection
    }
    
    try {
      // Schneller Ping ohne Timeout
      await globalForMongo.mongoConnection.db.admin().ping()
      globalForMongo.mongoConnection.lastPing = Date.now()
      return globalForMongo.mongoConnection
    } catch (error) {
      // Nur bei Fehler loggen
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ MongoDB reconnecting...')
      }
      globalForMongo.mongoConnection = null
    }
  }

  // Verhindere parallele Verbindungsversuche
  if (globalForMongo.isConnecting) {
    let attempts = 0
    while (globalForMongo.isConnecting && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    if (globalForMongo.mongoConnection) {
      return globalForMongo.mongoConnection
    }
  }

  globalForMongo.isConnecting = true

  let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI
  
  // Debug: Log welche URI verwendet wird
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 Verbinde mit MongoDB:', mongoUri.replace(/:[^:@]+@/, ':***@'))
  }
  
  // Füge wichtige Connection-Optionen zur URI hinzu, falls nicht vorhanden
  if (mongoUri.includes('mongodb+srv://') && !mongoUri.includes('retryWrites')) {
    const separator = mongoUri.includes('?') ? '&' : '?'
    mongoUri += `${separator}retryWrites=true&w=majority&maxPoolSize=50`
  }
  
  if (!mongoUri) {
    globalForMongo.isConnecting = false
    throw new Error('Please define the MONGO_URI or MONGODB_URI environment variable')
  }

  try {
    // TLS nur für Cloud-Verbindungen aktivieren (mongodb+srv oder nicht localhost)
    const isLocalConnection = mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')
    const useTLS = mongoUri.startsWith('mongodb+srv://') || (!isLocalConnection && !mongoUri.includes('mongodb://localhost'))
    
    const client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      // Erhöhte Timeouts für MongoDB Atlas (oft langsamer im Next.js Kontext)
      serverSelectionTimeoutMS: 60000, // 60 Sekunden für DNS-Lookup
      socketTimeoutMS: 45000, // 45 Sekunden für Socket-Operationen
      connectTimeoutMS: 60000, // 60 Sekunden für initiale Verbindung
      maxIdleTimeMS: 120000,
      waitQueueTimeoutMS: 60000,
      ...(useTLS && {
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
      }),
      retryWrites: true,
      retryReads: true,
      compressors: ['zlib'],
      directConnection: false,
    })

    await client.connect()

    const dbName = process.env.MONGODB_DB || mongoUri.split('/').pop()?.split('?')[0] || 'geruestbau_erp'
    const db = client.db(dbName)
    
    // Debug: Log welche Datenbank verwendet wird
    if (process.env.NODE_ENV === 'development') {
      console.log('📂 Verwende Datenbank:', dbName)
    }

    globalForMongo.mongoConnection = { 
      client, 
      db,
      lastPing: Date.now()
    }

    // Nur beim ersten Connect loggen
    console.log('✓ MongoDB verbunden:', dbName)
    globalForMongo.isConnecting = false
    return globalForMongo.mongoConnection
  } catch (error) {
    console.error('❌ MongoDB Verbindungsfehler:', error)
    globalForMongo.mongoConnection = null
    globalForMongo.isConnecting = false
    throw error
  }
}

export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase()
  return db
}

export async function closeDatabase(): Promise<void> {
  if (globalForMongo.mongoConnection) {
    await globalForMongo.mongoConnection.client.close()
    globalForMongo.mongoConnection = null
  }
}
