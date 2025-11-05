import { getDatabase } from '../client'
import { AuditLog } from '../types'

// Server-only imports
let ObjectId: any
if (typeof window === 'undefined') {
  ObjectId = require('mongodb').ObjectId
}

/**
 * Erstellt einen neuen Audit-Log-Eintrag
 */
export async function createAuditLog(log: Omit<AuditLog, '_id'>): Promise<{ erfolg: boolean; id?: string }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<AuditLog>('audit_logs')

    const result = await collection.insertOne({
      ...log,
      zeitpunkt: new Date()
    } as AuditLog)

    return {
      erfolg: true,
      id: result.insertedId.toString()
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
    return { erfolg: false }
  }
}

/**
 * Holt Audit-Logs für einen bestimmten Fall
 */
export async function getAuditLogsForCase(fallId: string): Promise<{ erfolg: boolean; logs?: AuditLog[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<AuditLog>('audit_logs')

    const logs = await collection
      .find({ fallId })
      .sort({ zeitpunkt: -1 })
      .toArray()

    return {
      erfolg: true,
      logs: logs.map(log => ({
        ...log,
        _id: log._id?.toString()
      }))
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return { erfolg: false, logs: [] }
  }
}

/**
 * Holt Audit-Logs für einen bestimmten User
 */
export async function getAuditLogsForUser(
  userId: string,
  limit: number = 50
): Promise<{ erfolg: boolean; logs?: AuditLog[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<AuditLog>('audit_logs')

    const logs = await collection
      .find({ durchgefuehrtVon: userId })
      .sort({ zeitpunkt: -1 })
      .limit(limit)
      .toArray()

    return {
      erfolg: true,
      logs: logs.map(log => ({
        ...log,
        _id: log._id?.toString()
      }))
    }
  } catch (error) {
    console.error('Error fetching audit logs for user:', error)
    return { erfolg: false, logs: [] }
  }
}

/**
 * Holt alle Audit-Logs (nur für Admins)
 */
export async function getAllAuditLogs(
  filter?: {
    von?: string // Datum yyyy-mm-dd
    bis?: string // Datum yyyy-mm-dd
    aktion?: string
    rolle?: 'admin' | 'gutachter' | 'partner'
  },
  limit: number = 100
): Promise<{ erfolg: boolean; logs?: AuditLog[]; total?: number }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<AuditLog>('audit_logs')

    const query: any = {}

    // Zeitraum-Filter
    if (filter?.von || filter?.bis) {
      query.zeitpunkt = {}
      if (filter.von) {
        query.zeitpunkt.$gte = new Date(filter.von)
      }
      if (filter.bis) {
        query.zeitpunkt.$lte = new Date(filter.bis)
      }
    }

    // Aktions-Filter
    if (filter?.aktion) {
      query.aktion = filter.aktion
    }

    // Rollen-Filter
    if (filter?.rolle) {
      query.durchgefuehrtVonRolle = filter.rolle
    }

    const [logs, total] = await Promise.all([
      collection
        .find(query)
        .sort({ zeitpunkt: -1 })
        .limit(limit)
        .toArray(),
      collection.countDocuments(query)
    ])

    return {
      erfolg: true,
      logs: logs.map(log => ({
        ...log,
        _id: log._id?.toString()
      })),
      total
    }
  } catch (error) {
    console.error('Error fetching all audit logs:', error)
    return { erfolg: false, logs: [], total: 0 }
  }
}

/**
 * Löscht alte Audit-Logs (für Datenschutz-Compliance)
 */
export async function deleteOldAuditLogs(tageAlt: number = 365): Promise<{ erfolg: boolean; geloescht?: number }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<AuditLog>('audit_logs')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - tageAlt)

    const result = await collection.deleteMany({
      zeitpunkt: { $lt: cutoffDate }
    })

    return {
      erfolg: true,
      geloescht: result.deletedCount
    }
  } catch (error) {
    console.error('Error deleting old audit logs:', error)
    return { erfolg: false, geloescht: 0 }
  }
}

