import { getDatabase } from '../client'
import { Aufgabe } from '../types'

// Server-only imports
let ObjectId: any
if (typeof window === 'undefined') {
  ObjectId = require('mongodb').ObjectId
}

export interface TaskFilters {
  fallId?: string
  status?: string
  prioritaet?: string
  zugewiesenAn?: string
  faelligVon?: string
  faelligBis?: string
}

export async function getTasks(filters?: TaskFilters): Promise<{ erfolg: boolean; aufgaben: Aufgabe[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const pipeline = []

    // Match-Stage für Fälle
    const matchStage: any = {}
    if (filters?.fallId) {
      matchStage._id = new ObjectId(filters.fallId)
    }
    if (filters?.zugewiesenAn) {
      matchStage.zugewiesenAn = filters.zugewiesenAn
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage })
    }

    // Unwind Aufgaben
    pipeline.push({ $unwind: '$aufgaben' })

    // Filter für Aufgaben
    const aufgabenFilter: any = {}
    if (filters?.status) {
      aufgabenFilter['aufgaben.status'] = filters.status
    }
    if (filters?.prioritaet) {
      aufgabenFilter['aufgaben.prioritaet'] = filters.prioritaet
    }
    if (filters?.faelligVon || filters?.faelligBis) {
      aufgabenFilter['aufgaben.faelligAm'] = {}
      if (filters.faelligVon) {
        aufgabenFilter['aufgaben.faelligAm'].$gte = new Date(filters.faelligVon)
      }
      if (filters.faelligBis) {
        aufgabenFilter['aufgaben.faelligAm'].$lte = new Date(filters.faelligBis)
      }
    }

    if (Object.keys(aufgabenFilter).length > 0) {
      pipeline.push({ $match: aufgabenFilter })
    }

    // Sortierung und Projektion
    pipeline.push(
      { $sort: { 'aufgaben.faelligAm': 1 } },
      {
        $project: {
          _id: '$aufgaben._id',
          titel: '$aufgaben.titel',
          prioritaet: '$aufgaben.prioritaet',
          faelligAm: '$aufgaben.faelligAm',
          status: '$aufgaben.status',
          erstelltAm: '$aufgaben.erstelltAm',
          zugewiesenAn: '$aufgaben.zugewiesenAn',
          beschreibung: '$aufgaben.beschreibung',
          fallId: '$_id',
          fallname: '$fallname'
        }
      }
    )

    const aufgaben = await collection.aggregate(pipeline).toArray()

    return { erfolg: true, aufgaben: aufgaben as Aufgabe[] }
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return { erfolg: false, aufgaben: [] }
  }
}

export async function createTask(fallId: string, aufgabe: Omit<Aufgabe, '_id'>): Promise<{ erfolg: boolean; aufgabeId?: string }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const result = await collection.updateOne(
      { _id: new ObjectId(fallId) },
      {
        $push: {
          aufgaben: {
            _id: new ObjectId(),
            ...aufgabe
          }
        },
        $set: { zuletztGeaendert: new Date() }
      }
    )

    if (result.modifiedCount === 0) {
      return { erfolg: false }
    }

    return { erfolg: true, aufgabeId: 'new' }
  } catch (error) {
    console.error('Error creating task:', error)
    return { erfolg: false }
  }
}

export async function updateTask(fallId: string, aufgabeId: string, updates: Partial<Aufgabe>): Promise<{ erfolg: boolean }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const result = await collection.updateOne(
      {
        _id: new ObjectId(fallId),
        'aufgaben._id': new ObjectId(aufgabeId)
      },
      {
        $set: {
          'aufgaben.$.titel': updates.titel,
          'aufgaben.$.prioritaet': updates.prioritaet,
          'aufgaben.$.faelligAm': updates.faelligAm,
          'aufgaben.$.status': updates.status,
          'aufgaben.$.beschreibung': updates.beschreibung,
          'aufgaben.$.zugewiesenAn': updates.zugewiesenAn,
          zuletztGeaendert: new Date()
        }
      }
    )

    return { erfolg: result.modifiedCount > 0 }
  } catch (error) {
    console.error('Error updating task:', error)
    return { erfolg: false }
  }
}

export async function deleteTask(fallId: string, aufgabeId: string): Promise<{ erfolg: boolean }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const result = await collection.updateOne(
      { _id: new ObjectId(fallId) },
      {
        $pull: {
          aufgaben: { _id: new ObjectId(aufgabeId) }
        },
        $set: { zuletztGeaendert: new Date() }
      }
    )

    return { erfolg: result.modifiedCount > 0 }
  } catch (error) {
    console.error('Error deleting task:', error)
    return { erfolg: false }
  }
}
