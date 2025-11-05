import { getDatabase } from '../client'
import { Dokument, Fall } from '../types'
import { notifyDocumentUpload } from './notificationService'

// Server-only imports
let ObjectId: any
if (typeof window === 'undefined') {
  ObjectId = require('mongodb').ObjectId
}

export interface DocumentFilters {
  fallId?: string
  kategorie?: string
  hochgeladenVon?: string
  hochgeladenBis?: string
}

export async function getDocuments(filters?: DocumentFilters): Promise<{ erfolg: boolean; dokumente: Dokument[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const pipeline = []

    // Match-Stage für Fälle
    if (filters?.fallId) {
      pipeline.push({ $match: { _id: new ObjectId(filters.fallId) } })
    }

    // Unwind Dokumente
    pipeline.push({ $unwind: '$dokumente' })

    // Filter für Dokumente
    const dokumentFilter: any = {}
    if (filters?.kategorie) {
      dokumentFilter['dokumente.kategorie'] = filters.kategorie
    }
    if (filters?.hochgeladenVon) {
      dokumentFilter['dokumente.hochgeladenVon'] = filters.hochgeladenVon
    }
    if (filters?.hochgeladenVon || filters?.hochgeladenBis) {
      dokumentFilter['dokumente.hochgeladenAm'] = {}
      if (filters.hochgeladenVon) {
        dokumentFilter['dokumente.hochgeladenAm'].$gte = new Date(filters.hochgeladenVon)
      }
      if (filters.hochgeladenBis) {
        dokumentFilter['dokumente.hochgeladenAm'].$lte = new Date(filters.hochgeladenBis)
      }
    }

    if (Object.keys(dokumentFilter).length > 0) {
      pipeline.push({ $match: dokumentFilter })
    }

    // Sortierung und Projektion
    pipeline.push(
      { $sort: { 'dokumente.hochgeladenAm': -1 } },
      {
        $project: {
          _id: '$dokumente._id',
          dateiname: '$dokumente.dateiname',
          dateipfad: '$dokumente.dateipfad',
          dateigroesse: '$dokumente.dateigroesse',
          mimetype: '$dokumente.mimetype',
          hochgeladenVon: '$dokumente.hochgeladenVon',
          hochgeladenAm: '$dokumente.hochgeladenAm',
          kategorie: '$dokumente.kategorie',
          fallId: '$_id',
          fallname: '$fallname'
        }
      }
    )

    const dokumente = await collection.aggregate(pipeline).toArray()

    return { erfolg: true, dokumente: dokumente as Dokument[] }
  } catch (error) {
    console.error('Error fetching documents:', error)
    return { erfolg: false, dokumente: [] }
  }
}

export async function createDocument(
  fallId: string,
  dokument: Omit<Dokument, '_id'>,
  uploadedBy?: string,
  uploaderRole?: 'admin' | 'gutachter'
): Promise<{ erfolg: boolean; dokumentId?: string }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Fall>('faelle')

    // Hole Fall-Daten für Benachrichtigung
    const fall = await collection.findOne({ _id: new ObjectId(fallId) })
    if (!fall) {
      return { erfolg: false }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(fallId) },
      {
        $push: {
          dokumente: {
            _id: new ObjectId(),
            ...dokument
          }
        },
        $set: { zuletztGeaendert: new Date() }
      }
    )

    if (result.modifiedCount === 0) {
      return { erfolg: false }
    }

    // ✅ Benachrichtigung erstellen
    // Wenn ein Gutachter ein Dokument hochlädt → Admin benachrichtigen
    if (uploaderRole === 'gutachter' && uploadedBy && fall.zugewiesenAn) {
      await notifyDocumentUpload(
        fallId,
        fall.fallname,
        dokument.dateiname,
        uploadedBy,
        'admin-1' // TODO: Echten Admin-User aus DB holen
      )
    }

    return { erfolg: true, dokumentId: 'new' }
  } catch (error) {
    console.error('Error creating document:', error)
    return { erfolg: false }
  }
}

export async function deleteDocument(fallId: string, dokumentId: string): Promise<{ erfolg: boolean }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const result = await collection.updateOne(
      { _id: new ObjectId(fallId) },
      {
        $pull: {
          dokumente: { _id: new ObjectId(dokumentId) }
        },
        $set: { zuletztGeaendert: new Date() }
      }
    )

    return { erfolg: result.modifiedCount > 0 }
  } catch (error) {
    console.error('Error deleting document:', error)
    return { erfolg: false }
  }
}

export async function getDocumentById(fallId: string, dokumentId: string): Promise<{ erfolg: boolean; dokument?: Dokument }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const fall = await collection.findOne(
      {
        _id: new ObjectId(fallId),
        'dokumente._id': new ObjectId(dokumentId)
      },
      {
        projection: {
          dokumente: {
            $elemMatch: { _id: new ObjectId(dokumentId) }
          }
        }
      }
    )

    if (!fall || !fall.dokumente || fall.dokumente.length === 0) {
      return { erfolg: false }
    }

    return { erfolg: true, dokument: fall.dokumente[0] as Dokument }
  } catch (error) {
    console.error('Error fetching document by ID:', error)
    return { erfolg: false }
  }
}

// Dashboard-spezifische Queries für Dokumente
export async function getRecentDocuments(limit: number = 10): Promise<{ erfolg: boolean; dokumente: any[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const pipeline = [
      { $unwind: '$dokumente' },
      {
        $project: {
          _id: '$dokumente._id',
          dateiname: '$dokumente.dateiname',
          hochgeladenAm: '$dokumente.hochgeladenAm',
          kategorie: '$dokumente.kategorie',
          dateigroesse: '$dokumente.dateigroesse',
          fallId: '$_id',
          fallname: '$fallname'
        }
      },
      { $sort: { hochgeladenAm: -1 } },
      { $limit: limit }
    ]

    const dokumente = await collection.aggregate(pipeline).toArray()

    return { erfolg: true, dokumente }
  } catch (error) {
    console.error('Error fetching recent documents:', error)
    return { erfolg: false, dokumente: [] }
  }
}
