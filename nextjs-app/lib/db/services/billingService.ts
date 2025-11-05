import { getDatabase } from '../client'
import { Abrechnung } from '../types'

// Server-only imports
let ObjectId: any
if (typeof window === 'undefined') {
  ObjectId = require('mongodb').ObjectId
}

export interface BillingFilters {
  fallId?: string
  gutachterId?: string
  status?: string
  faelligVon?: string
  faelligBis?: string
}

export async function getBillings(filters?: BillingFilters): Promise<{ erfolg: boolean; abrechnungen: Abrechnung[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const pipeline = []

    // Match-Stage für Fälle
    if (filters?.fallId) {
      pipeline.push({ $match: { _id: new ObjectId(filters.fallId) } })
    }

    // Unwind Abrechnungen
    pipeline.push({ $unwind: '$abrechnungen' })

    // Filter für Abrechnungen
    const abrechnungFilter: any = {}
    if (filters?.gutachterId) {
      abrechnungFilter['abrechnungen.gutachterId'] = filters.gutachterId
    }
    if (filters?.status) {
      abrechnungFilter['abrechnungen.status'] = filters.status
    }
    if (filters?.faelligVon || filters?.faelligBis) {
      abrechnungFilter['abrechnungen.faelligAm'] = {}
      if (filters.faelligVon) {
        abrechnungFilter['abrechnungen.faelligAm'].$gte = new Date(filters.faelligVon)
      }
      if (filters.faelligBis) {
        abrechnungFilter['abrechnungen.faelligAm'].$lte = new Date(filters.faelligBis)
      }
    }

    if (Object.keys(abrechnungFilter).length > 0) {
      pipeline.push({ $match: abrechnungFilter })
    }

    // Sortierung und Projektion
    pipeline.push(
      { $sort: { 'abrechnungen.faelligAm': -1 } },
      {
        $project: {
          _id: '$abrechnungen._id',
          gutachterId: '$abrechnungen.gutachterId',
          betrag: '$abrechnungen.betrag',
          status: '$abrechnungen.status',
          faelligAm: '$abrechnungen.faelligAm',
          bezahltAm: '$abrechnungen.bezahltAm',
          zahlungsreferenz: '$abrechnungen.zahlungsreferenz',
          fallId: '$_id',
          fallname: '$fallname'
        }
      }
    )

    const abrechnungen = await collection.aggregate(pipeline).toArray()

    return { erfolg: true, abrechnungen: abrechnungen as Abrechnung[] }
  } catch (error) {
    console.error('Error fetching billings:', error)
    return { erfolg: false, abrechnungen: [] }
  }
}

export async function createBilling(fallId: string, abrechnung: Omit<Abrechnung, '_id'>): Promise<{ erfolg: boolean; abrechnungId?: string }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const result = await collection.updateOne(
      { _id: new ObjectId(fallId) },
      {
        $push: {
          abrechnungen: {
            _id: new ObjectId(),
            ...abrechnung
          }
        },
        $set: { zuletztGeaendert: new Date() }
      }
    )

    if (result.modifiedCount === 0) {
      return { erfolg: false }
    }

    return { erfolg: true, abrechnungId: 'new' }
  } catch (error) {
    console.error('Error creating billing:', error)
    return { erfolg: false }
  }
}

export async function updateBilling(fallId: string, abrechnungId: string, updates: Partial<Abrechnung>): Promise<{ erfolg: boolean }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const result = await collection.updateOne(
      {
        _id: new ObjectId(fallId),
        'abrechnungen._id': new ObjectId(abrechnungId)
      },
      {
        $set: {
          'abrechnungen.$.betrag': updates.betrag,
          'abrechnungen.$.status': updates.status,
          'abrechnungen.$.faelligAm': updates.faelligAm,
          'abrechnungen.$.bezahltAm': updates.bezahltAm,
          'abrechnungen.$.zahlungsreferenz': updates.zahlungsreferenz,
          zuletztGeaendert: new Date()
        }
      }
    )

    return { erfolg: result.modifiedCount > 0 }
  } catch (error) {
    console.error('Error updating billing:', error)
    return { erfolg: false }
  }
}

export async function deleteBilling(fallId: string, abrechnungId: string): Promise<{ erfolg: boolean }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const result = await collection.updateOne(
      { _id: new ObjectId(fallId) },
      {
        $pull: {
          abrechnungen: { _id: new ObjectId(abrechnungId) }
        },
        $set: { zuletztGeaendert: new Date() }
      }
    )

    return { erfolg: result.modifiedCount > 0 }
  } catch (error) {
    console.error('Error deleting billing:', error)
    return { erfolg: false }
  }
}

// Dashboard-spezifische Queries für Abrechnungen
export async function getBillingStats(gutachterId?: string): Promise<{
  erfolg: boolean;
  stats?: {
    offen: number;
    bezahlt: number;
    ueberfaellig: number;
    gesamtbetragOffen: number;
    gesamtbetragBezahlt: number;
  }
}> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const pipeline = []

    // Match-Stage für Fälle
    if (gutachterId) {
      pipeline.push({ $match: { zugewiesenAn: gutachterId } })
    }

    pipeline.push(
      { $unwind: '$abrechnungen' },
      {
        $group: {
          _id: null,
          offen: {
            $sum: {
              $cond: [
                { $eq: ['$abrechnungen.status', 'offen'] },
                '$abrechnungen.betrag',
                0
              ]
            }
          },
          bezahlt: {
            $sum: {
              $cond: [
                { $eq: ['$abrechnungen.status', 'bezahlt'] },
                '$abrechnungen.betrag',
                0
              ]
            }
          },
          ueberfaellig: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$abrechnungen.status', 'offen'] },
                    { $lt: ['$abrechnungen.faelligAm', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          countOffen: {
            $sum: {
              $cond: [
                { $eq: ['$abrechnungen.status', 'offen'] },
                1,
                0
              ]
            }
          },
          countBezahlt: {
            $sum: {
              $cond: [
                { $eq: ['$abrechnungen.status', 'bezahlt'] },
                1,
                0
              ]
            }
          }
        }
      }
    )

    const result = await collection.aggregate(pipeline).toArray()

    if (result.length === 0) {
      return {
        erfolg: true,
        stats: {
          offen: 0,
          bezahlt: 0,
          ueberfaellig: 0,
          gesamtbetragOffen: 0,
          gesamtbetragBezahlt: 0
        }
      }
    }

    const stats = result[0]

    return {
      erfolg: true,
      stats: {
        offen: stats.countOffen,
        bezahlt: stats.countBezahlt,
        ueberfaellig: stats.ueberfaellig,
        gesamtbetragOffen: stats.offen,
        gesamtbetragBezahlt: stats.bezahlt
      }
    }
  } catch (error) {
    console.error('Error fetching billing stats:', error)
    return { erfolg: false }
  }
}
