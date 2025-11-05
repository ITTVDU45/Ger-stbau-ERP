import { getDatabase } from '@/lib/db/client'
import { Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export class ProjektService {
  static async getAll(): Promise<Projekt[]> {
    const db = await getDatabase()
    return await db.collection<Projekt>('projekte').find({}).sort({ beginn: -1 }).toArray()
  }

  static async getById(id: string): Promise<Projekt | null> {
    const db = await getDatabase()
    return await db.collection<Projekt>('projekte').findOne({ _id: new ObjectId(id) })
  }

  static async getAktive(): Promise<Projekt[]> {
    const db = await getDatabase()
    return await db.collection<Projekt>('projekte').find({ status: 'aktiv' }).toArray()
  }

  static async create(data: Omit<Projekt, '_id' | 'erstelltAm' | 'zuletztGeaendert'>): Promise<string> {
    const db = await getDatabase()
    const result = await db.collection<Projekt>('projekte').insertOne({
      ...data,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    } as any)
    
    return result.insertedId.toString()
  }

  static async update(id: string, data: Partial<Projekt>): Promise<boolean> {
    const db = await getDatabase()
    const { _id, ...updateData } = data as any
    const result = await db.collection<Projekt>('projekte').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, zuletztGeaendert: new Date() } }
    )
    return result.matchedCount > 0
  }

  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase()
    const result = await db.collection<Projekt>('projekte').deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  }
}

