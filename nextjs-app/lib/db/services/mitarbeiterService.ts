import { getDatabase } from '@/lib/db/client'
import { Mitarbeiter } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export class MitarbeiterService {
  static async getAll(): Promise<Mitarbeiter[]> {
    const db = await getDatabase()
    const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
      .find({})
      .sort({ nachname: 1, vorname: 1 })
      .toArray()
    
    return mitarbeiter
  }

  static async getById(id: string): Promise<Mitarbeiter | null> {
    const db = await getDatabase()
    const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
      .findOne({ _id: new ObjectId(id) })
    
    return mitarbeiter
  }

  static async getAktive(): Promise<Mitarbeiter[]> {
    const db = await getDatabase()
    const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter')
      .find({ aktiv: true })
      .sort({ nachname: 1, vorname: 1 })
      .toArray()
    
    return mitarbeiter
  }

  static async create(data: Omit<Mitarbeiter, '_id' | 'erstelltAm' | 'zuletztGeaendert'>): Promise<string> {
    const db = await getDatabase()
    const result = await db.collection<Mitarbeiter>('mitarbeiter').insertOne({
      ...data,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    } as any)
    
    return result.insertedId.toString()
  }

  static async update(id: string, data: Partial<Mitarbeiter>): Promise<boolean> {
    const db = await getDatabase()
    const { _id, ...updateData } = data as any
    
    const result = await db.collection<Mitarbeiter>('mitarbeiter').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, zuletztGeaendert: new Date() } }
    )
    
    return result.matchedCount > 0
  }

  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase()
    const result = await db.collection<Mitarbeiter>('mitarbeiter').deleteOne({ 
      _id: new ObjectId(id) 
    })
    
    return result.deletedCount > 0
  }
}

