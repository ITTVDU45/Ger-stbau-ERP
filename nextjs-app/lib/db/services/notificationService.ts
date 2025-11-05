import { getDatabase } from '../client'
import { Benachrichtigung } from '../types'

// Server-only imports
let ObjectId: any
if (typeof window === 'undefined') {
  ObjectId = require('mongodb').ObjectId
}

/**
 * Erstellt eine neue Benachrichtigung
 */
export async function createNotification(
  payload: Omit<Benachrichtigung, '_id' | 'erstelltAm' | 'gelesen'>
): Promise<{ erfolg: boolean; benachrichtigungId?: string }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Benachrichtigung>('benachrichtigungen')

    const now = new Date()
    const newNotification: Omit<Benachrichtigung, '_id'> = {
      ...payload,
      gelesen: false,
      erstelltAm: now,
    }

    const result = await collection.insertOne(newNotification)

    return {
      erfolg: true,
      benachrichtigungId: result.insertedId.toString(),
    }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { erfolg: false }
  }
}

/**
 * Holt alle Benachrichtigungen für einen Empfänger
 */
export async function getNotifications(
  empfaengerId: string,
  onlyUnread: boolean = false
): Promise<Benachrichtigung[]> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Benachrichtigung>('benachrichtigungen')

    const filter: any = { empfaengerId }
    if (onlyUnread) {
      filter.gelesen = false
    }

    const notifications = await collection
      .find(filter)
      .sort({ erstelltAm: -1 })
      .limit(100)
      .toArray()

    return notifications.map((n) => ({
      ...n,
      _id: n._id?.toString(),
    }))
  } catch (error) {
    console.error('Error getting notifications:', error)
    return []
  }
}

/**
 * Zählt ungelesene Benachrichtigungen
 */
export async function getUnreadCount(empfaengerId: string): Promise<number> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Benachrichtigung>('benachrichtigungen')

    const count = await collection.countDocuments({
      empfaengerId,
      gelesen: false,
    })

    return count
  } catch (error) {
    console.error('Error counting unread notifications:', error)
    return 0
  }
}

/**
 * Markiert eine Benachrichtigung als gelesen
 */
export async function markAsRead(
  benachrichtigungId: string
): Promise<{ erfolg: boolean }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Benachrichtigung>('benachrichtigungen')

    const result = await collection.updateOne(
      { _id: new ObjectId(benachrichtigungId) },
      {
        $set: {
          gelesen: true,
          gelesenAm: new Date(),
        },
      }
    )

    return { erfolg: result.modifiedCount > 0 }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { erfolg: false }
  }
}

/**
 * Markiert alle Benachrichtigungen eines Empfängers als gelesen
 */
export async function markAllAsRead(
  empfaengerId: string
): Promise<{ erfolg: boolean; anzahl: number }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Benachrichtigung>('benachrichtigungen')

    const result = await collection.updateMany(
      { empfaengerId, gelesen: false },
      {
        $set: {
          gelesen: true,
          gelesenAm: new Date(),
        },
      }
    )

    return { erfolg: true, anzahl: result.modifiedCount }
  } catch (error) {
    console.error('Error marking all as read:', error)
    return { erfolg: false, anzahl: 0 }
  }
}

/**
 * Löscht eine Benachrichtigung
 */
export async function deleteNotification(
  benachrichtigungId: string
): Promise<{ erfolg: boolean }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Benachrichtigung>('benachrichtigungen')

    const result = await collection.deleteOne({
      _id: new ObjectId(benachrichtigungId),
    })

    return { erfolg: result.deletedCount > 0 }
  } catch (error) {
    console.error('Error deleting notification:', error)
    return { erfolg: false }
  }
}

/**
 * Erstellt Benachrichtigung für Dokument-Upload
 */
export async function notifyDocumentUpload(
  fallId: string,
  fallname: string,
  dokumentName: string,
  gutachterId: string,
  adminId: string = 'admin-1'
): Promise<void> {
  await createNotification({
    empfaengerId: adminId,
    empfaengerRolle: 'admin',
    absenderId: gutachterId,
    absenderRolle: 'gutachter',
    typ: 'dokument_hochgeladen',
    titel: 'Neues Dokument hochgeladen',
    nachricht: `Ein neues Dokument "${dokumentName}" wurde für Fall "${fallname}" hochgeladen.`,
    fallId,
    url: `/dashboard/admin/falldetail/${fallId}`,
    metadata: {
      fallname,
      dokumentName,
    },
  })
}

/**
 * Erstellt Benachrichtigung für Fall-Bearbeitung durch Admin
 */
export async function notifyFallBearbeitet(
  fallId: string,
  fallname: string,
  gutachterId: string,
  adminId: string,
  aenderung: string
): Promise<void> {
  await createNotification({
    empfaengerId: gutachterId,
    empfaengerRolle: 'gutachter',
    absenderId: adminId,
    absenderRolle: 'admin',
    typ: 'fall_bearbeitet',
    titel: 'Fall wurde bearbeitet',
    nachricht: `Der Fall "${fallname}" wurde vom Admin bearbeitet: ${aenderung}`,
    fallId,
    url: `/dashboard/gutachter/falldetail/${fallId}`,
    metadata: {
      fallname,
    },
  })
}

/**
 * Erstellt Benachrichtigung für Status-Änderung
 */
export async function notifyStatusChanged(
  fallId: string,
  fallname: string,
  alterStatus: string,
  neuerStatus: string,
  empfaengerId: string,
  empfaengerRolle: 'admin' | 'gutachter',
  absenderId: string,
  absenderRolle: 'admin' | 'gutachter'
): Promise<void> {
  await createNotification({
    empfaengerId,
    empfaengerRolle,
    absenderId,
    absenderRolle,
    typ: 'status_geaendert',
    titel: 'Fall-Status geändert',
    nachricht: `Der Status des Falls "${fallname}" wurde von "${alterStatus}" zu "${neuerStatus}" geändert.`,
    fallId,
    url: `${empfaengerRolle === 'admin' ? '/dashboard/admin' : '/dashboard/gutachter'}/falldetail/${fallId}`,
    metadata: {
      fallname,
      alterStatus,
      neuerStatus,
    },
  })
}

/**
 * Erstellt Benachrichtigung bei Fall-Erstellung durch Gutachter
 */
export async function notifyFallErstellt(
  fallId: string,
  fallname: string,
  gutachterId: string,
  adminId: string = 'admin-1'
): Promise<void> {
  await createNotification({
    empfaengerId: adminId,
    empfaengerRolle: 'admin',
    absenderId: gutachterId,
    absenderRolle: 'gutachter',
    typ: 'fall_zugewiesen',
    titel: 'Neuer Fall erstellt',
    nachricht: `Ein neuer Fall "${fallname}" wurde vom Gutachter erstellt.`,
    fallId,
    url: `/dashboard/admin/falldetail/${fallId}`,
    metadata: {
      fallname,
    },
  })
}

// KOMMUNIKATION VORÜBERGEHEND DEAKTIVIERT
// Diese Funktion wird später wieder aktiviert

/**
 * Erstellt Benachrichtigung für neue Chat-Nachricht
 */
export async function notifyNewChatMessage(
  fallId: string | undefined,
  fallname: string | undefined,
  senderId: string,
  senderRole: 'admin' | 'gutachter' | 'partner',
  senderName: string,
  recipientId: string,
  recipientRole: 'admin' | 'gutachter' | 'partner',
  messageContent: string,
  chatType: 'fallbezogen' | 'direkt' = 'fallbezogen'
): Promise<void> {
  // Chat-Benachrichtigungen vorübergehend deaktiviert
  console.log('Chat-Benachrichtigung ignoriert (Kommunikation deaktiviert):', {
    fallId,
    senderId,
    recipientId,
    messageContent: messageContent.substring(0, 50) + '...'
  })

  // Nichts tun - Chat ist deaktiviert
  return Promise.resolve()
}

